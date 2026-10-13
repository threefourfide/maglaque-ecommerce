import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Plus, X, ImagePlus, BadgePercent, Truck } from 'lucide-react';
import {
  adminFetchProducts,
  adminFetchTypes,
  adminFetchProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
} from '../../api';
import { ConfirmModal, ReasonDialog, SlidingTabs, useLive, useToast } from './AdminUI';
import { goBack } from '../../utils/nav';
import StockModal from './StockModal';
import ShippingRatesModal from './ShippingRatesModal';
import { AddDiscountModal, DiscountTable } from './Discounts';
import { ProductModal, ProductSummary, money } from './ProductSummary';

const OTHER = '__other';

const deleteReasons = ['Discontinued', 'Out of stock', 'Wrong or duplicate listing', 'Quality issue', 'Replaced by a new product', 'Others'];

const emptyForm = {
  images: ['', '', ''],
  name: '',
  price: '',
  stock: '',
  description: '',
  type: '',
  newType: '',
  status: 'Active',
  featured: false,
  length: '',
  depth: '',
  width: '',
  height: '',
  material: '',
  color: '',
  finish: '',
  carpentry: '',
  upholstery: '',
  finishing: '',
};

const formFromProduct = (p) => {
  const imgs = [...(p.images || [p.image])].slice(0, 3);
  while (imgs.length < 3) imgs.push('');
  const spec = p.specifications || {};
  const mat = p.materialDetails || {};
  return {
    images: imgs,
    name: p.name,
    price: String(p.price),
    stock: '',
    description: p.description || '',
    type: p.category,
    newType: '',
    status: p.status || 'Active',
    featured: !!p.featured,
    length: spec.length || '',
    depth: spec.depth || '',
    width: spec.width || '',
    height: spec.height || '',
    material: spec.material || '',
    color: spec.color || '',
    finish: spec.finish || '',
    carpentry: (mat.carpentry || []).join(', '),
    upholstery: (mat.upholstery || []).join(', '),
    finishing: (mat.finishing || []).join(', '),
  };
};

const splitList = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);

const resolveType = (form) => (form.type === OTHER ? form.newType.trim() : form.type.trim());

const toPayload = (form) => ({
  name: form.name.trim(),
  price: Number(form.price),
  ...(form.stock === '' ? {} : { stock: Number(form.stock) }),
  description: form.description.trim(),
  type: resolveType(form),
  status: form.status,
  featured: form.featured,
  images: form.images.filter(Boolean),
  specifications: {
    length: form.length.trim(),
    width: form.width.trim(),
    height: form.height.trim(),
    depth: form.depth.trim(),
    material: form.material.trim(),
    color: form.color.trim(),
    finish: form.finish.trim(),
  },
  materialDetails: {
    carpentry: splitList(form.carpentry),
    upholstery: splitList(form.upholstery),
    finishing: splitList(form.finishing),
  },
});

const resizeImage = (file, max = 900) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Choose a valid image (JPG, PNG or WEBP).'));
    };
    img.src = url;
  });

const stepTitles = ['', 'Product Specifications', 'Product Details', 'Preview'];

const inputClass =
  'mt-1 h-11 w-full border border-[#8A6A4F]/70 bg-white px-3 text-sm outline-none transition-colors focus:border-[#2D3A31]';
const labelClass = 'block text-sm text-[#2D3A31]';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function ProductFormModal({ mode, categoryLock, types, initial, featuredCount, onClose, onSaved }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial ? formFromProduct(initial) : { ...emptyForm, type: categoryLock || '' });
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRefs = useRef([]);
  const othersFeatured = featuredCount - (initial?.featured ? 1 : 0);
  const featuredFull = othersFeatured >= 4;

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirm) setConfirm('cancel');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm]);

  const pickImage = async (index, file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError('Choose a JPG, PNG or WEBP image.');
    if (file.size > 8 * 1024 * 1024) return setError('Image must be 8 MB or smaller.');
    try {
      const data = await resizeImage(file);
      setForm((f) => ({ ...f, images: f.images.map((v, i) => (i === index ? data : v)) }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const removeImage = (index) => {
    setForm((f) => ({ ...f, images: f.images.map((v, i) => (i === index ? '' : v)) }));
  };

  const validate = (target) => {
    if (target === 0) {
      if (!form.images.some(Boolean)) return 'Add at least one product photo.';
      if (!form.name.trim() || !form.description.trim() || !String(form.price).trim()) {
        return 'Fill in all the fields.';
      }
      const price = Number(form.price);
      if (!Number.isFinite(price) || price <= 0) return 'Price must be greater than zero.';
      if (!resolveType(form)) return form.type === OTHER ? 'Type the new category name.' : 'Choose a category.';
      if (mode === 'add' && !/^\d+$/.test(form.stock)) return 'Enter the starting stock (0 or more).';
    }
    if (target === 1) {
      const dims = ['length', 'width', 'height', 'depth'];
      if (dims.some((k) => !form[k].trim())) return 'Fill in all the dimensions.';
      const bad = dims.find((k) => !/\d/.test(form[k]));
      if (bad) return `${bad[0].toUpperCase() + bad.slice(1)} must include a number (e.g. 120 cm or 47 in).`;
    }
    if (target === 2) {
      if (!form.material.trim() || !form.color.trim() || !form.finish.trim()) return 'Fill in all the fields.';
    }
    return '';
  };

  const next = () => {
    const msg = validate(step);
    if (msg) return setError(msg);
    setError('');
    setStep((s) => s + 1);
  };

  const askSave = () => {
    for (let i = 0; i < 3; i += 1) {
      const msg = validate(i);
      if (msg) {
        setStep(i);
        return setError(msg);
      }
    }
    setConfirm('save');
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = toPayload(form);
      const { product } =
        mode === 'edit' ? await adminUpdateProduct(initial.id, payload) : await adminCreateProduct(payload);
      toast(mode === 'edit' ? `${product.name} was updated.` : `${product.name} was published.`);
      onSaved();
    } catch (err) {
      setConfirm(null);
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const heading =
    mode === 'edit' ? 'Edit Product' : categoryLock ? `Add ${categoryLock} Product` : 'Add Product';

  const preview = {
    name: form.name,
    category: resolveType(form),
    price: Number(form.price) || 0,
    description: form.description,
    images: form.images.filter(Boolean),
    specifications: {
      length: form.length,
      width: form.width,
      height: form.height,
      depth: form.depth,
      material: form.material,
      color: form.color,
      finish: form.finish,
    },
    materialDetails: {
      carpentry: splitList(form.carpentry),
      upholstery: splitList(form.upholstery),
      finishing: splitList(form.finishing),
    },
  };

  const outlineBtn = 'border px-6 py-3 text-xs uppercase tracking-wider transition-colors disabled:opacity-50';

  return (
    <div className="admin-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirm('cancel')}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="admin-modal relative max-h-[94vh] w-full max-w-2xl overflow-y-auto bg-white px-6 py-8 shadow-2xl sm:px-10"
      >
        <button
          type="button"
          onClick={() => setConfirm('cancel')}
          aria-label="Close"
          className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-[#2D3831]/60 hover:bg-[#2D3831]/5"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-center text-3xl uppercase tracking-[0.1em]">{heading}</h2>
        <p className="mt-1 text-center text-sm text-[#2D3A31]">{stepTitles[step] || `Step 1 of 4`}</p>

        <div key={step} className="admin-fade mt-6">
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex justify-center gap-3 sm:gap-5">
                {form.images.map((img, i) => (
                  <div key={i} className="relative">
                    <button
                      type="button"
                      onClick={() => fileRefs.current[i]?.click()}
                      aria-label={`Upload photo ${i + 1}`}
                      className="flex h-32 w-24 items-center justify-center overflow-hidden rounded-md border border-[#8A6A4F]/60 bg-[#FAF6EF] transition-colors hover:bg-[#EDE5DB] sm:h-36 sm:w-28"
                    >
                      {img ? (
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex flex-col items-center gap-1 text-[10px] text-[#2D3831]/60">
                          <ImagePlus className="h-6 w-6 stroke-[1.5]" />
                          {i === 0 ? 'Main photo' : 'Photo'}
                        </span>
                      )}
                    </button>
                    {img && (
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label={`Remove photo ${i + 1}`}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#2D3A31] text-[#F9F6F0] hover:opacity-90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <input
                      ref={(el) => {
                        fileRefs.current[i] = el;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        pickImage(i, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-4">
                  <Field label="Product Name">
                    <input value={form.name} onChange={set('name')} maxLength={120} className={inputClass} />
                  </Field>
                  <div className={mode === 'add' ? 'grid grid-cols-2 gap-3' : ''}>
                    <Field label="Price">
                      <input value={form.price} onChange={set('price')} inputMode="decimal" placeholder="e.g. 1250" className={inputClass} />
                    </Field>
                    {mode === 'add' && (
                      <Field label="Stock">
                        <input
                          value={form.stock}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, stock: e.target.value.replace(/\D/g, '').slice(0, 6) }));
                            setError('');
                          }}
                          inputMode="numeric"
                          placeholder="e.g. 50"
                          className={inputClass}
                        />
                      </Field>
                    )}
                  </div>
                </div>
                <Field label="Description">
                  <textarea
                    value={form.description}
                    onChange={set('description')}
                    rows={5}
                    maxLength={2000}
                    className="mt-1 h-[calc(100%-1.75rem)] min-h-[8rem] w-full resize-none border border-[#8A6A4F]/70 bg-white p-3 text-sm outline-none focus:border-[#2D3A31]"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {!categoryLock || mode === 'edit' ? (
                  <div>
                    <Field label="Category">
                      <select value={form.type} onChange={set('type')} className={inputClass}>
                        <option value="">Select a category</option>
                        {types.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value={OTHER}>Others (type a new category)</option>
                      </select>
                    </Field>
                    {form.type === OTHER && (
                      <input
                        value={form.newType}
                        onChange={set('newType')}
                        placeholder="New category name"
                        maxLength={60}
                        className={`${inputClass} admin-fade`}
                      />
                    )}
                  </div>
                ) : (
                  <Field label="Category">
                    <input value={categoryLock} readOnly className={`${inputClass} bg-[#FAF6EF]`} />
                  </Field>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Status">
                    <select value={form.status} onChange={set('status')} className={inputClass}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </Field>
                  <div className="mt-7">
                    <label
                      className={`flex items-center gap-2 text-sm text-[#2D3A31] ${featuredFull ? 'cursor-not-allowed opacity-50' : ''}`}
                      title={featuredFull ? 'Only 4 products can be featured' : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={form.featured}
                        onChange={set('featured')}
                        disabled={featuredFull}
                        className="h-4 w-4 accent-[#2D3A31]"
                      />
                      Featured
                    </label>
                    {featuredFull && (
                      <p className="mt-1 text-[10px] leading-tight text-[#2D3831]/60">4 of 4 featured already.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="text-xl text-[#6B4F3A]">Dimensions</h3>
              <p className="mt-1 text-xs text-[#2D3831]/60">Include the unit, like cm or in.</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Length">
                  <input value={form.length} onChange={set('length')} placeholder="e.g. 120 cm or 47 in" className={inputClass} />
                </Field>
                <Field label="Depth">
                  <input value={form.depth} onChange={set('depth')} placeholder="e.g. 60 cm or 24 in" className={inputClass} />
                </Field>
                <Field label="Width">
                  <input value={form.width} onChange={set('width')} placeholder="e.g. 80 cm or 31 in" className={inputClass} />
                </Field>
                <Field label="Height">
                  <input value={form.height} onChange={set('height')} placeholder="e.g. 75 cm or 30 in" className={inputClass} />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Material">
                  <input value={form.material} onChange={set('material')} placeholder="e.g. Solid oak" className={inputClass} />
                </Field>
                <Field label="Color">
                  <input value={form.color} onChange={set('color')} placeholder="e.g. Natural" className={inputClass} />
                </Field>
                <Field label="Finish">
                  <input value={form.finish} onChange={set('finish')} placeholder="e.g. Matte oil finish" className={inputClass} />
                </Field>
              </div>
              <div>
                <h3 className="text-xl text-[#6B4F3A]">Product Materials</h3>
                <p className="mt-1 text-xs text-[#2D3831]/60">Optional. Separate items with commas.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <Field label="Carpentry">
                    <input value={form.carpentry} onChange={set('carpentry')} className={inputClass} />
                  </Field>
                  <Field label="Upholstery">
                    <input value={form.upholstery} onChange={set('upholstery')} className={inputClass} />
                  </Field>
                  <Field label="Finishing">
                    <input value={form.finishing} onChange={set('finishing')} className={inputClass} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step === 3 && <ProductSummary product={preview} />}
        </div>

        {error && <p role="alert" className="admin-fade mt-5 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            {step > 0 && step < 3 && (
              <button type="button" onClick={() => { setStep(step - 1); setError(''); }} className={`${outlineBtn} border-[#2D3831]/40 hover:bg-[#2D3831]/5`}>
                Back
              </button>
            )}
            {step === 3 && (
              <button type="button" onClick={() => setStep(0)} className={`${outlineBtn} border-[#2D3831]/40 hover:bg-[#2D3831]/5`}>
                Edit Product
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setConfirm('cancel')} className={`${outlineBtn} border-[#B3261E] text-[#B3261E] hover:bg-red-50`}>
              Cancel
            </button>
            {step < 3 ? (
              <>
                {mode === 'edit' && (
                  <button type="button" onClick={askSave} className={`${outlineBtn} border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F]/10`}>
                    Save Changes
                  </button>
                )}
                <button type="button" onClick={next} className={`${outlineBtn} border-[#2D3831]/40 hover:bg-[#2D3831]/5`}>
                  Next
                </button>
              </>
            ) : (
              <button type="button" onClick={askSave} className={`${outlineBtn} border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F]/10`}>
                {mode === 'edit' ? 'Save Changes' : 'Publish'}
              </button>
            )}
          </div>
        </div>
      </div>

      {confirm === 'cancel' && (
        <ConfirmModal
          title="Discard changes?"
          message={mode === 'edit' ? 'Your changes to this product will be lost.' : 'The product you are adding will not be saved.'}
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          danger
          onConfirm={onClose}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'save' && (
        <ConfirmModal
          title={mode === 'edit' ? 'Save changes?' : 'Publish product?'}
          message={
            mode === 'edit'
              ? `Update ${form.name.trim()} with these changes?`
              : `${form.name.trim()} will be added to the ${resolveType(form)} collection.`
          }
          confirmLabel={mode === 'edit' ? 'Save' : 'Publish'}
          busy={busy}
          onConfirm={save}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [type, setType] = useState('All');
  const [types, setTypes] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [stockSort, setStockSort] = useState('');
  const [discountFilter, setDiscountFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ products: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const [form, setForm] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [stockFor, setStockFor] = useState(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [discountVersion, setDiscountVersion] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadTypes = useCallback(
    () =>
      adminFetchTypes()
        .then(({ types: list }) => {
          setTypes(list);
          setType((current) => (current !== 'All' && !list.includes(current) ? 'All' : current));
        })
        .catch(() => {}),
    []
  );

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const load = useCallback(() => {
    const params = { type, page };
    if (search) params.search = search;
    if (stockFilter) params.stock = stockFilter;
    if (stockSort) params.sort = stockSort;
    if (discountFilter) params.discount = discountFilter;
    return adminFetchProducts(params)
      .then((res) => {
        setData(res);
        setAnimKey((k) => k + 1);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [type, page, search, stockFilter, stockSort, discountFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useLive(['products'], () => {
    load();
    loadTypes();
  });

  const openEdit = useCallback(
    async (id, cameFromElsewhere = false) => {
      try {
        const { product } = await adminFetchProduct(id);
        setViewId(null);
        setForm({ mode: 'edit', product, cameFromElsewhere });
      } catch (err) {
        toast(err.message, 'error');
      }
    },
    [toast]
  );

  useEffect(() => {
    const editId = location.state?.editId;
    if (!editId) return;
    navigate(location.pathname, { replace: true, state: null });
    adminFetchProduct(editId)
      .then(({ product }) => {
        setViewId(null);
        setForm({ mode: 'edit', product, cameFromElsewhere: true });
      })
      .catch((err) => toast(err.message, 'error'));
  }, [location, navigate, toast]);

  const closeForm = () => {
    const cameFromElsewhere = form?.cameFromElsewhere;
    setForm(null);
    if (cameFromElsewhere) {
      goBack(navigate, '/admin/products');
    }
  };

  const afterSave = () => {
    loadTypes();
    load();
    closeForm();
  };

  const confirmDelete = async (reason) => {
    setBusy(true);
    try {
      await adminDeleteProduct(deleting.id, reason);
      toast(`${deleting.name} was moved to the Archive.`);
      setDeleting(null);
      await loadTypes();
      if (data.products.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch (err) {
      setDeleting(null);
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const th = 'border border-[#2D3831]/10 bg-[#EDEBE8] px-3 py-4 text-center text-base font-semibold text-[#0F4C3A]';
  const td = 'border border-[#2D3831]/10 px-3 py-3 text-sm align-middle';
  const tabItems = [{ key: 'All', label: 'All' }, ...types.map((t) => ({ key: t, label: t }))];

  return (
    <div>
      <h1 className="text-right text-[26px] uppercase tracking-wide sm:text-4xl md:text-6xl">Products Management</h1>

      <div className="mt-4 flex flex-wrap items-stretch gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto bg-white p-2">
          <SlidingTabs
            items={tabItems}
            value={type}
            onChange={(key) => {
              setType(key);
              setPage(1);
            }}
            className="flex w-max min-w-full gap-2"
            pillClassName="rounded-full bg-[#0F4C3A]"
            buttonClassName="whitespace-nowrap rounded-full px-6 py-3 text-sm uppercase tracking-wide md:text-lg"
            activeClassName="text-white"
            inactiveClassName="hover:bg-[#2D3831]/5"
          />
        </div>
        <button
          type="button"
          onClick={() => setShippingOpen(true)}
          className="flex items-center gap-2 border border-[#2D3A31] bg-white px-4 text-sm text-[#2D3A31] transition-colors hover:bg-[#2D3A31] hover:text-[#F9F6F0] md:text-base"
        >
          <Truck className="h-4 w-4" />
          Shipping Rates
        </button>
        <button
          type="button"
          onClick={() => setDiscountOpen(true)}
          className="flex items-center gap-2 border border-[#2D3A31] bg-white px-4 text-sm text-[#2D3A31] transition-colors hover:bg-[#2D3A31] hover:text-[#F9F6F0] md:text-base"
        >
          <BadgePercent className="h-4 w-4" />
          Add Discount
        </button>
        <button
          type="button"
          onClick={() => setForm({ mode: 'add' })}
          className="flex items-center gap-2 bg-[#2D3A31] px-4 text-sm text-[#F9F6F0] transition-opacity hover:opacity-90 md:text-base"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <div className="mt-4 bg-white p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 key={type} className="admin-fade text-2xl uppercase tracking-wide md:text-4xl">
            {type === 'All' ? 'All Products' : type}
          </h2>
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by stock"
              className="h-12 border border-[#2D3831]/60 bg-white px-3 text-sm outline-none focus:border-[#2D3A31]"
            >
              <option value="">Show All</option>
              <option value="out">Out of Stock</option>
              <option value="low">Low Stock (under 50)</option>
              <option value="high">High Stock (50 or more)</option>
            </select>
            <select
              value={discountFilter}
              onChange={(e) => {
                setDiscountFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by discount"
              className="h-12 border border-[#2D3831]/60 bg-white px-3 text-sm outline-none focus:border-[#2D3A31]"
            >
              <option value="">Show All Items</option>
              <option value="yes">Discounted Items</option>
              <option value="no">Not Discounted</option>
            </select>
            <select
              value={stockSort}
              onChange={(e) => {
                setStockSort(e.target.value);
                setPage(1);
              }}
              aria-label="Sort by stock"
              className="h-12 border border-[#2D3831]/60 bg-white px-3 text-sm outline-none focus:border-[#2D3A31]"
            >
              <option value="">Default Order</option>
              <option value="stock-asc">Stock: Lowest to Highest</option>
              <option value="stock-desc">Stock: Highest to Lowest</option>
            </select>
            <div className="relative min-w-[200px] flex-1 md:w-72 md:flex-none">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search"
                className="h-12 w-full border border-[#2D3831]/60 bg-white pl-3 pr-10 text-sm outline-none focus:border-[#2D3A31]"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {error && <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Product Name</th>
                <th className={th}>Type</th>
                <th className={th}>Price</th>
                <th className={th}>Stock</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody key={animKey} className="admin-fade">
              {data.products.map((p, i) => (
                <tr key={p.id} className="admin-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => setViewId(p.id)}
                      className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-70"
                    >
                      <img src={p.image} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-[#EBE5DE] object-cover" />
                      <span className="min-w-0">
                        {p.name}
                        {p.status === 'Inactive' && (
                          <span className="ml-2 border border-[#2D3831]/40 px-1.5 py-0.5 text-[10px] uppercase text-[#2D3831]/60">
                            Inactive
                          </span>
                        )}
                      </span>
                    </button>
                  </td>
                  <td className={`${td} text-center`}>{p.category}</td>
                  <td className={`${td} text-center`}>
                    {p.discountPercent > 0 ? (
                      <span className="inline-flex flex-wrap items-baseline justify-center gap-x-2">
                        <span className="text-xs text-[#2D3831]/50 line-through">{money(p.price)}</span>
                        <span className="bg-[#2D3A31] px-1.5 py-0.5 text-[10px] tracking-widest text-[#F9F6F0]">-{p.discountPercent}%</span>
                        <span>{money(p.discountedPrice)}</span>
                      </span>
                    ) : (
                      money(p.price)
                    )}
                  </td>
                  <td className={`${td} text-center`}>
                    <span
                      className={`inline-block min-w-[3.5rem] rounded-full px-3 py-1 text-xs font-bold transition-colors duration-300 ${
                        p.stock <= 0
                          ? 'bg-red-100 text-[#B3261E]'
                          : p.stock < 50
                            ? 'bg-yellow-100 text-[#8A6A00]'
                            : 'bg-green-100 text-[#2D6A4F]'
                      }`}
                    >
                      {p.stock <= 0 ? 'Out of stock' : p.stock}
                    </span>
                    {p.reserved > 0 && <span className="mt-1 block text-[11px] text-[#2D3831]/60">{p.reserved} reserved</span>}
                  </td>
                  <td className={td}>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p.id)}
                        className="border border-[#2D3831]/60 px-5 py-2 text-sm text-[#6B4F3A] transition-colors hover:bg-[#2D3A31] hover:text-[#F9F6F0]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setStockFor(p)}
                        className="border border-[#2D6A4F] px-5 py-2 text-sm text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10"
                      >
                        Adjust Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(p)}
                        className="border border-[#B3261E] px-5 py-2 text-sm text-[#B3261E] transition-colors hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && data.products.length === 0 && (
                <tr>
                  <td colSpan={5} className={`${td} py-16 text-center text-[#2D3831]/60`}>
                    No products found.
                  </td>
                </tr>
              )}
              {loading && data.products.length === 0 && (
                <tr>
                  <td colSpan={5} className={`${td} py-16 text-center text-[#2D3831]/60`}>
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-6">
          <span className="text-xs text-[#2D3831]/60">
            Page {data.page || page} of {data.pages}
          </span>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" className="p-2 text-[#6B4F3A] transition-opacity disabled:opacity-30">
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page" className="p-2 text-[#6B4F3A] transition-opacity disabled:opacity-30">
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      </div>

      <DiscountTable version={discountVersion} />

      {shippingOpen && <ShippingRatesModal onClose={() => setShippingOpen(false)} onSaved={() => setShippingOpen(false)} />}
      {stockFor && (
        <StockModal
          product={stockFor}
          onClose={() => setStockFor(null)}
          onDone={() => {
            setStockFor(null);
            load();
          }}
        />
      )}
      {discountOpen && (
        <AddDiscountModal
          onClose={() => setDiscountOpen(false)}
          onCreated={() => {
            setDiscountOpen(false);
            setDiscountVersion((v) => v + 1);
            load();
          }}
        />
      )}
      {form && (
        <ProductFormModal
          key={form.product?.id || 'new'}
          mode={form.mode}
          categoryLock={type !== 'All' ? type : ''}
          types={types}
          initial={form.product}
          featuredCount={data.featuredCount || 0}
          onClose={closeForm}
          onSaved={afterSave}
        />
      )}
      {viewId && !form && <ProductModal productId={viewId} onBack={() => setViewId(null)} onEdit={(p) => openEdit(p.id)} />}
      {deleting && (
        <ReasonDialog
          title="Delete product?"
          message={`${deleting.name} will be moved to the Archive, where you can restore it or delete it permanently. It will disappear from the store and from customers' carts.`}
          reasons={deleteReasons}
          confirmLabel="Delete"
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
