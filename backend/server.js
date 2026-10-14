require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || localOrigin.test(origin) || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS_BLOCKED'));
    },
  })
);

const limiter = (windowMs, limit, message, extra = {}) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { message }, ...extra });

app.use('/api/auth/login', limiter(15 * 60 * 1000, 10, 'Too many login attempts. Please try again in 15 minutes.', { skipSuccessfulRequests: true }));
app.use('/api/auth/register', limiter(60 * 60 * 1000, 20, 'Too many accounts were created from this device. Please try again later.'));
const apiLimiter = limiter(15 * 60 * 1000, 1500, 'Too many requests. Please slow down and try again shortly.');
app.use('/api', (req, res, next) => (req.path === '/events' ? next() : apiLimiter(req, res, next)));

app.use(express.json({ limit: '8mb' }));

const hasOperatorKey = (value, depth = 0) => {
  if (!value || typeof value !== 'object' || depth > 6) return false;
  return Object.keys(value).some((k) => k.startsWith('$') || k.includes('.') || hasOperatorKey(value[k], depth + 1));
};

app.use((req, res, next) => {
  if (hasOperatorKey(req.body) || hasOperatorKey(req.query)) {
    return res.status(400).json({ message: 'Invalid request.' });
  }
  next();
});

const sseClients = new Set();

const emit = (type, data = {}) => {
  const msg = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  for (const client of sseClients) client.write(msg);
};

app.get('/api/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  sseClients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(ping);
    sseClients.delete(res);
  });
});

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', required: true },
    photo: { type: String, default: '' },
    phone: { type: String, default: '' },
    active: { type: Boolean, default: true },
    status: { type: String, enum: ['Active', 'Deactivated'], default: 'Active' },
    deactivatedAt: { type: Date, default: null },
    deactivatedUntil: { type: Date, default: null },
    deactivationReason: { type: String, default: '' },
    deactivationDuration: { type: String, default: '' },
  },
  { timestamps: true }
);
const Account = mongoose.model('Account', accountSchema, 'accounts');

const actionLogSchema = new mongoose.Schema(
  {
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    admin_name: String,
    admin_email: String,
    summary: String,
    action: { type: String, required: true },
    target_id: mongoose.Schema.Types.ObjectId,
    target_name: String,
    target_email: String,
    target_role: String,
    reason: { type: String, default: '' },
    details: { type: Object, default: {} },
  },
  { timestamps: true }
);
const ActionLog = mongoose.model('ActionLog', actionLogSchema, 'action_logs');

const newsletterSubscriberSchema = new mongoose.Schema(
  { email: { type: String, required: true, unique: true, lowercase: true, trim: true } },
  { timestamps: true }
);
const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema, 'newsletter_subscribers');

const isLocked = (acc) =>
  acc.active === false && (!acc.deactivatedUntil || acc.deactivatedUntil.getTime() > Date.now());

const sweepExpired = () =>
  Account.updateMany(
    { active: false, deactivatedUntil: { $ne: null, $lte: new Date() } },
    { $set: { active: true, status: 'Active', deactivatedAt: null, deactivatedUntil: null, deactivationReason: '', deactivationDuration: '' } }
  );

const longDate = (d) =>
  d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const signToken = (acc) =>
  jwt.sign({ id: acc._id, role: acc.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const publicUser = (acc) => ({
  id: acc._id,
  name: acc.name,
  email: acc.email,
  phone: acc.phone || '',
  role: acc.role,
  photo: acc.photo || '',
});

const PHONE_RE = /^(09\d{9}|\+639\d{9})$/;

const validName = (name) =>
  typeof name === 'string' &&
  /^[\p{L}][\p{L}\s.'-]*$/u.test(name.trim()) &&
  (name.match(/\p{L}/gu) || []).length > 2;

const NAME_ERROR = 'Name must be more than 2 letters and use letters only.';
const PHONE_ERROR = 'Use 11 digits starting with 09 (09XXXXXXXXX) or +63 then 10 digits (+639XXXXXXXXX).';

const validPassword = (pw) =>
  typeof pw === 'string' && pw.length >= 8 && pw.length <= 20 &&
  /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);

app.get('/', (req, res) => res.send('Backend is running!'));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Fill in all the fields.' });
    }
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Fill in all the fields.' });
    }
    if (!validName(name)) return res.status(400).json({ message: NAME_ERROR });
    if (!validPassword(password)) {
      return res.status(400).json({ message: "Your password doesn't meet all the requirements." });
    }
    const normalized = email.trim().toLowerCase();
    if (await Account.findOne({ email: normalized })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const acc = await Account.create({
      name: name.trim(),
      email: normalized,
      password: await bcrypt.hash(password, 10),
      role: 'customer',
    });
    res.status(201).json({ token: signToken(acc), user: publicUser(acc) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, admin } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Enter your email and password.' });
    }
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Enter your email and password.' });
    }
    const acc = await Account.findOne({ email: email.trim().toLowerCase() });
    const ok = acc && (await bcrypt.compare(password, acc.password));
    if (!ok || (admin && acc.role !== 'admin')) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }
    if (isLocked(acc)) {
      const duration = acc.deactivationDuration || '';
      const until = acc.deactivatedUntil ? ` (until ${longDate(acc.deactivatedUntil)})` : '';
      const reason = acc.deactivationReason ? ` Reason: ${acc.deactivationReason}.` : '';
      const contact = process.env.SUPPORT_EMAIL
        ? `Please contact our support team at ${process.env.SUPPORT_EMAIL} if you think this is a mistake.`
        : 'Please contact our support team if you think this is a mistake.';
      return res.status(403).json({
        message: `This account has been deactivated by the admin${duration ? ` for ${duration}` : ''}${until}.${reason} ${contact}`,
      });
    }
    res.json({ token: signToken(acc), user: publicUser(acc) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

const addressSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    regionCode: String,
    region: { type: String, required: true },
    provinceCode: String,
    province: { type: String, required: true },
    cityCode: String,
    city: { type: String, required: true },
    barangayCode: String,
    barangay: { type: String, required: true },
    zip: { type: String, required: true },
    street: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const Address = mongoose.model('Address', addressSchema, 'customer_address');

const publicAddress = (a) => ({
  id: a._id,
  name: a.name,
  phone: a.phone,
  regionCode: a.regionCode,
  region: a.region,
  provinceCode: a.provinceCode,
  province: a.province,
  cityCode: a.cityCode,
  city: a.city,
  barangayCode: a.barangayCode,
  barangay: a.barangay,
  zip: a.zip,
  street: a.street,
  isDefault: a.isDefault,
});

const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const acc = await Account.findById(payload.id, 'active role deactivatedUntil');
    if (!acc || isLocked(acc)) throw new Error('inactive');
    req.auth = { id: payload.id, role: acc.role };
    next();
  } catch {
    res.status(401).json({ message: 'Please sign in again.' });
  }
};

const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
};

app.post('/api/newsletter', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    const existing = await NewsletterSubscriber.exists({ email });
    if (existing) return res.json({ message: 'This email is already subscribed.' });
    await NewsletterSubscriber.create({ email });
    res.status(201).json({ message: 'Your email was added to the ELLE Journal updates list.' });
  } catch (err) {
    if (err.code === 11000) return res.json({ message: 'This email is already subscribed.' });
    serverError(res, err);
  }
});

const addressFields = [
  'name', 'phone', 'regionCode', 'region', 'provinceCode', 'province',
  'cityCode', 'city', 'barangayCode', 'barangay', 'zip', 'street',
];

const cleanAddress = (body = {}) => {
  const data = {};
  for (const k of addressFields) data[k] = typeof body[k] === 'string' ? body[k].trim() : '';
  const required = ['name', 'phone', 'region', 'province', 'city', 'barangay', 'zip', 'street'];
  if (!required.every((k) => data[k])) return { error: 'Fill in all the fields.' };
  if (!/^\d{4}$/.test(data.zip)) return { error: 'ZIP code must be 4 digits.' };
  if (!validName(data.name)) return { error: NAME_ERROR };
  if (!PHONE_RE.test(data.phone)) return { error: PHONE_ERROR };
  return { data };
};

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const acc = await Account.findById(req.auth.id);
    if (!acc) return res.status(401).json({ message: 'Please sign in again.' });
    res.json({ user: publicUser(acc) });
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/account/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Fill in all the fields.' });
    }
    if (!validPassword(newPassword)) {
      return res.status(400).json({ message: "Your new password doesn't meet all the requirements." });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from the current one.' });
    }
    const acc = await Account.findById(req.auth.id);
    if (!acc) return res.status(401).json({ message: 'Please sign in again.' });
    if (!(await bcrypt.compare(currentPassword, acc.password))) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    acc.password = await bcrypt.hash(newPassword, 10);
    await acc.save();
    if (acc.role === 'admin') await recordAction(req, 'change_password', 'Changed their password');
    res.json({ message: 'Password updated.' });
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/account/profile', requireAuth, async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 120) : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim().replace(/[\s-]/g, '') : '';
    if (!name || !email) return res.status(400).json({ message: 'Fill in your name and email.' });
    if (!validName(name)) return res.status(400).json({ message: NAME_ERROR });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (phone && !PHONE_RE.test(phone)) return res.status(400).json({ message: PHONE_ERROR });
    if (await Account.exists({ email, _id: { $ne: req.auth.id } })) {
      return res.status(409).json({ message: 'Another account already uses this email.' });
    }
    const acc = await Account.findByIdAndUpdate(req.auth.id, { name, email, phone }, { new: true });
    if (acc.role === 'admin') await recordAction(req, 'update_profile', 'Updated their account settings');
    emit('users', { id: String(acc._id) });
    res.json({ user: publicUser(acc) });
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/account/photo', requireAuth, async (req, res) => {
  try {
    const { photo } = req.body || {};
    if (typeof photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(photo) || photo.length > 1_500_000) {
      return res.status(400).json({ message: 'Choose a valid image (JPG, PNG or WEBP).' });
    }
    const acc = await Account.findByIdAndUpdate(req.auth.id, { photo }, { new: true });
    res.json({ user: publicUser(acc) });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/account/photo', requireAuth, async (req, res) => {
  try {
    const acc = await Account.findByIdAndUpdate(req.auth.id, { photo: '' }, { new: true });
    res.json({ user: publicUser(acc) });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/addresses', requireAuth, async (req, res) => {
  try {
    const list = await Address.find({ customer_id: req.auth.id }).sort({ createdAt: 1 });
    res.json({ addresses: list.map(publicAddress) });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/addresses', requireAuth, async (req, res) => {
  try {
    const { data, error } = cleanAddress(req.body);
    if (error) return res.status(400).json({ message: error });
    const count = await Address.countDocuments({ customer_id: req.auth.id });
    const isDefault = count === 0 || !!req.body.isDefault;
    if (isDefault) await Address.updateMany({ customer_id: req.auth.id }, { isDefault: false });
    const addr = await Address.create({ ...data, customer_id: req.auth.id, isDefault });
    res.status(201).json({ address: publicAddress(addr) });
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/addresses/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Address not found.' });
    const { data, error } = cleanAddress(req.body);
    if (error) return res.status(400).json({ message: error });
    const addr = await Address.findOne({ _id: req.params.id, customer_id: req.auth.id });
    if (!addr) return res.status(404).json({ message: 'Address not found.' });
    if (req.body.isDefault && !addr.isDefault) {
      await Address.updateMany({ customer_id: req.auth.id }, { isDefault: false });
      addr.isDefault = true;
    }
    Object.assign(addr, data);
    await addr.save();
    res.json({ address: publicAddress(addr) });
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/addresses/:id/default', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Address not found.' });
    const addr = await Address.findOne({ _id: req.params.id, customer_id: req.auth.id });
    if (!addr) return res.status(404).json({ message: 'Address not found.' });
    await Address.updateMany({ customer_id: req.auth.id }, { isDefault: false });
    addr.isDefault = true;
    await addr.save();
    res.json({ address: publicAddress(addr) });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/addresses/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Address not found.' });
    const addr = await Address.findOneAndDelete({ _id: req.params.id, customer_id: req.auth.id });
    if (!addr) return res.status(404).json({ message: 'Address not found.' });
    if (addr.isDefault) {
      const next = await Address.findOne({ customer_id: req.auth.id }).sort({ createdAt: 1 });
      if (next) await Address.updateOne({ _id: next._id }, { isDefault: true });
    }
    res.json({ message: 'Deleted.' });
  } catch (err) {
    serverError(res, err);
  }
});

const cartSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    product_id: { type: Number, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    imagePosition: { type: String, default: '50% 50%' },
    category: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1, max: 99 },
  },
  { timestamps: true }
);
cartSchema.index({ customer_id: 1, product_id: 1 }, { unique: true });
const CartItem = mongoose.model('CartItem', cartSchema, 'cart');

const orderSchema = new mongoose.Schema(
  {
    order_id: { type: String, required: true, unique: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    address_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
    items: [
      {
        _id: false,
        product_id: Number,
        name: String,
        price: Number,
        image: String,
        quantity: Number,
      },
    ],
    shipping: {
      name: String,
      phone: String,
      region: String,
      province: String,
      city: String,
      barangay: String,
      zip: String,
      street: String,
    },
    shippingFee: { type: Number, default: 0 },
    shippingFeeOriginal: { type: Number, default: 0 },
    shippingPromo: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
    adminSeen: { type: Boolean, default: false },
    customerSeenStatus: { type: String, default: '' },
    total: { type: Number, required: true },
    paymentMethod: { type: String, default: 'cod' },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Out for Delivery', 'Delivered', 'To Review', 'Completed', 'Cancelled'],
      default: 'Pending',
      required: true,
    },
  },
  { timestamps: true }
);
const Order = mongoose.model('Order', orderSchema, 'orders');

const publicCartItem = (c, extra = {}) => ({
  ...extra,
  id: c.product_id,
  name: c.name,
  price: c.price,
  image: c.image,
  imagePosition: c.imagePosition,
  category: c.category,
  quantity: c.quantity,
});

const publicOrder = (o) => ({
  id: o.order_id,
  date: o.createdAt,
  status: o.status,
  total: o.total,
  address_id: o.address_id,
  items: o.items.map((i) => ({
    id: i.product_id,
    name: i.name,
    price: i.price,
    image: i.image,
    quantity: i.quantity,
  })),
  shipping: o.shipping,
  shippingFee: o.shippingFee || 0,
  shippingFeeOriginal: o.shippingFeeOriginal || 0,
  shippingPromo: o.shippingPromo || '',
  customerSeenStatus: o.customerSeenStatus || '',
  cancelReason: o.cancelReason || '',
});

const cleanProduct = async (b = {}) => {
  const product_id = Number(b.id ?? b.product_id);
  if (!Number.isInteger(product_id)) return null;
  const p = await Product.findOne({ product_id, status: 'Active', archived: { $ne: true } });
  if (!p) return null;
  const percent = (await activeDiscountMap()).get(product_id) || 0;
  return {
    product_id,
    name: p.name,
    price: effectivePrice(p.price, percent),
    image: p.image,
    imagePosition: p.image_position || '50% 50%',
    category: p.type,
    stock: p.stock || 0,
  };
};

const clampQty = (n) => Math.min(99, Math.max(1, Math.floor(Number(n) || 1)));

const cartResponse = async (customerId) => {
  const items = await CartItem.find({ customer_id: customerId }).sort({ createdAt: 1 });
  const [prods, discounts] = await Promise.all([
    Product.find({ product_id: { $in: items.map((i) => i.product_id) }, status: 'Active', archived: { $ne: true } }),
    activeDiscountMap(),
  ]);
  const byId = new Map(prods.map((p) => [p.product_id, p]));
  const out = [];
  for (const c of items) {
    const p = byId.get(c.product_id);
    if (!p) {
      await c.deleteOne();
      continue;
    }
    const percent = discounts.get(c.product_id) || 0;
    const price = effectivePrice(p.price, percent);
    if (c.price !== price) {
      c.price = price;
      await c.save();
    }
    out.push(publicCartItem(c, { originalPrice: p.price, discountPercent: percent, stock: p.stock || 0 }));
  }
  return out;
};

app.get('/api/cart', requireAuth, async (req, res) => {
  try {
    res.json({ cart: await cartResponse(req.auth.id) });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/cart', requireAuth, async (req, res) => {
  try {
    const product = await cleanProduct(req.body);
    if (!product) return res.status(400).json({ message: 'This product is unavailable.' });
    const existing = await CartItem.findOne({ customer_id: req.auth.id, product_id: product.product_id });
    const addQty = clampQty(req.body?.quantity);
    if (product.stock < (existing ? existing.quantity : 0) + addQty) {
      return res.status(409).json({
        message: product.stock === 0 ? `${product.name} is out of stock.` : `Only ${product.stock} left in stock.`,
      });
    }
    delete product.stock;
    if (existing) {
      existing.quantity = clampQty(existing.quantity + addQty);
      await existing.save();
      return res.json({ item: publicCartItem(existing) });
    }
    const item = await CartItem.create({ ...product, customer_id: req.auth.id, quantity: addQty });
    res.status(201).json({ item: publicCartItem(item) });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/cart/merge', requireAuth, async (req, res) => {
  try {
    const list = Array.isArray(req.body?.items) ? req.body.items : [];
    for (const raw of list) {
      const product = await cleanProduct(raw);
      if (!product) continue;
      const existing = await CartItem.findOne({ customer_id: req.auth.id, product_id: product.product_id });
      const qty = Math.min(clampQty(raw.quantity) + (existing ? existing.quantity : 0), product.stock, 99);
      const fields = { ...product };
      delete fields.stock;
      if (qty < 1) continue;
      if (existing) {
        existing.quantity = qty;
        await existing.save();
      } else {
        await CartItem.create({ ...fields, customer_id: req.auth.id, quantity: qty });
      }
    }
    res.json({ cart: await cartResponse(req.auth.id) });
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/cart/:productId', requireAuth, async (req, res) => {
  try {
    const quantity = Number(req.body?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ message: 'Quantity must be between 1 and 99.' });
    }
    const prod = await Product.findOne({ product_id: Number(req.params.productId) }, 'stock name');
    if (prod && quantity > (prod.stock || 0)) {
      return res.status(409).json({ message: prod.stock ? `Only ${prod.stock} left in stock.` : `${prod.name} is out of stock.` });
    }
    const item = await CartItem.findOneAndUpdate(
      { customer_id: req.auth.id, product_id: Number(req.params.productId) },
      { quantity },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not in cart.' });
    res.json({ item: publicCartItem(item) });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/cart/:productId', requireAuth, async (req, res) => {
  try {
    await CartItem.deleteOne({ customer_id: req.auth.id, product_id: Number(req.params.productId) });
    res.json({ message: 'Removed.' });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/cart', requireAuth, async (req, res) => {
  try {
    await CartItem.deleteMany({ customer_id: req.auth.id });
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    serverError(res, err);
  }
});

const productSchema = new mongoose.Schema(
  {
    product_id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    type: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    details: { type: String, default: '' },
    materials: { type: String, default: '' },
    image: { type: String, default: '' },
    images: { type: [String], default: [] },
    image_position: { type: String, default: '50% 50%' },
    featured: { type: Boolean, default: false },
    stock: { type: Number, default: 0, min: 0 },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: String, default: '' },
    archiveReason: { type: String, default: '' },
    specifications: {
      length: { type: String, default: '' },
      width: { type: String, default: '' },
      height: { type: String, default: '' },
      depth: { type: String, default: '' },
      material: { type: String, default: '' },
      color: { type: String, default: '' },
      finish: { type: String, default: '' },
    },
    material_details: {
      carpentry: { type: [String], default: [] },
      upholstery: { type: [String], default: [] },
      finishing: { type: [String], default: [] },
    },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', required: true },
  },
  { timestamps: true }
);
const Product = mongoose.model('Product', productSchema, 'products');
const ArchivedProduct = mongoose.model('ArchivedProduct', productSchema.clone(), 'archived_products');

const ratingSchema = new mongoose.Schema(
  {
    product_id: { type: Number, required: true, index: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    reviewer_name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 1000 },
    date: { type: Date, default: Date.now },
    media: {
      type: [{ _id: false, file_id: mongoose.Schema.Types.ObjectId, type: { type: String, enum: ['image', 'video'] } }],
      default: [],
    },
    hidden: { type: Boolean, default: false },
    reply: { type: String, default: '', maxlength: 500 },
    repliedAt: { type: Date, default: null },
    repliedBy: { type: String, default: '' },
  },
  { timestamps: true }
);
const Rating = mongoose.model('Rating', ratingSchema, 'ratings');

const shippingRateSchema = new mongoose.Schema(
  {
    region_code: { type: String, required: true, unique: true },
    region: { type: String, required: true },
    group: { type: String, enum: ['Luzon', 'Visayas', 'Mindanao'], required: true },
    rate: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);
const ShippingRate = mongoose.model('ShippingRate', shippingRateSchema, 'shipping_rates');

const defaultRegions = [
  ['13', 'National Capital Region (NCR)', 'Luzon', 8],
  ['03', 'Region III (Central Luzon)', 'Luzon', 12],
  ['04', 'Region IV-A (CALABARZON)', 'Luzon', 12],
  ['01', 'Region I (Ilocos Region)', 'Luzon', 16],
  ['02', 'Region II (Cagayan Valley)', 'Luzon', 16],
  ['14', 'Cordillera Administrative Region (CAR)', 'Luzon', 16],
  ['17', 'Region IV-B (MIMAROPA)', 'Luzon', 18],
  ['05', 'Region V (Bicol Region)', 'Luzon', 18],
  ['06', 'Region VI (Western Visayas)', 'Visayas', 22],
  ['07', 'Region VII (Central Visayas)', 'Visayas', 22],
  ['08', 'Region VIII (Eastern Visayas)', 'Visayas', 24],
  ['09', 'Region IX (Zamboanga Peninzula)', 'Mindanao', 28],
  ['10', 'Region X (Northern Mindanao)', 'Mindanao', 28],
  ['11', 'Region XI (Davao Region)', 'Mindanao', 28],
  ['12', 'Region XII (SOCCSKSARGEN)', 'Mindanao', 30],
  ['16', 'Region XIII (Caraga)', 'Mindanao', 30],
  ['15', 'Autonomous Region in Muslim Mindanao (ARMM)', 'Mindanao', 32],
];

const ensureShippingRates = async () => {
  for (const [region_code, region, group, rate] of defaultRegions) {
    await ShippingRate.updateOne({ region_code }, { $setOnInsert: { region_code, region, group, rate } }, { upsert: true });
  }
};

const shippingFeeFor = async (address) => {
  const rates = await ShippingRate.find();
  const match =
    rates.find((r) => address.regionCode && r.region_code === address.regionCode) ||
    rates.find((r) => r.region === address.region);
  return match ? match.rate : 0;
};

const publicRate = (r) => ({ region_code: r.region_code, region: r.region, group: r.group, rate: r.rate });

app.get('/api/shipping-rates', async (req, res) => {
  try {
    const order = new Map(defaultRegions.map((r, i) => [r[0], i]));
    const rates = await ShippingRate.find();
    rates.sort((a, b) => (order.get(a.region_code) ?? 99) - (order.get(b.region_code) ?? 99));
    res.json({ rates: rates.map(publicRate) });
  } catch (err) {
    serverError(res, err);
  }
});

const discountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['product', 'shipping'], default: 'product' },
    shipping_mode: { type: String, enum: ['free', 'percent', ''], default: '' },
    min_spend: { type: Number, default: 0, min: 0 },
    percent: { type: Number, required: true, min: 1, max: 100 },
    product_ids: { type: [Number], default: [] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Discount = mongoose.model('Discount', discountSchema, 'discounts');

const discountStatus = (d, now = new Date()) => {
  if (!d.enabled) return 'Disabled';
  if (d.endDate < now) return 'Expired';
  if (d.startDate > now) return 'Scheduled';
  return 'Active';
};

const activeDiscountMap = async () => {
  const now = new Date();
  const list = await Discount.find({ type: { $ne: 'shipping' }, enabled: true, startDate: { $lte: now }, endDate: { $gte: now } });
  const map = new Map();
  for (const d of list) {
    for (const id of d.product_ids) {
      if (!map.has(id) || map.get(id) < d.percent) map.set(id, d.percent);
    }
  }
  return map;
};

const activeShippingPromos = () => {
  const now = new Date();
  return Discount.find({ type: 'shipping', enabled: true, startDate: { $lte: now }, endDate: { $gte: now } });
};

const bestShippingPromo = (promos, subtotal) =>
  promos.filter((p) => subtotal >= (p.min_spend || 0)).sort((a, b) => b.percent - a.percent)[0] || null;

const feeAfterPromo = (rate, promo) => (promo ? Math.round(rate * (100 - promo.percent)) / 100 : rate);

app.get('/api/shipping-promos', async (req, res) => {
  try {
    const promos = await activeShippingPromos();
    res.json({ promos: promos.map((d) => ({ id: d._id, name: d.name, percent: d.percent, minSpend: d.min_spend || 0 })) });
  } catch (err) {
    serverError(res, err);
  }
});

const effectivePrice = (price, percent) => (percent ? Math.round(price * (100 - percent)) / 100 : price);

let discountSignature = '';
const checkDiscountChanges = async () => {
  const [map, promos] = await Promise.all([activeDiscountMap(), activeShippingPromos()]);
  const signature =
    [...map.entries()].sort((a, b) => a[0] - b[0]).map(([id, pct]) => `${id}:${pct}`).join(',') +
    '|' +
    promos.map((d) => `${d._id}:${d.percent}:${d.min_spend}`).sort().join(',');
  if (signature !== discountSignature) {
    const first = discountSignature === '';
    discountSignature = signature || '-';
    if (!first) emit('products');
  }
};

const publicProduct = (p, stats, percent = 0) => ({
  id: p.product_id,
  name: p.name,
  price: effectivePrice(p.price, percent),
  originalPrice: p.price,
  discountPercent: percent,
  stock: p.stock || 0,
  category: p.type,
  description: p.description,
  details: p.details,
  materials: p.materials,
  image: p.image,
  images: p.images && p.images.length ? p.images : [p.image].filter(Boolean),
  imagePosition: p.image_position || '50% 50%',
  featured: !!p.featured,
  status: p.status,
  rating: stats ? Math.round(stats.avg * 10) / 10 : 0,
  reviews: stats ? stats.count : 0,
});

const publicMedia = (media = []) => media.map((m) => ({ id: m.file_id, type: m.type, url: `/api/media/${m.file_id}` }));

const publicReview = (r) => ({
  id: r._id,
  media: publicMedia(r.media),
  name: r.reviewer_name,
  rating: r.rating,
  comment: r.comment,
  date: r.date,
  reply: r.reply || '',
  repliedAt: r.repliedAt,
});

const reviewerName = (name) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
};

app.get('/api/products', async (req, res) => {
  try {
    const [products, stats] = await Promise.all([
      Product.find({ status: 'Active', archived: { $ne: true } }).sort({ product_id: 1 }),
      Rating.aggregate([{ $match: { hidden: { $ne: true } } }, { $group: { _id: '$product_id', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    ]);
    const byId = new Map(stats.map((s) => [s._id, s]));
    const discounts = await activeDiscountMap();
    res.json({ products: products.map((p) => publicProduct(p, byId.get(p.product_id), discounts.get(p.product_id) || 0)) });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const list = await Rating.find({ product_id: Number(req.params.id), hidden: { $ne: true } }).sort({ date: -1 });
    res.json({ reviews: list.map(publicReview) });
  } catch (err) {
    serverError(res, err);
  }
});

const mediaBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'review_media' });

const sniffMedia = (buf) => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: 'image', mime: 'image/jpeg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: 'image', mime: 'image/png' };
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { kind: 'image', mime: 'image/webp' };
  }
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { kind: 'video', mime: 'video/webm' };
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    return { kind: 'video', mime: buf.toString('ascii', 8, 12) === 'qt  ' ? 'video/quicktime' : 'video/mp4' };
  }
  return null;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

app.post(
  '/api/review-media',
  requireAuth,
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'], limit: '21mb' }),
  async (req, res) => {
    try {
      const buf = req.body;
      if (!Buffer.isBuffer(buf) || buf.length === 0) {
        return res.status(400).json({ message: 'Choose a JPG, PNG or WEBP photo, or an MP4, WEBM or MOV video.' });
      }
      const found = sniffMedia(buf);
      if (!found) return res.status(400).json({ message: 'That file type is not supported.' });
      if (found.kind === 'image' && buf.length > MAX_IMAGE_BYTES) {
        return res.status(413).json({ message: 'Photos must be 8 MB or smaller.' });
      }
      if (found.kind === 'video' && buf.length > MAX_VIDEO_BYTES) {
        return res.status(413).json({ message: 'Videos must be 20 MB or smaller.' });
      }
      const upload = mediaBucket().openUploadStream(`review-${Date.now()}`, {
        metadata: { owner: String(req.auth.id), contentType: found.mime, kind: found.kind, attached: false },
      });
      upload.on('error', (err) => serverError(res, err));
      upload.on('finish', () => res.status(201).json({ id: upload.id, type: found.kind }));
      upload.end(buf);
    } catch (err) {
      serverError(res, err);
    }
  }
);

app.get('/api/media/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const file = await mongoose.connection.db.collection('review_media.files').findOne({ _id: fileId, 'metadata.attached': true });
    if (!file) return res.status(404).end();

    const size = file.length;
    res.set({
      'Content-Type': file.metadata.contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    let start = 0;
    let end = size - 1;
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range && (range[1] !== '' || range[2] !== '')) {
      if (range[1] === '') {
        start = Math.max(0, size - Number(range[2]));
      } else {
        start = Number(range[1]);
        if (range[2] !== '') end = Math.min(size - 1, Number(range[2]));
      }
      if (start > end || start >= size) {
        res.set('Content-Range', `bytes */${size}`);
        return res.status(416).end();
      }
      res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${size}` });
    }
    res.set('Content-Length', String(end - start + 1));
    const stream = mediaBucket().openDownloadStream(fileId, { start, end: end + 1 });
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/products/:id/reviews', requireAuth, async (req, res) => {
  try {
    const product_id = Number(req.params.id);
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Please select a star rating.' });
    }
    if (comment.length > 1000) return res.status(400).json({ message: 'Comment is too long.' });
    const bought = await Order.exists({
      customer_id: req.auth.id,
      'items.product_id': product_id,
      status: { $in: ['Completed', 'To Review'] },
    });
    if (!bought) return res.status(403).json({ message: 'You can only review items you have received.' });
    if (await Rating.exists({ product_id, customer_id: req.auth.id })) {
      return res.status(409).json({ message: 'You already reviewed this item.' });
    }
    const mediaIds = Array.isArray(req.body?.mediaIds) ? req.body.mediaIds.slice(0, 5) : [];
    if (mediaIds.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'Invalid photo or video.' });
    }
    const files = await mongoose.connection.db
      .collection('review_media.files')
      .find({ _id: { $in: mediaIds.map((id) => new mongoose.Types.ObjectId(id)) }, 'metadata.owner': String(req.auth.id), 'metadata.attached': false })
      .toArray();
    if (files.length !== new Set(mediaIds.map(String)).size) {
      return res.status(400).json({ message: 'One of your photos or videos could not be used. Please upload it again.' });
    }
    const acc = await Account.findById(req.auth.id);
    const review = await Rating.create({
      product_id,
      customer_id: req.auth.id,
      reviewer_name: reviewerName(acc.name),
      rating,
      comment,
      media: files.map((f) => ({ file_id: f._id, type: f.metadata.kind })),
      date: new Date(),
    });
    if (files.length) {
      await mongoose.connection.db
        .collection('review_media.files')
        .updateMany({ _id: { $in: files.map((f) => f._id) } }, { $set: { 'metadata.attached': true } });
    }
    emit('reviews');
    res.status(201).json({ review: publicReview(review) });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const [orders, mine] = await Promise.all([
      Order.find({ customer_id: req.auth.id }).sort({ createdAt: -1 }),
      Rating.find({ customer_id: req.auth.id }, 'product_id'),
    ]);
    const reviewed = new Set(mine.map((r) => r.product_id));
    res.json({
      orders: orders.map((o) => {
        const out = publicOrder(o);
        out.items = out.items.map((i) => ({ ...i, reviewed: reviewed.has(i.id) }));
        return out;
      }),
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.patch('/api/orders/:orderId/received', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ order_id: req.params.orderId, customer_id: req.auth.id });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.status !== 'Out for Delivery') {
      return res.status(409).json({ message: 'This order is not out for delivery.' });
    }
    order.status = 'Completed';
    order.customerSeenStatus = 'Completed';
    await order.save();
    emit('orders', { customer_id: String(order.customer_id) });
    emit('order:updated', { order_id: order.order_id });
    res.json({ order: publicOrder(order) });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/orders/seen', requireAuth, async (req, res) => {
  try {
    const status = String(req.body?.status || '');
    if (!['Pending', 'Processing', 'Out for Delivery', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    await Order.updateMany({ customer_id: req.auth.id, status }, { customerSeenStatus: status });
    res.json({ message: 'ok' });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const { address_id } = req.body || {};
    if (!mongoose.isValidObjectId(address_id)) {
      return res.status(400).json({ message: 'Choose a shipping address.' });
    }
    const address = await Address.findOne({ _id: address_id, customer_id: req.auth.id });
    if (!address) return res.status(400).json({ message: 'Choose a shipping address.' });
    const cart = await CartItem.find({ customer_id: req.auth.id }).sort({ createdAt: 1 });
    if (cart.length === 0) return res.status(400).json({ message: 'Your cart is empty.' });

    const [prods, discounts] = await Promise.all([
      Product.find({ product_id: { $in: cart.map((c) => c.product_id) }, status: 'Active', archived: { $ne: true } }),
      activeDiscountMap(),
    ]);
    const byId = new Map(prods.map((p) => [p.product_id, p]));
    const baseRate = await shippingFeeFor(address);
    const shippingPromos = await activeShippingPromos();
    const reserved = [];
    const rollback = () =>
      Promise.all(reserved.map((c) => Product.updateOne({ product_id: c.product_id }, { $inc: { stock: c.quantity } })));
    for (const c of cart) {
      const p = byId.get(c.product_id);
      if (!p) {
        await rollback();
        return res.status(409).json({ message: `${c.name} is no longer available. Remove it from your cart.` });
      }
      const r = await Product.updateOne({ product_id: c.product_id, stock: { $gte: c.quantity } }, { $inc: { stock: -c.quantity } });
      if (r.modifiedCount === 0) {
        await rollback();
        const left = p.stock || 0;
        return res.status(409).json({
          message: left === 0 ? `${p.name} is out of stock.` : `Sorry, ${p.name} only has ${left} left.`,
        });
      }
      reserved.push(c);
    }

    let order;
    try {
      const counter = await mongoose.connection
        .collection('counters')
        .findOneAndUpdate({ _id: 'orders' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
      const seq = (counter.value ?? counter).seq;
      const items = cart.map((c) => {
        const p = byId.get(c.product_id);
        return {
          product_id: c.product_id,
          name: p.name,
          price: effectivePrice(p.price, discounts.get(c.product_id) || 0),
          image: p.image,
          quantity: c.quantity,
        };
      });
      const merchandise = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const promo = bestShippingPromo(shippingPromos, merchandise);
      const shippingFee = feeAfterPromo(baseRate, promo);
      order = await Order.create({
        order_id: `COD-${String(seq).padStart(6, '0')}`,
        customer_id: req.auth.id,
        address_id: address._id,
        items,
        shipping: {
          name: address.name,
          phone: address.phone,
          region: address.region,
          province: address.province,
          city: address.city,
          barangay: address.barangay,
          zip: address.zip,
          street: address.street,
        },
        shippingFee,
        shippingFeeOriginal: baseRate,
        shippingPromo: promo && baseRate > 0 ? promo.name : '',
        total: Math.round((items.reduce((sum, i) => sum + i.price * i.quantity, 0) + shippingFee) * 100) / 100,
        status: 'Pending',
        customerSeenStatus: 'Pending',
        adminSeen: false,
      });
    } catch (err) {
      await rollback();
      throw err;
    }
    await CartItem.deleteMany({ customer_id: req.auth.id });
    emit('products');
    emit('order:new', { order_id: order.order_id, customer_id: String(req.auth.id) });
    res.status(201).json({ order: publicOrder(order) });
  } catch (err) {
    serverError(res, err);
  }
});

const requireAdmin = async (req, res, next) => {
  try {
    const acc = await Account.findById(req.auth.id, 'role');
    if (!acc || acc.role !== 'admin') return res.status(403).json({ message: 'Admins only.' });
    next();
  } catch (err) {
    serverError(res, err);
  }
};

const defaultHomeContent = {
  heroTitle: 'The Art of Intentional Living',
  philosophyTitle: 'Our Philosophy',
  philosophyText: 'We believe that true luxury lies in simplicity, honest materials, and designs that create a sense of calm within your home.',
};

const homeContentLimits = {
  heroTitle: 120,
  philosophyTitle: 80,
  philosophyText: 500,
};

const homeContentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'homepage' },
    ...Object.fromEntries(Object.keys(homeContentLimits).map((field) => [field, String])),
  },
  { collection: 'site_content', versionKey: false }
);
const HomeContent = mongoose.model('HomeContent', homeContentSchema);

const publicHomeContent = (content) => {
  const saved = content || {};
  return Object.fromEntries(
    Object.entries(defaultHomeContent).map(([field, fallback]) => [field, saved[field] || fallback])
  );
};

app.get('/api/homepage-content', async (req, res) => {
  try {
    const content = await HomeContent.findById('homepage').lean();
    res.json(publicHomeContent(content));
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/admin/homepage-content', requireAuth, requireAdmin, async (req, res) => {
  try {
    const content = await HomeContent.findById('homepage').lean();
    res.json(publicHomeContent(content));
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/admin/homepage-content', requireAuth, requireAdmin, async (req, res) => {
  try {
    const fields = Object.keys(homeContentLimits);
    const content = {};
    for (const field of fields) {
      const value = req.body?.[field];
      if (typeof value !== 'string' || !value.trim() || value.trim().length > homeContentLimits[field]) {
        return res.status(400).json({ message: `Enter ${field} using 1 to ${homeContentLimits[field]} characters.` });
      }
      content[field] = value.trim();
    }
    const updated = await HomeContent.findOneAndUpdate(
      { _id: 'homepage' },
      { $set: content },
      { new: true, upsert: true, runValidators: true }
    );
    await recordAction(req, 'update_homepage_content', 'Updated homepage headline and philosophy copy');
    emit('homepage');
    res.json(publicHomeContent(updated.toObject()));
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/admin/shipping-rates', requireAuth, requireAdmin, async (req, res) => {
  try {
    const list = Array.isArray(req.body?.rates) ? req.body.rates : [];
    if (list.length === 0) return res.status(400).json({ message: 'No changes to save.' });
    const existing = await ShippingRate.find();
    const byCode = new Map(existing.map((r) => [r.region_code, r]));
    const changes = [];
    for (const item of list) {
      const doc = byCode.get(String(item.region_code));
      const rate = Number(item.rate);
      if (!doc) return res.status(400).json({ message: 'Unknown region.' });
      if (!Number.isFinite(rate) || rate < 0 || rate > 10000) {
        return res.status(400).json({ message: `Enter a rate from 0 to 10,000 for ${doc.region}.` });
      }
      const next = Math.round(rate * 100) / 100;
      if (next !== doc.rate) changes.push({ doc, from: doc.rate, to: next });
    }
    if (changes.length === 0) return res.status(400).json({ message: 'No changes to save.' });
    for (const c of changes) {
      c.doc.rate = c.to;
      await c.doc.save();
    }
    await recordAction(
      req,
      'update_shipping_rates',
      `Updated shipping rates for ${changes.length} region${changes.length === 1 ? '' : 's'}${
        changes.length <= 2 ? ` (${changes.map((c) => `${c.doc.region}: ₱${c.from} → ₱${c.to}`).join('; ')})` : ''
      }`,
      { details: { changes: changes.map((c) => ({ region: c.doc.region, from: c.from, to: c.to })) } }
    );
    emit('shipping');
    res.json({ rates: (await ShippingRate.find()).map(publicRate) });
  } catch (err) {
    serverError(res, err);
  }
});

const adminOrder = (o, email) => ({
  ...publicOrder(o),
  _id: o._id,
  customerEmail: email || '',
  paymentMethod: o.paymentMethod,
});

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

app.get('/api/admin/orders', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, search, month, year, sort } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 6));
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (year || month) {
      const y = year ? Number(year) : null;
      const m = month ? Number(month) : null;
      const exprs = [];
      if (y) exprs.push({ $eq: [{ $year: '$createdAt' }, y] });
      if (m) exprs.push({ $eq: [{ $month: '$createdAt' }, m] });
      filter.$expr = { $and: exprs };
    }
    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      const accounts = await Account.find({ email: rx }, '_id');
      filter.$or = [
        { order_id: rx },
        { 'items.name': rx },
        { customer_id: { $in: accounts.map((a) => a._id) } },
      ];
    }
    const sortBy = { oldest: { createdAt: 1 }, high: { total: -1 }, low: { total: 1 } }[sort] || { createdAt: -1 };
    const [orders, total] = await Promise.all([
      Order.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(filter),
    ]);
    const accounts = await Account.find({ _id: { $in: orders.map((o) => o.customer_id) } }, 'email');
    const emails = new Map(accounts.map((a) => [String(a._id), a.email]));
    res.json({
      orders: orders.map((o) => adminOrder(o, emails.get(String(o.customer_id)) || 'Deleted account')),
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/admin/orders/years', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await Order.aggregate([{ $group: { _id: { $year: '$createdAt' } } }, { $sort: { _id: -1 } }]);
    res.json({ years: rows.map((r) => r._id) });
  } catch (err) {
    serverError(res, err);
  }
});

const transitions = {
  approve: { Pending: 'Processing', Processing: 'Out for Delivery' },
  cancel: { Pending: 'Cancelled', Processing: 'Cancelled' },
  revert: { Processing: 'Pending' },
};

app.patch('/api/admin/orders/:orderId/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const action = req.body?.action;
    const map = transitions[action];
    if (!map) return res.status(400).json({ message: 'Unknown action.' });
    const order = await Order.findOne({ order_id: req.params.orderId });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    const next = map[order.status];
    if (!next) return res.status(409).json({ message: `Can't ${action} an order that is ${order.status.toLowerCase()}.` });
    let reason = '';
    if (action === 'cancel') {
      reason = cleanReason(req.body?.reason);
      if (!reason) return res.status(400).json({ message: 'Give a reason for cancelling this order.' });
      order.cancelReason = reason;
    }
    const previous = order.status;
    if (!order.customerSeenStatus) order.customerSeenStatus = previous;
    order.status = next;
    await order.save();
    if (action === 'cancel') {
      await Promise.all(
        order.items.map((i) => Product.updateOne({ product_id: i.product_id }, { $inc: { stock: i.quantity } }))
      );
    }
    emit('orders', { customer_id: String(order.customer_id) });
    if (action === 'cancel') emit('products');
    const summary = {
      approve: `Approved order ${order.order_id} (${previous} → ${next})`,
      cancel: `Cancelled order ${order.order_id}`,
      revert: `Reverted order ${order.order_id} to ${next}`,
    }[action];
    await recordAction(req, `${action}_order`, summary, { reason, details: { order_id: order.order_id, from: previous, to: next } });
    const acc = await Account.findById(order.customer_id, 'email');
    res.json({ order: adminOrder(order, acc?.email) });
  } catch (err) {
    serverError(res, err);
  }
});

const MAX_FEATURED = 4;

const adminProduct = (p) => ({
  ...publicProduct(p),
  images: p.images && p.images.length ? p.images : [p.image],
  specifications: p.specifications,
  materialDetails: p.material_details,
});

const isImage = (v) =>
  typeof v === 'string' &&
  ((/^data:image\/(jpeg|png|webp);base64,/.test(v) && v.length <= 1_500_000) || /^https?:\/\//.test(v));

const text = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const list = (v) =>
  (Array.isArray(v) ? v : [])
    .map((x) => text(x, 120))
    .filter(Boolean)
    .slice(0, 8);

const cleanProductInput = (b = {}) => {
  const name = text(b.name, 120);
  const description = text(b.description, 2000);
  const type = text(b.type, 60);
  const price = Number(b.price);
  const images = (Array.isArray(b.images) ? b.images : []).filter(isImage).slice(0, 3);
  const spec = b.specifications || {};
  const specifications = {};
  for (const k of ['length', 'width', 'height', 'depth', 'material', 'color', 'finish']) {
    specifications[k] = text(spec[k], 120);
  }
  if (!name || !description || !type) return { error: 'Fill in all the fields.' };
  if (!(price > 0)) return { error: 'Price must be greater than zero.' };
  if (images.length === 0) return { error: 'Add at least one product photo.' };
  if (Object.values(specifications).some((v) => !v)) return { error: 'Fill in all the fields.' };
  for (const k of ['length', 'width', 'height', 'depth']) {
    if (!/\d/.test(specifications[k])) return { error: `${k[0].toUpperCase() + k.slice(1)} must include a number.` };
  }
  const md = b.materialDetails || {};
  const stock = b.stock === undefined || b.stock === '' ? undefined : Number(b.stock);
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0 || stock > 1000000)) {
    return { error: 'Stock must be a whole number, 0 or more.' };
  }
  return {
    data: {
      ...(stock === undefined ? {} : { stock }),
      name,
      description,
      type,
      price: Math.round(price * 100) / 100,
      image: images[0],
      images,
      status: b.status === 'Inactive' ? 'Inactive' : 'Active',
      featured: !!b.featured,
      specifications,
      material_details: {
        carpentry: list(md.carpentry),
        upholstery: list(md.upholstery),
        finishing: list(md.finishing),
      },
    },
  };
};

app.get('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type, search, stock, sort, discount } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 6));
    const filter = { archived: { $ne: true } };
    if (stock === 'out') filter.stock = { $lte: 0 };
    if (stock === 'low') filter.stock = { $gt: 0, $lt: 50 };
    if (stock === 'high') filter.stock = { $gte: 50 };
    if (discount === 'yes' || discount === 'no') {
      const ids = [...(await activeDiscountMap()).keys()];
      filter.product_id = discount === 'yes' ? { $in: ids } : { $nin: ids };
    }
    const order = sort === 'stock-asc' ? { stock: 1, product_id: 1 } : sort === 'stock-desc' ? { stock: -1, product_id: 1 } : { product_id: 1 };
    if (type && type !== 'All') filter.type = type;
    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: rx }, { type: rx }];
    }
    const [products, total, featuredCount] = await Promise.all([
      Product.find(filter, 'product_id name price type image status stock').sort(order).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
      Product.countDocuments({ featured: true, archived: { $ne: true } }),
    ]);
    const [discounts, reservedRows] = await Promise.all([
      activeDiscountMap(),
      Order.aggregate([
        { $match: { status: { $in: ['Pending', 'Processing'] } } },
        { $unwind: '$items' },
        { $match: { 'items.product_id': { $in: products.map((p) => p.product_id) } } },
        { $group: { _id: '$items.product_id', qty: { $sum: '$items.quantity' } } },
      ]),
    ]);
    const reservedMap = new Map(reservedRows.map((r) => [r._id, r.qty]));
    res.json({
      featuredCount,
      products: products.map((p) => ({
        id: p.product_id,
        name: p.name,
        price: p.price,
        discountPercent: discounts.get(p.product_id) || 0,
        discountedPrice: effectivePrice(p.price, discounts.get(p.product_id) || 0),
        stock: p.stock || 0,
        reserved: reservedMap.get(p.product_id) || 0,
        category: p.type,
        image: p.image,
        status: p.status,
      })),
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/admin/product-types', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await Product.aggregate([
      { $match: { archived: { $ne: true } } },
      { $group: { _id: '$type', first: { $min: '$product_id' } } },
      { $sort: { first: 1 } },
    ]);
    res.json({ types: rows.map((r) => r._id) });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = (await Product.findOne({ product_id: id })) || (await ArchivedProduct.findOne({ product_id: id }));
    if (!p) return res.status(404).json({ message: 'Product not found.' });
    res.json({ product: adminProduct(p) });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = cleanProductInput(req.body);
    if (error) return res.status(400).json({ message: error });
    if (data.featured && (await Product.countDocuments({ featured: true, archived: { $ne: true } })) >= MAX_FEATURED) {
      return res.status(400).json({ message: `Only ${MAX_FEATURED} products can be featured.` });
    }
    if (data.stock === undefined) return res.status(400).json({ message: 'Enter the starting stock.' });
    const [lastLive, lastArchived] = await Promise.all([
      Product.findOne({}, 'product_id').sort({ product_id: -1 }),
      ArchivedProduct.findOne({}, 'product_id').sort({ product_id: -1 }),
    ]);
    const last = { product_id: Math.max(lastLive?.product_id || 0, lastArchived?.product_id || 0) };
    const p = await Product.create({
      ...data,
      product_id: (last?.product_id || 0) + 1,
      materials: data.specifications.material,
      details: '',
    });
    await recordAction(req, 'add_product', `Added product ${p.name}`, { details: { product_id: p.product_id } });
    res.status(201).json({ product: adminProduct(p) });
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = cleanProductInput(req.body);
    if (error) return res.status(400).json({ message: error });
    const p = await Product.findOne({ product_id: Number(req.params.id) });
    if (!p) return res.status(404).json({ message: 'Product not found.' });
    if (data.featured && !p.featured && (await Product.countDocuments({ featured: true, archived: { $ne: true } })) >= MAX_FEATURED) {
      return res.status(400).json({ message: `Only ${MAX_FEATURED} products can be featured.` });
    }
    delete data.stock;
    p.set(data);
    if (!p.details) p.materials = data.specifications.material;
    await p.save();
    await recordAction(req, 'edit_product', `Edited product ${p.name}`, { details: { product_id: p.product_id } });
    res.json({ product: adminProduct(p) });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = cleanReason(req.body?.reason);
    if (!reason) return res.status(400).json({ message: 'Give a reason for deleting this product.' });
    const admin = await Account.findById(req.auth.id, 'name');
    const p = await Product.findOne({ product_id: id });
    if (!p) return res.status(404).json({ message: 'Product not found.' });
    const fields = p.toObject();
    delete fields._id;
    delete fields.__v;
    await ArchivedProduct.create({
      ...fields,
      featured: false,
      archived: true,
      archivedAt: new Date(),
      archivedBy: admin?.name || '',
      archiveReason: reason,
    });
    await Product.deleteOne({ _id: p._id });
    await CartItem.deleteMany({ product_id: id });
    await recordAction(req, 'delete_product', `Deleted product ${p.name} (moved to Archive)`, { reason, details: { product_id: id } });
    res.json({ message: 'Archived.' });
  } catch (err) {
    serverError(res, err);
  }
});

const archivedProduct = (p) => ({
  id: p.product_id,
  name: p.name,
  price: p.price,
  category: p.type,
  image: p.image,
  archivedAt: p.archivedAt,
  archivedBy: p.archivedBy,
  reason: p.archiveReason,
});

app.get('/api/admin/archive', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 6));
    const filter = {};
    if (type && type !== 'All') filter.type = type;
    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: rx }, { type: rx }];
    }
    const [products, total] = await Promise.all([
      ArchivedProduct.find(filter).sort({ archivedAt: -1 }).skip((page - 1) * limit).limit(limit),
      ArchivedProduct.countDocuments(filter),
    ]);
    res.json({ products: products.map(archivedProduct), page, pages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/admin/archive-types', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await ArchivedProduct.aggregate([
      { $group: { _id: '$type', first: { $min: '$product_id' } } },
      { $sort: { first: 1 } },
    ]);
    res.json({ types: rows.map((r) => r._id) });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/admin/archive/:id/restore', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const archived = await ArchivedProduct.findOne({ product_id: id });
    if (!archived) return res.status(404).json({ message: 'Product not found in the archive.' });
    if (await Product.exists({ product_id: id })) {
      return res.status(409).json({ message: 'A product with this ID already exists.' });
    }
    const fields = archived.toObject();
    delete fields._id;
    delete fields.__v;
    delete fields.archived;
    delete fields.archivedAt;
    delete fields.archivedBy;
    delete fields.archiveReason;
    const p = await Product.create({ ...fields, archived: false });
    await ArchivedProduct.deleteOne({ _id: archived._id });
    await recordAction(req, 'restore_product', `Restored product ${p.name}`, { details: { product_id: p.product_id } });
    res.json({ product: archivedProduct(archived) });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/admin/archive/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await ArchivedProduct.findOneAndDelete({ product_id: id });
    if (!p) return res.status(404).json({ message: 'Product not found in the archive.' });
    await Rating.deleteMany({ product_id: id });
    await recordAction(req, 'purge_product', `Permanently deleted product ${p.name}`, { reason: p.archiveReason, details: { product_id: id } });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/admin/action-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 8));
    const filter = {};
    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ admin_name: rx }, { admin_email: rx }, { summary: rx }, { action: rx }];
    }
    const [logs, total] = await Promise.all([
      ActionLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      ActionLog.countDocuments(filter),
    ]);
    res.json({
      logs: logs.map((l) => ({
        id: l._id,
        name: l.admin_name || l.admin_email,
        action: l.summary || l.action,
        reason: l.reason || '',
        date: l.createdAt,
      })),
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/admin/products/:id/stock', requireAuth, requireAdmin, async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const remove = req.body?.mode === 'remove';
    if (!Number.isInteger(amount) || amount < 1 || amount > 100000) {
      return res.status(400).json({ message: 'Enter a whole number from 1 to 100,000.' });
    }
    const id = Number(req.params.id);
    const p = await Product.findOneAndUpdate(
      { product_id: id, archived: { $ne: true }, ...(remove ? { stock: { $gte: amount } } : {}) },
      { $inc: { stock: remove ? -amount : amount } },
      { new: true }
    );
    if (!p) {
      const current = await Product.findOne({ product_id: id, archived: { $ne: true } }, 'stock');
      if (!current) return res.status(404).json({ message: 'Product not found.' });
      return res.status(400).json({ message: `You can't remove more than the ${current.stock} in stock.` });
    }
    await recordAction(
      req,
      remove ? 'remove_stock' : 'add_stock',
      `${remove ? `Removed ${amount} stock from` : `Added ${amount} stock to`} ${p.name} (now ${p.stock})`,
      { details: { product_id: p.product_id, amount, mode: remove ? 'remove' : 'add' } }
    );
    res.json({ stock: p.stock });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/admin/alerts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [unseenOrders, out] = await Promise.all([
      Order.countDocuments({ adminSeen: false }),
      Product.find({ status: 'Active', archived: { $ne: true }, stock: { $lte: 0 } }, 'product_id name').sort({ product_id: 1 }),
    ]);
    res.json({ unseenOrders, outOfStock: out.map((p) => ({ id: p.product_id, name: p.name })) });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/admin/orders/seen', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Order.updateMany({ adminSeen: false }, { adminSeen: true });
    res.json({ message: 'ok' });
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/admin/products-lite', requireAuth, requireAdmin, async (req, res) => {
  try {
    const list = await Product.find({ archived: { $ne: true } }, 'product_id name type image price').sort({ product_id: 1 });
    res.json({ products: list.map((p) => ({ id: p.product_id, name: p.name, category: p.type, image: p.image, price: p.price })) });
  } catch (err) {
    serverError(res, err);
  }
});

const adminDiscount = (d) => ({
  id: d._id,
  name: d.name,
  type: d.type || 'product',
  shippingMode: d.shipping_mode || '',
  minSpend: d.min_spend || 0,
  percent: d.percent,
  productCount: d.product_ids.length,
  productIds: d.product_ids,
  startDate: d.startDate,
  endDate: d.endDate,
  enabled: d.enabled,
  status: discountStatus(d),
});

app.get('/api/admin/discounts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 5));
    const [list, total] = await Promise.all([
      Discount.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Discount.countDocuments(),
    ]);
    res.json({ discounts: list.map(adminDiscount), page, pages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (err) {
    serverError(res, err);
  }
});

const parseDiscountInput = async (body = {}, { editing = false } = {}) => {
  const type = body.type === 'shipping' ? 'shipping' : 'product';
  const name = text(body.name, 80);
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (!name) return { error: 'Enter a discount name.' };
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: 'Choose the start and end dates.' };
  }
  if (endDate <= startDate) return { error: 'The end date must be after the start date.' };
  const latest = new Date();
  latest.setFullYear(latest.getFullYear() + 5);
  if (startDate.getFullYear() < 2020 || endDate.getFullYear() < 2020 || startDate > latest || endDate > latest) {
    return { error: 'Dates must be within the next 5 years.' };
  }
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (!editing && startDate < yesterday) return { error: "The start date can't be in the past." };
  if (!editing && endDate < new Date()) return { error: 'The end date has already passed.' };

  if (type === 'shipping') {
    const mode = body.shippingMode === 'free' ? 'free' : 'percent';
    const percent = mode === 'free' ? 100 : Number(body.percent);
    const minSpend = body.minSpend === undefined || body.minSpend === '' ? 0 : Number(body.minSpend);
    if (mode === 'percent' && (!Number.isInteger(percent) || percent < 1 || percent > 99)) {
      return { error: 'Shipping discount must be a whole number from 1 to 99.' };
    }
    if (!Number.isFinite(minSpend) || minSpend < 0 || minSpend > 10000000) {
      return { error: 'Minimum spend must be 0 or more.' };
    }
    return {
      data: { type, name, percent, shipping_mode: mode, min_spend: Math.round(minSpend * 100) / 100, product_ids: [], startDate, endDate },
      label: `shipping promo ${name} (${mode === 'free' ? 'free shipping' : `${percent}% off shipping`}${minSpend ? `, min. spend ₱${minSpend}` : ''})`,
    };
  }

  const percent = Number(body.percent);
  const ids = [...new Set((Array.isArray(body.productIds) ? body.productIds : []).map(Number))].filter(Number.isInteger);
  if (!Number.isInteger(percent) || percent < 1 || percent > 99) {
    return { error: 'Deduction must be a whole number from 1 to 99.' };
  }
  if (ids.length === 0) return { error: 'Choose at least one product.' };
  const found = await Product.countDocuments({ product_id: { $in: ids }, archived: { $ne: true } });
  if (found !== ids.length) return { error: 'Some chosen products no longer exist.' };
  return {
    data: { type, name, percent, shipping_mode: '', min_spend: 0, product_ids: ids, startDate, endDate },
    label: `discount ${name} (${percent}% off ${ids.length} product${ids.length === 1 ? '' : 's'})`,
  };
};

app.post('/api/admin/discounts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, label, error } = await parseDiscountInput(req.body);
    if (error) return res.status(400).json({ message: error });
    const d = await Discount.create({ ...data, enabled: true });
    await recordAction(req, 'create_discount', `Created ${label}`, { details: { discount_id: d._id } });
    await checkDiscountChanges();
    res.status(201).json({ discount: adminDiscount(d) });
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/admin/discounts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Discount not found.' });
    const d = await Discount.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Discount not found.' });
    const { data, label, error } = await parseDiscountInput({ ...req.body, type: d.type || 'product' }, { editing: true });
    if (error) return res.status(400).json({ message: error });
    d.set(data);
    await d.save();
    await recordAction(req, 'update_discount', `Edited ${label}`, { details: { discount_id: d._id } });
    await checkDiscountChanges();
    res.json({ discount: adminDiscount(d) });
  } catch (err) {
    serverError(res, err);
  }
});

app.patch('/api/admin/discounts/:id/enabled', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Discount not found.' });
    const enabled = req.body?.enabled;
    if (typeof enabled !== 'boolean') return res.status(400).json({ message: 'Invalid request.' });
    const d = await Discount.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Discount not found.' });
    if (enabled && d.endDate < new Date()) {
      return res.status(409).json({ message: 'This discount has already ended and cannot be enabled.' });
    }
    d.enabled = enabled;
    await d.save();
    await recordAction(req, 'toggle_discount', `${enabled ? 'Enabled' : 'Disabled'} discount ${d.name}`, { details: { discount_id: d._id } });
    await checkDiscountChanges();
    res.json({ discount: adminDiscount(d) });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/admin/discounts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Discount not found.' });
    const d = await Discount.findByIdAndDelete(req.params.id);
    if (!d) return res.status(404).json({ message: 'Discount not found.' });
    await recordAction(req, 'delete_discount', `Deleted discount ${d.name}`, { details: { discount_id: d._id } });
    await checkDiscountChanges();
    res.json({ message: 'Deleted.' });
  } catch (err) {
    serverError(res, err);
  }
});

const SOLD_STATUSES = ['Out for Delivery', 'Delivered', 'To Review', 'Completed'];

const monthLabel = (y, m) => new Date(y, m, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

app.get('/api/admin/reports', requireAuth, requireAdmin, async (req, res) => {
  try {
    const match = /^(\d{4})-(\d{2})$/.exec(String(req.query.month || ''));
    const range = match ? { start: new Date(Number(match[1]), Number(match[2]) - 1, 1), end: new Date(Number(match[1]), Number(match[2]), 1) } : null;

    const [allDates, orders, products] = await Promise.all([
      Order.find({}, 'createdAt').sort({ createdAt: 1 }).lean(),
      Order.find(range ? { createdAt: { $gte: range.start, $lt: range.end } } : {}, 'customer_id status total shippingFee items createdAt').sort({ createdAt: 1 }).lean(),
      Product.find({ archived: { $ne: true } }, 'product_id name type image').sort({ product_id: 1 }).lean(),
    ]);

    const monthSet = new Map();
    for (const o of allDates) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthSet.has(key)) monthSet.set(key, monthLabel(d.getFullYear(), d.getMonth()));
    }
    const months = [...monthSet.entries()].reverse().map(([value, label]) => ({ value, label }));

    const sold = orders.filter((o) => SOLD_STATUSES.includes(o.status));
    const totalSales = sold.reduce((sum, o) => sum + o.total - (o.shippingFee || 0), 0);
    const kpis = {
      totalOrders: orders.length,
      cancelledOrders: orders.filter((o) => o.status === 'Cancelled').length,
      totalSales: Math.round(totalSales * 100) / 100,
      customers: new Set(orders.map((o) => String(o.customer_id))).size,
      averageSales: sold.length ? Math.round((totalSales / sold.length) * 100) / 100 : 0,
    };

    const buckets = [];
    const index = new Map();
    const add = (key, label) => {
      index.set(key, buckets.length);
      buckets.push({ label, orders: 0, sales: 0 });
    };
    if (range) {
      const days = new Date(range.end - 1).getDate();
      const mon = range.start.toLocaleString('en-US', { month: 'short' });
      for (let d = 1; d <= days; d += 1) add(d, `${mon} ${d}`);
    } else {
      const first = allDates.length ? new Date(allDates[0].createdAt) : new Date();
      const now = new Date();
      let y = first.getFullYear();
      let m = first.getMonth();
      while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
        add(`${y}-${m}`, new Date(y, m, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' }));
        m += 1;
        if (m > 11) {
          m = 0;
          y += 1;
        }
      }
    }
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const i = index.get(range ? d.getDate() : `${d.getFullYear()}-${d.getMonth()}`);
      if (i === undefined) continue;
      buckets[i].orders += 1;
      if (SOLD_STATUSES.includes(o.status)) buckets[i].sales += o.total - (o.shippingFee || 0);
    }
    buckets.forEach((b) => {
      b.sales = Math.round(b.sales * 100) / 100;
    });

    const perProduct = new Map();
    for (const o of sold) {
      for (const item of o.items) {
        const row = perProduct.get(item.product_id) || { sold: 0, sales: 0 };
        row.sold += item.quantity;
        row.sales += item.price * item.quantity;
        perProduct.set(item.product_id, row);
      }
    }
    const rows = products
      .map((p) => {
        const row = perProduct.get(p.product_id) || { sold: 0, sales: 0 };
        return { id: p.product_id, name: p.name, category: p.type, image: p.image, sold: row.sold, sales: Math.round(row.sales * 100) / 100 };
      })
      .sort((a, b) => b.sold - a.sold || b.sales - a.sales);

    res.json({ months, kpis, series: buckets, granularity: range ? 'day' : 'month', products: rows });
  } catch (err) {
    serverError(res, err);
  }
});

const reviewStatus = (r) => (r.hidden ? 'Hidden' : 'Shown');

app.get('/api/admin/reviews', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { search, rating, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 6));
    const filter = {};
    if (['1', '2', '3', '4', '5'].includes(String(rating))) filter.rating = Number(rating);
    if (status === 'shown') filter.hidden = { $ne: true };
    if (status === 'hidden') filter.hidden = true;
    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      const [liveProducts, archivedProducts, accounts] = await Promise.all([
        Product.find({ name: rx }, 'product_id'),
        ArchivedProduct.find({ name: rx }, 'product_id'),
        Account.find({ name: rx }, '_id'),
      ]);
      filter.$or = [
        { reviewer_name: rx },
        { product_id: { $in: [...liveProducts, ...archivedProducts].map((p) => p.product_id) } },
        { customer_id: { $in: accounts.map((a) => a._id) } },
      ];
    }

    const [reviews, total, summaryRows, hiddenCount] = await Promise.all([
      Rating.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
      Rating.countDocuments(filter),
      Rating.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
      Rating.countDocuments({ hidden: true }),
    ]);

    const productIds = [...new Set(reviews.map((r) => r.product_id))];
    const [liveList, archivedList, accountList] = await Promise.all([
      Product.find({ product_id: { $in: productIds } }, 'product_id name image'),
      ArchivedProduct.find({ product_id: { $in: productIds } }, 'product_id name image'),
      Account.find({ _id: { $in: reviews.map((r) => r.customer_id).filter(Boolean) } }, 'name'),
    ]);
    const productMap = new Map([...archivedList, ...liveList].map((p) => [p.product_id, p]));
    const accountMap = new Map(accountList.map((a) => [String(a._id), a.name]));

    const summary = summaryRows[0] || { avg: 0, count: 0 };
    res.json({
      summary: { average: Math.round(summary.avg * 100) / 100, total: summary.count, hidden: hiddenCount },
      reviews: reviews.map((r) => {
        const p = productMap.get(r.product_id);
        return {
          id: r._id,
          product: { id: r.product_id, name: p?.name || 'Deleted product', image: p?.image || '' },
          customer: (r.customer_id && accountMap.get(String(r.customer_id))) || r.reviewer_name,
          rating: r.rating,
          comment: r.comment,
          media: publicMedia(r.media),
          date: r.date,
          status: reviewStatus(r),
          reply: r.reply || '',
          repliedAt: r.repliedAt,
          repliedBy: r.repliedBy || '',
        };
      }),
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (err) {
    serverError(res, err);
  }
});

const reviewTarget = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const review = await Rating.findById(id);
  if (!review) return null;
  const p = (await Product.findOne({ product_id: review.product_id }, 'name')) || (await ArchivedProduct.findOne({ product_id: review.product_id }, 'name'));
  return { review, productName: p?.name || 'a deleted product' };
};

app.patch('/api/admin/reviews/:id/hidden', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (typeof req.body?.hidden !== 'boolean') return res.status(400).json({ message: 'Invalid request.' });
    const found = await reviewTarget(req.params.id);
    if (!found) return res.status(404).json({ message: 'Review not found.' });
    found.review.hidden = req.body.hidden;
    await found.review.save();
    await recordAction(
      req,
      req.body.hidden ? 'hide_review' : 'show_review',
      `${req.body.hidden ? 'Hid' : 'Showed'} ${found.review.reviewer_name}'s ${found.review.rating}-star review on ${found.productName}`,
      { details: { review_id: found.review._id } }
    );
    res.json({ status: reviewStatus(found.review) });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/admin/reviews/:id/reply', requireAuth, requireAdmin, async (req, res) => {
  try {
    const reply = typeof req.body?.reply === 'string' ? req.body.reply.trim().slice(0, 500) : '';
    if (reply.length < 2) return res.status(400).json({ message: 'Write your reply.' });
    const found = await reviewTarget(req.params.id);
    if (!found) return res.status(404).json({ message: 'Review not found.' });
    const admin = await Account.findById(req.auth.id, 'name');
    const edited = !!found.review.reply;
    found.review.reply = reply;
    found.review.repliedAt = new Date();
    found.review.repliedBy = admin?.name || '';
    await found.review.save();
    await recordAction(
      req,
      'reply_review',
      `${edited ? 'Edited reply to' : 'Replied to'} ${found.review.reviewer_name}'s review on ${found.productName}`,
      { details: { review_id: found.review._id } }
    );
    res.json({ reply: found.review.reply, repliedAt: found.review.repliedAt });
  } catch (err) {
    serverError(res, err);
  }
});

const adminUser = (a, phone) => ({
  id: a._id,
  name: a.name,
  email: a.email,
  phone: a.phone || phone || '',
  role: a.role,
  active: !isLocked(a),
  deactivatedUntil: isLocked(a) ? a.deactivatedUntil : null,
  deactivationReason: isLocked(a) ? a.deactivationReason : '',
});

const recordAction = async (req, action, summary, extra = {}) => {
  const admin = await Account.findById(req.auth.id, 'name email');
  if (/product|stock|discount|review/.test(action)) emit('products');
  if (/review/.test(action)) emit('reviews');
  if (/account|admin/.test(action)) emit('users', { id: String(extra.target_id || '') });
  if (/deactivate_account|delete_account/.test(action)) emit('account', { id: String(extra.target_id || '') });
  emit('logs');
  return ActionLog.create({
    admin_id: req.auth.id,
    admin_name: admin?.name || '',
    admin_email: admin?.email || '',
    action,
    summary,
    reason: extra.reason || '',
    target_id: extra.target_id,
    target_name: extra.target_name,
    target_email: extra.target_email,
    target_role: extra.target_role,
    details: extra.details || {},
  });
};

const targetOf = (acc) => ({
  target_id: acc._id,
  target_name: acc.name,
  target_email: acc.email,
  target_role: acc.role,
});

const durationEnd = (duration) => {
  const amount = Number(duration?.amount);
  const unit = duration?.unit;
  if (!Number.isInteger(amount) || amount < 1) return { error: 'Enter a valid duration.' };
  const d = new Date();
  if (unit === 'hours') d.setHours(d.getHours() + amount);
  else if (unit === 'days') d.setDate(d.getDate() + amount);
  else if (unit === 'weeks') d.setDate(d.getDate() + amount * 7);
  else if (unit === 'months') d.setMonth(d.getMonth() + amount);
  else if (unit === 'years') d.setFullYear(d.getFullYear() + amount);
  else return { error: 'Choose a duration unit.' };
  const max = new Date();
  max.setFullYear(max.getFullYear() + 10);
  if (d > max) return { error: "Duration can't be longer than 10 years." };
  return { until: d };
};

const cleanReason = (v) => {
  const reason = typeof v === 'string' ? v.trim().slice(0, 300) : '';
  return reason.length >= 3 ? reason : '';
};

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    await sweepExpired();
    const { role, search, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 6));
    const filter = {};
    if (role === 'customer' || role === 'admin') filter.role = role;
    if (status === 'active') filter.active = { $ne: false };
    if (status === 'deactivated') filter.active = false;
    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }
    const [accounts, total] = await Promise.all([
      Account.find(filter, 'name email phone role active deactivatedUntil deactivationReason').sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit),
      Account.countDocuments(filter),
    ]);
    const addresses = await Address.find({ customer_id: { $in: accounts.map((a) => a._id) } }, 'customer_id phone isDefault').sort({ isDefault: -1, createdAt: 1 });
    const phones = new Map();
    for (const a of addresses) {
      const key = String(a.customer_id);
      if (!phones.has(key)) phones.set(key, a.phone);
    }
    res.json({
      users: accounts.map((a) => adminUser(a, phones.get(String(a._id)))),
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim().replace(/[\s-]/g, '') : '';
    if (!name?.trim() || !email?.trim() || !phone || !password) {
      return res.status(400).json({ message: 'Fill in all the fields.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!validName(name)) return res.status(400).json({ message: NAME_ERROR });
    if (!PHONE_RE.test(phone)) return res.status(400).json({ message: PHONE_ERROR });
    if (!validPassword(password)) {
      return res.status(400).json({ message: "The password doesn't meet all the requirements." });
    }
    const normalized = email.trim().toLowerCase();
    if (await Account.findOne({ email: normalized })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const acc = await Account.create({
      name: name.trim(),
      email: normalized,
      phone,
      password: await bcrypt.hash(password, 10),
      role: 'admin',
    });
    await recordAction(req, 'create_admin', `Created admin account for ${acc.name} (${acc.email})`, { ...targetOf(acc) });
    res.status(201).json({ user: adminUser(acc) });
  } catch (err) {
    serverError(res, err);
  }
});

app.patch('/api/admin/users/:id/deactivate', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Account not found.' });
    if (String(req.auth.id) === req.params.id) {
      return res.status(400).json({ message: "You can't deactivate your own account." });
    }
    const reason = cleanReason(req.body?.reason);
    if (!reason) return res.status(400).json({ message: 'Give a reason for deactivating this account.' });
    const { until, error } = durationEnd(req.body?.duration);
    if (error) return res.status(400).json({ message: error });
    const acc = await Account.findByIdAndUpdate(
      req.params.id,
      {
        active: false,
        status: 'Deactivated',
        deactivatedAt: new Date(),
        deactivatedUntil: until,
        deactivationReason: reason,
        deactivationDuration: `${req.body.duration.amount} ${req.body.duration.amount === 1 ? req.body.duration.unit.replace(/s$/, '') : req.body.duration.unit}`,
      },
      { new: true }
    );
    if (!acc) return res.status(404).json({ message: 'Account not found.' });
    const { amount, unit } = req.body.duration;
    await recordAction(req, 'deactivate_account', `Deactivated account of ${acc.name} (${acc.email}) for ${amount} ${amount === 1 ? unit.replace(/s$/, '') : unit}`, {
      ...targetOf(acc),
      reason,
      details: { until, duration: req.body.duration },
    });
    res.json({ user: adminUser(acc) });
  } catch (err) {
    serverError(res, err);
  }
});

app.patch('/api/admin/users/:id/activate', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Account not found.' });
    const acc = await Account.findByIdAndUpdate(
      req.params.id,
      { active: true, status: 'Active', deactivatedAt: null, deactivatedUntil: null, deactivationReason: '', deactivationDuration: '' },
      { new: true }
    );
    if (!acc) return res.status(404).json({ message: 'Account not found.' });
    await recordAction(req, 'activate_account', `Activated account of ${acc.name} (${acc.email})`, { ...targetOf(acc) });
    res.json({ user: adminUser(acc) });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Account not found.' });
    if (String(req.auth.id) === req.params.id) {
      return res.status(400).json({ message: "You can't delete your own account." });
    }
    const reason = cleanReason(req.body?.reason);
    if (!reason) return res.status(400).json({ message: 'Give a reason for deleting this account.' });
    const acc = await Account.findByIdAndDelete(req.params.id);
    if (!acc) return res.status(404).json({ message: 'Account not found.' });
    await Promise.all([
      Address.deleteMany({ customer_id: acc._id }),
      CartItem.deleteMany({ customer_id: acc._id }),
    ]);
    await recordAction(req, 'delete_account', `Deleted account of ${acc.name} (${acc.email})`, { ...targetOf(acc), reason });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    serverError(res, err);
  }
});

app.use((err, req, res, _next) => {
  if (err.message === 'CORS_BLOCKED') return res.status(403).json({ message: 'This website is not allowed to use the API.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid request.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'That file is too large.' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

mongoose
  .connect(process.env.MONGO_URI, { dbName: 'ecommerce' })
  .then(() => {
    console.log('Connected to MongoDB');
    sweepExpired().catch(() => {});
    ensureShippingRates().catch(() => {});
    checkDiscountChanges().catch(() => {});
    setInterval(() => sweepExpired().catch(() => {}), 60 * 1000);
    setInterval(() => checkDiscountChanges().catch(() => {}), 20 * 1000);
    app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
