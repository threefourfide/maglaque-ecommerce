import { useEffect, useMemo, useState, useCallback } from 'react';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  adminFetchProductsLite,
  adminCreateDiscount,
  adminUpdateDiscount,
  adminFetchDiscounts,
  adminSetDiscountEnabled,
  adminDeleteDiscount,
} from '../../api';
import { ConfirmModal, useLive, useToast } from './AdminUI';
import { money } from './ProductSummary';

const fieldClass =
  'mt-1 h-11 w-full border border-[#8A6A4F]/70 bg-white px-3 text-sm outline-none transition-colors focus:border-[#2D3A31]';

const PERCENT_PRESETS = [5, 10, 20, 30, 50, 70, 80];

const dateLabel = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const statusColor = {
  Active: 'text-[#2D6A4F]',
  Scheduled: 'text-[#2F6F8F]',
  Expired: 'text-[#2D3831]/50',
  Disabled: 'text-[#B3261E]',
};

const todayValue = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const addYears = (value, years) => {
  const d = new Date(`${value}T00:00:00`);
  d.setFullYear(d.getFullYear() + years);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const startOfDay = (value) => new Date(`${value}T00:00:00`);
const endOfDay = (value) => new Date(`${value}T23:59:59`);

const dateValue = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function AddDiscountModal({ discount, onClose, onCreated }) {
  const editing = !!discount;
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(discount?.name || '');
  const [type, setType] = useState(discount?.type || 'product');
  const [application, setApplication] = useState(discount?.code ? 'code' : 'automatic');
  const [code, setCode] = useState(discount?.code || '');
  const [shippingMode, setShippingMode] = useState(discount?.shippingMode || 'free');
  const [minSpend, setMinSpend] = useState(discount?.minSpend ? String(discount.minSpend) : '');
  const initialPercent = discount && !(discount.type === 'shipping' && discount.shippingMode === 'free') ? String(discount.percent) : '';
  const [percent, setPercent] = useState(initialPercent);
  const [percentMode, setPercentMode] = useState(
    initialPercent === '' ? '' : PERCENT_PRESETS.includes(Number(initialPercent)) ? initialPercent : 'other'
  );
  const [start, setStart] = useState(discount ? dateValue(discount.startDate) : todayValue());
  const [end, setEnd] = useState(discount ? dateValue(discount.endDate) : '');
  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminFetchProductsLite()
      .then(({ products: list }) => {
        setProducts(list);
        if (discount) setSelected(new Set((discount.productIds || []).filter((id) => list.some((p) => p.id === id))));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [discount]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirming) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, confirming]);

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) => (category === 'All' || p.category === category) && (!q || p.name.toLowerCase().includes(q))
    );
  }, [products, search, category]);

  const allShownSelected = shown.length > 0 && shown.every((p) => selected.has(p.id));

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError('');
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShownSelected) shown.forEach((p) => next.delete(p.id));
      else shown.forEach((p) => next.add(p.id));
      return next;
    });
    setError('');
  };

  const isShipping = type === 'shipping';
  const usesCode = !isShipping && application === 'code';

  const validate = () => {
    if (!name.trim()) return isShipping ? 'Enter a promo name.' : 'Enter a discount name.';
    if (usesCode && !/^[A-Z0-9_-]{3,32}$/.test(code.trim().toUpperCase())) {
      return 'Enter a discount code using 3 to 32 letters, numbers, hyphens, or underscores.';
    }
    const pct = Number(percent);
    if ((!isShipping || shippingMode === 'percent') && (!percent || !Number.isInteger(pct) || pct < 1 || pct > 99)) {
      return isShipping ? 'Shipping discount must be a whole number from 1 to 99.' : 'Deduction must be a whole number from 1 to 99.';
    }
    if (!isShipping && selected.size === 0) return 'Choose at least one product.';
    if (!start || !end) return 'Choose the start and end dates.';
    const today = todayValue();
    const latest = addYears(today, 5);
    if (start.length !== 10 || end.length !== 10 || Number(start.slice(0, 4)) < 2020 || Number(end.slice(0, 4)) < 2020) {
      return 'Enter a valid date.';
    }
    if (!editing && start < today) return "The start date can't be in the past.";
    if (end < start) return 'The end date must be on or after the start date.';
    if (!editing && end < today) return 'The end date has already passed.';
    if (start > latest || end > latest) return 'Dates can be at most 5 years from today.';
    return '';
  };

  const create = async () => {
    setBusy(true);
    try {
      const call = editing ? (body) => adminUpdateDiscount(discount.id, body) : adminCreateDiscount;
      await call({
        type,
        name: name.trim(),
        ...(isShipping
          ? { shippingMode, percent: Number(percent), minSpend: minSpend === '' ? 0 : Number(minSpend) }
          : { percent: Number(percent), productIds: [...selected], code: usesCode ? code.trim().toUpperCase() : '' }),
        startDate: startOfDay(start).toISOString(),
        endDate: endOfDay(end).toISOString(),
      });
      toast(`${isShipping ? 'Shipping promo' : 'Discount'} ${name.trim()} was ${editing ? 'updated' : 'created'}.`);
      onCreated();
    } catch (err) {
      setConfirming(false);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="admin-modal relative max-h-[94vh] w-full max-w-2xl overflow-y-auto bg-white px-6 py-8 shadow-2xl sm:px-10"
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-[#2D3831]/60 hover:bg-[#2D3831]/5">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-center text-3xl uppercase tracking-[0.1em]">{editing ? 'Edit Discount' : 'Add Discount'}</h2>

        <div className="mt-5 grid grid-cols-2 gap-2" role="group" aria-label="Discount type">
          {[
            { key: 'product', label: 'Product discount' },
            { key: 'shipping', label: 'Shipping promo' },
          ].map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                setType(o.key);
                setError('');
              }}
              disabled={editing}
              aria-pressed={type === o.key}
              className={`border px-3 py-3 text-sm transition-colors duration-200 disabled:cursor-not-allowed ${
                type === o.key ? 'border-[#0F4C3A] bg-[#0F4C3A] text-white' : 'border-[#2D3831]/40 hover:bg-[#2D3831]/5 disabled:opacity-40 disabled:hover:bg-transparent'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-[#2D3A31]">
            {isShipping ? 'Promo name' : 'Discount name'}
            <input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} maxLength={80} placeholder={isShipping ? 'e.g. Free Shipping Week' : 'e.g. Holiday Sale'} className={fieldClass} />
          </label>
          {!isShipping && (
            <label className="block text-sm text-[#2D3A31]">
              Discount application
              <select
                value={application}
                onChange={(e) => {
                  setApplication(e.target.value);
                  setError('');
                }}
                className={fieldClass}
              >
                <option value="automatic">Automatic</option>
                <option value="code">Customer Input</option>
              </select>
              {usesCode && <span className="mt-1 block text-xs text-[#2D3831]/60">Customers enter a code at checkout.</span>}
            </label>
          )}
          {usesCode && (
            <label className="admin-fade block text-sm text-[#2D3A31]">
              Discount code
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32));
                  setError('');
                }}
                maxLength={32}
                placeholder="e.g. ELLE10"
                className={fieldClass}
              />
            </label>
          )}
          {isShipping && (
            <label className="admin-fade block text-sm text-[#2D3A31]">
              Benefit
              <select value={shippingMode} onChange={(e) => { setShippingMode(e.target.value); setError(''); }} className={fieldClass}>
                <option value="free">Free shipping</option>
                <option value="percent">Shipping fee discount (%)</option>
              </select>
            </label>
          )}
          {(!isShipping || shippingMode === 'percent') && (
            <label className="admin-fade block text-sm text-[#2D3A31]">
              {isShipping ? 'Shipping fee deduction (%)' : 'Deduction (%)'}
              <select
                value={percentMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setPercentMode(mode);
                  setPercent(mode === 'other' ? '' : mode);
                  setError('');
                }}
                className={fieldClass}
              >
                <option value="">Select a percentage</option>
                {PERCENT_PRESETS.map((n) => (
                  <option key={n} value={String(n)}>{n}%</option>
                ))}
                <option value="other">Others (type a number)</option>
              </select>
              {percentMode === 'other' && (
                <div className="admin-fade relative">
                  <input
                    value={percent}
                    onChange={(e) => { setPercent(e.target.value.replace(/\D/g, '').slice(0, 2)); setError(''); }}
                    inputMode="numeric"
                    placeholder="1 to 99"
                    aria-label="Custom percentage"
                    className={`${fieldClass} pr-9`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm text-[#2D3831]/60">%</span>
                </div>
              )}
            </label>
          )}
          {isShipping && (
            <label className="admin-fade block text-sm text-[#2D3A31]">
              Minimum spend (optional)
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm text-[#2D3831]/60">₱</span>
                <input
                  value={minSpend}
                  onChange={(e) => { setMinSpend(e.target.value.replace(/[^\d.]/g, '').slice(0, 9)); setError(''); }}
                  inputMode="decimal"
                  placeholder="e.g. 1000"
                  className={`${fieldClass} pl-7`}
                />
              </div>
            </label>
          )}
          <label className="block text-sm text-[#2D3A31]">
            Starts
            <input type="date" value={start} min={editing ? undefined : todayValue()} max={addYears(todayValue(), 5)} onChange={(e) => { setStart(e.target.value); setError(''); }} className={fieldClass} />
          </label>
          <label className="block text-sm text-[#2D3A31]">
            Ends
            <input type="date" value={end} min={start || todayValue()} max={addYears(todayValue(), 5)} onChange={(e) => { setEnd(e.target.value); setError(''); }} className={fieldClass} />
          </label>
        </div>

        {isShipping ? (
          <p className="admin-fade mt-5 bg-[#F3F8F5] px-4 py-3 text-sm text-[#0F4C3A]">
            This promo applies to the shipping fee of every region, for any order that reaches the minimum spend.
          </p>
        ) : (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[#2D3A31]">Products ({selected.size} selected)</p>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-[#2D3831]/80">
              <input type="checkbox" checked={allShownSelected} onChange={toggleAll} disabled={shown.length === 0} className="h-4 w-4 accent-[#2D3A31]" />
              Select all shown
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="relative min-w-[180px] flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
                className="h-10 w-full border border-[#2D3831]/50 bg-white pl-3 pr-9 text-sm outline-none focus:border-[#2D3A31]"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className="h-10 border border-[#2D3831]/50 bg-white px-3 text-sm outline-none focus:border-[#2D3A31]">
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          <ul className="mt-2 max-h-64 divide-y divide-[#2D3831]/10 overflow-y-auto border border-[#2D3831]/20">
            {shown.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-[#2D3831]/5">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 shrink-0 accent-[#2D3A31]" />
                  <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-md bg-[#EBE5DE] object-cover" />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span className="shrink-0 text-xs text-[#2D3831]/60">{p.category}</span>
                  <span className="shrink-0 text-xs">{money(p.price)}</span>
                </label>
              </li>
            ))}
            {!loading && shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-[#2D3831]/60">No products found.</li>}
            {loading && <li className="px-3 py-6 text-center text-sm text-[#2D3831]/60">Loading...</li>}
          </ul>
        </div>
        )}

        {error && <p role="alert" className="admin-fade mt-5 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="border border-[#B3261E] px-6 py-3 text-sm text-[#B3261E] transition-colors hover:bg-red-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const msg = validate();
              if (msg) return setError(msg);
              setConfirming(true);
            }}
            className="border border-[#2D6A4F] px-6 py-3 text-sm text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10"
          >
            {editing ? 'Save Changes' : isShipping ? 'Create Promo' : 'Create Discount'}
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmModal
          title={editing ? 'Save changes?' : isShipping ? 'Create shipping promo?' : 'Create discount?'}
          message={
            isShipping
              ? `${name.trim()} will give ${shippingMode === 'free' ? 'free shipping' : `${percent}% off the shipping fee`}${minSpend ? ` on orders of ₱${Number(minSpend).toLocaleString()} or more` : ''} from ${dateLabel(startOfDay(start))} to ${dateLabel(endOfDay(end))}.`
              : `${name.trim()} will take ${percent}% off ${selected.size} product${selected.size === 1 ? '' : 's'}${usesCode ? ` when customers enter code ${code.trim().toUpperCase()}` : ' automatically'} from ${dateLabel(startOfDay(start))} to ${dateLabel(endOfDay(end))}.`
          }
          confirmLabel={editing ? 'Save' : 'Create'}
          busy={busy}
          onConfirm={create}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

export function DiscountTable({ version }) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ discounts: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return adminFetchDiscounts({ page })
      .then((res) => {
        setData(res);
        setAnimKey((k) => k + 1);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load, version]);

  useLive(['products'], load);

  const run = async () => {
    const { kind, discount } = confirm;
    setBusy(true);
    try {
      if (kind === 'delete') {
        await adminDeleteDiscount(discount.id);
        toast(`Discount ${discount.name} was deleted.`);
        if (data.discounts.length === 1 && page > 1) setPage((p) => p - 1);
      } else {
        const enabled = kind === 'enable';
        await adminSetDiscountEnabled(discount.id, enabled);
        toast(`Discount ${discount.name} was ${enabled ? 'enabled' : 'disabled'}.`);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setConfirm(null);
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    const { kind, discount: d } = confirm;
    if (kind === 'delete') {
      return { title: 'Delete discount?', message: `${d.name} will be removed and prices go back to normal.`, label: 'Delete', danger: true };
    }
    if (kind === 'disable') {
      return { title: 'Disable discount?', message: `${d.name} will stop applying to prices right away.`, label: 'Disable', danger: true };
    }
    if (new Date(d.startDate) > new Date()) {
      return {
        title: 'Not started yet',
        message: `${d.name} is set to start on ${dateLabel(d.startDate)}, which hasn't arrived yet. Enable it anyway? Prices will change automatically when that date comes.`,
        label: 'Enable anyway',
        danger: false,
      };
    }
    return { title: 'Enable discount?', message: `${d.name} will apply to prices right away.`, label: 'Enable', danger: false };
  };

  const th = 'border border-[#2D3831]/10 bg-[#EDEBE8] px-3 py-4 text-left text-base';
  const td = 'border border-[#2D3831]/10 px-3 py-3 text-sm align-middle';
  const modal = confirm && copy();

  return (
    <div className="mt-6 bg-white p-4 md:p-6">
      <h2 className="text-2xl uppercase tracking-wide md:text-4xl">Discounts</h2>

      {error && <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              <th className={th}>Discount Name</th>
              <th className={th}>Percentage</th>
              <th className={th}>Duration</th>
              <th className={th}>Status</th>
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody key={animKey} className="admin-fade">
            {data.discounts.map((d, i) => (
              <tr key={d.id} className="admin-row" style={{ animationDelay: `${i * 40}ms` }}>
                <td className={td}>
                  {d.name}
                  {d.type === 'shipping' && (
                    <span className="ml-2 border border-[#0F4C3A] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#0F4C3A]">Shipping</span>
                  )}
                  {d.code && (
                    <span className="ml-2 border border-[#2F6F8F] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#2F6F8F]">
                      Code: {d.code}
                    </span>
                  )}
                  <span className="block text-[11px] text-[#2D3831]/60">
                    {d.type === 'shipping'
                      ? `All regions${d.minSpend ? ` · min. spend ₱${d.minSpend.toLocaleString()}` : ''}`
                      : `${d.productCount} product${d.productCount === 1 ? '' : 's'}${d.code ? ' · customer enters code' : ' · automatic'}`}
                  </span>
                </td>
                <td className={td}>
                  {d.type === 'shipping' ? (d.shippingMode === 'free' ? 'Free shipping' : `${d.percent}% off shipping`) : `${d.percent}%`}
                </td>
                <td className={`${td} whitespace-nowrap`}>{dateLabel(d.startDate)} – {dateLabel(d.endDate)}</td>
                <td className={`${td} text-xs font-bold uppercase ${statusColor[d.status]}`}>{d.status}</td>
                <td className={td}>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(d)}
                      className="border border-[#2D3831]/60 px-4 py-2 text-sm text-[#2D3831] transition-colors hover:bg-[#2D3831]/5"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: d.enabled ? 'disable' : 'enable', discount: d })}
                      className="border border-[#2D3831]/60 px-4 py-2 text-sm text-[#6B4F3A] transition-colors hover:bg-[#2D3A31] hover:text-[#F9F6F0]"
                    >
                      {d.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: 'delete', discount: d })}
                      className="border border-[#B3261E] px-4 py-2 text-sm text-[#B3261E] transition-colors hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && data.discounts.length === 0 && (
              <tr>
                <td colSpan={5} className={`${td} py-12 text-center text-[#2D3831]/60`}>No discounts yet.</td>
              </tr>
            )}
            {loading && data.discounts.length === 0 && (
              <tr>
                <td colSpan={5} className={`${td} py-12 text-center text-[#2D3831]/60`}>Loading...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-6">
        <span className="text-xs text-[#2D3831]/60">Page {data.page || page} of {data.pages}</span>
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" className="p-2 text-[#6B4F3A] transition-opacity disabled:opacity-30">
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page" className="p-2 text-[#6B4F3A] transition-opacity disabled:opacity-30">
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>

      {editing && (
        <AddDiscountModal
          key={editing.id}
          discount={editing}
          onClose={() => setEditing(null)}
          onCreated={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.label}
          danger={modal.danger}
          busy={busy}
          onConfirm={run}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
