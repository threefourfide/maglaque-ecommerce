import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { onLive } from './live';
import { resizeImageFile } from './utils/media';
import OrderUpdateToast from './components/OrderUpdateToast';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutUs from './pages/AboutUs';
import Catalog from './pages/Catalog';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import * as api from './api';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLogs from './pages/admin/AdminLogs';
import AdminReports from './pages/admin/AdminReports';
import AdminSettings from './pages/admin/AdminSettings';
import AdminHomePage from './pages/admin/AdminHomePage';
import AdminReviews from './pages/admin/AdminReviews';
import AdminArchive from './pages/admin/AdminArchive';

function HideOnAuth({ children }) {
  const { pathname } = useLocation();
  return pathname === '/auth' || pathname.startsWith('/admin') ? null : children;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [authLoading, setAuthLoading] = useState(!!api.getToken());
  const [cart, setCart] = useState([]);
  const [selectedCartIds, setSelectedCartIds] = useState(null);
  const [user, setUser] = useState(null);
  const userId = user?.id;
  const [toast, setToast] = useState(null); // "Added to cart" notification
  const toastSequence = useRef(0);
  const [orders, setOrders] = useState([]);
  const [orderNotice, setOrderNotice] = useState(null);
  const ordersRef = useRef([]);
  const cartRef = useRef(cart);
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const handleLogout = useCallback(() => {
    api.clearToken();
    setUser(null);
    setAddresses([]);
    setOrders([]);
    setCart([]);
    setSelectedCartIds(null);
  }, []);

  // Remove the toast after its fade animation finishes
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadProducts = useCallback(() =>
    api
      .fetchProducts()
      .then(({ products: list }) => {
        setProducts(list);
        setProductsError('');
      })
      .catch((err) => setProductsError(err.message))
      .finally(() => setProductsLoading(false)), []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(
    () =>
      onLive((event) => {
        if (event.type === 'products' || event.type === 'reviews') loadProducts();
        if (!userId) return;
        const mine = String(userId);
        if (event.type === 'orders' && event.customer_id === mine) {
          api
            .fetchOrders()
            .then(({ orders: list }) => {
              const before = new Map(ordersRef.current.map((o) => [o.id, o.status]));
              const changed = list.filter((o) => before.has(o.id) && before.get(o.id) !== o.status);
              setOrders(list);
              if (changed.length === 0) return;
              if (changed.length > 1) {
                setOrderNotice({ id: Date.now(), severity: 'info', message: `${changed.length} of your orders have a new status.` });
                return;
              }
              const o = changed[0];
              const text = {
                Processing: before.get(o.id) === 'Pending' ? 'has been approved and is now being prepared.' : 'is now being prepared.',
                Pending: 'was moved back to pending.',
                'Out for Delivery': 'is out for delivery! Tap Order Received once it arrives.',
                Cancelled: 'has been cancelled.',
              }[o.status];
              if (!text) return;
              setOrderNotice({
                id: Date.now(),
                severity: o.status === 'Cancelled' ? 'warning' : 'success',
                message: `Your order ${o.id} ${text}`,
              });
            })
            .catch(() => {});
        }
        if (event.type === 'account' && event.id === mine) {
          api.fetchMe().catch(() => handleLogout());
        }
      }),
    [userId, handleLogout, loadProducts]
  );

  const handleLogin = (data) => {
    setUser({ ...data, name: data.name || data.email.split('@')[0] });
  };

  useEffect(() => {
    if (!api.getToken()) return;
    api
      .fetchMe()
      .then(({ user: me }) => setUser(me))
      .catch((err) => {
        if (err.message === 'Please sign in again.') api.clearToken();
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    if (user?.role !== 'customer') return;
    api
      .fetchAddresses()
      .then(({ addresses: list }) => setAddresses(list))
      .catch(() => {});
    api
      .fetchOrders()
      .then(({ orders: list }) => setOrders(list))
      .catch(() => {});
    const guest = cartRef.current;
    const loadCart = guest.length ? api.mergeCart(guest) : api.fetchCart();
    loadCart.then(({ cart: list }) => setCart(list)).catch(() => {});
  }, [user?.id, user?.role]);

  const addAddress = async (data) => {
    const { address } = await api.createAddress(data);
    setAddresses((prev) => {
      const base = address.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev;
      return [...base, address];
    });
  };

  const updateAddress = async (id, data) => {
    const { address } = await api.editAddress(id, data);
    setAddresses((prev) =>
      prev.map((a) => {
        if (a.id === id) return address;
        return address.isDefault ? { ...a, isDefault: false } : a;
      })
    );
  };

  const deleteAddress = async (id) => {
    await api.removeAddress(id);
    setAddresses((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (next.length && !next.some((a) => a.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const setDefaultAddress = async (id) => {
    await api.makeDefaultAddress(id);
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  };

  const handleChangePassword = (data) => api.changePassword(data);

  const handleSubmitReview = async ({ productId, rating, comment, media = [] }) => {
    const mediaIds = [];
    for (const file of media) {
      const blob = file.type.startsWith('image/') ? await resizeImageFile(file) : file;
      const { id } = await api.uploadReviewMedia(blob);
      mediaIds.push(id);
    }
    const result = await api.postReview(productId, { rating, comment, mediaIds });
    setToast({
      id: ++toastSequence.current,
      name: 'Your review is now visible on this product.',
      message: 'Review submitted successfully',
    });
    return result;
  };

  const handleMarkReceived = async (orderId) => {
    const { order } = await api.markOrderReceived(orderId);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...order } : o)));
  };

  const handleMarkSeen = (status) => {
    setOrders((prev) => prev.map((o) => (o.status === status ? { ...o, customerSeenStatus: status } : o)));
    api.markOrdersSeen(status).catch(() => {});
  };

  const handleChangePhoto = async (photo) => {
    const { user: me } = photo ? await api.uploadPhoto(photo) : await api.removePhoto();
    setUser(me);
  };

  const addOrder = async ({ addressId, discountCode, productIds }) => {
    const { order } = await api.createOrder(addressId, discountCode, productIds);
    setOrders((prev) => [order, ...prev]);
  };

  // Add item to cart or increment quantity if it already exists
  const reloadCart = () =>
    api
      .fetchCart()
      .then(({ cart: list }) => setCart(list))
      .catch(() => {});

  const addToCart = (product, qty = 1, { showSuccessToast = true } = {}) => {
    const latest = products.find((p) => p.id === product.id) || product;
    const inCart = cartRef.current.find((i) => i.id === product.id)?.quantity || 0;
    const room = (latest.stock ?? 0) - inCart;
    if (room < 1) {
      setToast({
        name: product.name,
        id: Date.now(),
        error: latest.stock > 0 ? `Only ${latest.stock} in stock` : 'Out of stock',
      });
      return false;
    }
    const add = Math.min(qty, room);
    if (add < qty) {
      setToast({ name: product.name, id: Date.now(), error: `Only ${latest.stock} in stock` });
    } else if (showSuccessToast) {
      setToast({ name: product.name, id: Date.now() });
    }
    if (isCustomer) {
      api.addCartItem(product.id, add).catch((err) => {
        setToast({ name: product.name, id: Date.now(), error: err.message });
        reloadCart();
      });
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + add } : item
        );
      }
      return [...prevCart, { ...product, quantity: add }];
    });
    return true;
  };

  // Update item quantity in cart
  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    const latest = products.find((p) => p.id === id);
    if (latest && quantity > latest.stock) {
      setToast({ name: latest.name, id: ++toastSequence.current, error: `Only ${latest.stock} in stock` });
      return;
    }
    if (isCustomer) {
      api.setCartQuantity(id, quantity).catch((err) => {
        setToast({ name: latest?.name || '', id: Date.now(), error: err.message });
        reloadCart();
      });
    }
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (id) => {
    if (isCustomer) api.removeCartItem(id).catch(() => {});
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    setSelectedCartIds((prevIds) => prevIds === null ? null : prevIds.filter((selectedId) => selectedId !== id));
  };

  const clearCart = (productIds) => {
    setCart((prevCart) => prevCart.filter((item) => !productIds.includes(item.id)));
    setSelectedCartIds(null);
  };

  const liveCart = cart.map((item) => {
    const p = products.find((x) => x.id === item.id);
    return p
      ? { ...item, price: p.price, originalPrice: p.originalPrice, discountPercent: p.discountPercent, stock: p.stock }
      : item;
  });
  const selectedCart = selectedCartIds === null
    ? liveCart
    : liveCart.filter((item) => selectedCartIds.includes(item.id));

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen bg-[#F9F6F0]">
        <OrderUpdateToast notice={orderNotice} onClose={() => setOrderNotice(null)} />
        <HideOnAuth>
          <NavBar cartCount={cartCount} user={user} onLogout={handleLogout} />
        </HideOnAuth>
        
        <main className="flex-grow">
          {productsError && !productsLoading && products.length === 0 && (
            <p role="alert" className="bg-red-50 px-6 py-3 text-center text-sm text-red-700">
              {productsError}
            </p>
          )}
          <Routes>
            <Route
              path="/admin"
              element={
                authLoading ? null : user?.role === 'admin' ? (
                  <AdminLayout user={user} onLogout={handleLogout} onUserChange={setUser} />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            >
              <Route index element={<Navigate to="orders" replace />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="users" element={<AdminUsers currentUserId={user?.id} />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="homepage" element={<AdminHomePage />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="action-logs" element={<AdminLogs />} />
              <Route path="archive" element={<AdminArchive />} />
            </Route>
            <Route path="/auth" element={<Auth onLogin={handleLogin} onRegister={handleLogin} />} />
            <Route path="/" element={<HomePage products={products} addToCart={addToCart} />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/catalog" element={<Catalog products={products} addToCart={addToCart} />} />
            <Route path="/product/:id" element={<ProductDetails products={products} loading={productsLoading} user={user} addToCart={addToCart} />} />
            <Route path="/cart" element={<Cart cart={liveCart} selectedIds={selectedCartIds} setSelectedIds={setSelectedCartIds} updateQuantity={updateQuantity} removeFromCart={removeFromCart} />} />
            <Route path="/checkout" element={authLoading ? null : <Checkout cart={selectedCart} clearCart={clearCart} addOrder={addOrder} user={user} addresses={addresses} />} />
            <Route path="/account" element={authLoading ? null : <Profile
              user={user}
              orders={orders}
              addresses={addresses}
              onChangePassword={handleChangePassword}
              onChangePhoto={handleChangePhoto}
              onMarkReceived={handleMarkReceived}
              onMarkSeen={handleMarkSeen}
              onSubmitReview={handleSubmitReview}
              onAddAddress={addAddress}
              onUpdateAddress={updateAddress}
              onDeleteAddress={deleteAddress}
              onSetDefaultAddress={setDefaultAddress}
            />} />
          </Routes>
        </main>

        <HideOnAuth>
          <Footer />
        </HideOnAuth>

        {/* Toast: confirms an item was added to the cart (fades in, then out) */}
        <style>{`
          @keyframes toast-fade {
            0%   { opacity: 0; transform: translate(-50%, -46%) scale(0.96); }
            15%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            75%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -54%) scale(0.98); }
          }
          .toast-fade { animation: toast-fade 2.5s ease-in-out forwards; }
          @media (prefers-reduced-motion: reduce) {
            .toast-fade { animation-duration: 0.01s; animation-delay: 2.4s; }
          }
        `}</style>
        {toast && (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="toast-fade fixed top-1/2 left-1/2 z-[60] pointer-events-none flex flex-col items-center gap-3 bg-[#2D3A31]/80 backdrop-blur-sm text-[#F9F6F0] px-10 py-8 shadow-2xl w-[calc(100%-3rem)] max-w-xs text-center"
          >
            {toast.error ? <X className="w-8 h-8 stroke-[1.5]" /> : <Check className="w-8 h-8 stroke-[1.5]" />}
            <div className="text-xs tracking-wider w-full">
              <p className="uppercase tracking-[0.2em]">{toast.error || toast.message || 'Added to cart'}</p>
              <p className="text-[#F9F6F0]/70 mt-1 truncate">{toast.name}</p>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}