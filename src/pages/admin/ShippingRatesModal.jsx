import { useEffect, useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import { fetchShippingRates, adminSaveShippingRates } from '../../api';
import { ConfirmModal, useToast } from './AdminUI';

const money = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const groups = ['All', 'Luzon', 'Visayas', 'Mindanao'];

const actions = [
  { key: 'set', label: 'Set to (₱)' },
  { key: 'add', label: 'Increase by (₱)' },
  { key: 'sub', label: 'Decrease by (₱)' },
  { key: 'pct-up', label: 'Increase by (%)' },
  { key: 'pct-down', label: 'Decrease by (%)' },
];

const cleanAmount = (v) => {
  const cleaned = v.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole.slice(0, 5)}.${rest.join('').slice(0, 2)}` : whole.slice(0, 5);
};

export default function ShippingRatesModal({ onClose, onSaved }) {
  const toast = useToast();
  const [rates, setRates] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');
  const [selected, setSelected] = useState(() => new Set());
  const [bulkAction, setBulkAction] = useState('set');
  const [bulkValue, setBulkValue] = useState('');
  const [sameValue, setSameValue] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchShippingRates()
      .then(({ rates: list }) => setRates(list))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirm) setConfirm('discard');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rates.filter((r) => (group === 'All' || r.group === group) && (!q || r.region.toLowerCase().includes(q)));
  }, [rates, search, group]);

  const valueOf = (r) => (draft[r.region_code] !== undefined ? draft[r.region_code] : String(r.rate));
  const changed = rates.filter((r) => draft[r.region_code] !== undefined && Number(draft[r.region_code]) !== r.rate);
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.region_code));

  const setValue = (code, value) => {
    setDraft((d) => ({ ...d, [code]: value }));
    setError('');
  };

  const toggle = (code) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShownSelected) shown.forEach((r) => next.delete(r.region_code));
      else shown.forEach((r) => next.add(r.region_code));
      return next;
    });
  };

  const selectGroup = (g) => {
    setSelected(new Set(rates.filter((r) => r.group === g).map((r) => r.region_code)));
  };

  const applyBulk = () => {
    const amount = Number(bulkValue);
    if (bulkValue === '' || !Number.isFinite(amount)) return setError('Enter an amount to apply.');
    const next = { ...draft };
    for (const r of rates) {
      if (!selected.has(r.region_code)) continue;
      const current = Number(valueOf(r));
      let value;
      if (bulkAction === 'set') value = amount;
      else if (bulkAction === 'add') value = current + amount;
      else if (bulkAction === 'sub') value = current - amount;
      else if (bulkAction === 'pct-up') value = current * (1 + amount / 100);
      else value = current * (1 - amount / 100);
      value = Math.min(10000, Math.max(0, Math.round(value * 100) / 100));
      next[r.region_code] = String(value);
    }
    setDraft(next);
    setError('');
    setBulkValue('');
  };

  const applySame = () => {
    if (selected.size === 0) return setError('Tick the regions you want first, or use the Select buttons.');
    const amount = Number(sameValue);
    if (sameValue === '' || !Number.isFinite(amount) || amount < 0 || amount > 10000) {
      return setError('Enter a rate from 0 to 10,000.');
    }
    const value = String(Math.round(amount * 100) / 100);
    const next = { ...draft };
    for (const r of rates) if (selected.has(r.region_code)) next[r.region_code] = value;
    setDraft(next);
    setError('');
    setSameValue('');
  };

  const requestSave = () => {
    for (const r of changed) {
      const v = Number(draft[r.region_code]);
      if (draft[r.region_code] === '' || !Number.isFinite(v) || v < 0 || v > 10000) {
        return setError(`Enter a rate from 0 to 10,000 for ${r.region}.`);
      }
    }
    if (changed.length === 0) return setError('You have not changed any rates.');
    setConfirm('save');
  };

  const save = async () => {
    setBusy(true);
    try {
      await adminSaveShippingRates(changed.map((r) => ({ region_code: r.region_code, rate: Number(draft[r.region_code]) })));
      toast(`Shipping rates updated for ${changed.length} region${changed.length === 1 ? '' : 's'}.`);
      onSaved();
    } catch (err) {
      setConfirm(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const tryClose = () => (changed.length ? setConfirm('discard') : onClose());

  return (
    <div className="admin-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={tryClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="admin-modal relative flex max-h-[94vh] w-full max-w-3xl flex-col bg-white px-6 py-8 shadow-2xl sm:px-10"
      >
        <button type="button" onClick={tryClose} aria-label="Close" className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-[#2D3831]/60 hover:bg-[#2D3831]/5">
          <X className="h-4 w-4" />
        </button>
        <h2 className="pr-12 text-3xl uppercase tracking-[0.1em]">Shipping Rates</h2>
        <p className="mt-1 text-sm text-[#2D3831]/70">
          Charged once per order, based on the delivery region. Set 0 for free shipping.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search regions"
              className="h-11 w-full border border-[#2D3831]/50 bg-white pl-3 pr-9 text-sm outline-none focus:border-[#2D3A31]"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>
          <div className="flex gap-1" role="group" aria-label="Island group">
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                aria-pressed={group === g}
                className={`h-11 border px-3 text-sm transition-colors duration-200 ${
                  group === g ? 'border-[#0F4C3A] bg-[#0F4C3A] text-white' : 'border-[#2D3831]/40 hover:bg-[#2D3831]/5'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border border-[#0F4C3A]/30 bg-[#F3F8F5] px-3 py-3 text-sm">
          <span className="text-[#0F4C3A]">Same rate for the selected regions:</span>
          <div className="relative w-28">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#2D3831]/60">₱</span>
            <input
              value={sameValue}
              onChange={(e) => setSameValue(cleanAmount(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && applySame()}
              inputMode="decimal"
              placeholder="0"
              aria-label="Same rate for selected regions"
              className="h-10 w-full border border-[#2D3831]/50 bg-white pl-6 pr-2 text-right text-sm outline-none focus:border-[#2D3A31]"
            />
          </div>
          <button
            type="button"
            onClick={applySame}
            disabled={selected.size === 0}
            className="h-10 border border-[#0F4C3A] px-4 text-sm text-[#0F4C3A] transition-colors hover:bg-[#0F4C3A] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#0F4C3A]"
          >
            {selected.size === 0 ? 'Select regions below first' : `Apply to ${selected.size} selected`}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 bg-[#FAF6EF] px-3 py-3 text-sm">
          <span className="text-[#2D3831]/70">Select:</span>
          {['Luzon', 'Visayas', 'Mindanao'].map((g) => (
            <button key={g} type="button" onClick={() => selectGroup(g)} className="border border-[#2D3831]/30 bg-white px-2.5 py-1 text-xs transition-colors hover:bg-[#2D3831]/5">
              Select {g}
            </button>
          ))}
          <button type="button" onClick={() => setSelected(new Set(rates.map((r) => r.region_code)))} className="border border-[#2D3831]/30 bg-white px-2.5 py-1 text-xs transition-colors hover:bg-[#2D3831]/5">
            Select all
          </button>
          {selected.size > 0 && (
            <button type="button" onClick={() => setSelected(new Set())} className="px-2 py-1 text-xs text-[#B3261E] hover:underline">
              Clear ({selected.size})
            </button>
          )}
          {selected.size > 0 && (
            <div className="admin-fade flex w-full flex-wrap items-center gap-2 pt-1">
              <span className="text-[#2D3831]/70">Or adjust the selected:</span>
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} aria-label="Bulk action" className="h-10 border border-[#2D3831]/50 bg-white px-2 text-sm outline-none focus:border-[#2D3A31]">
                {actions.map((a) => (
                  <option key={a.key} value={a.key}>{a.label}</option>
                ))}
              </select>
              <input
                value={bulkValue}
                onChange={(e) => setBulkValue(cleanAmount(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && applyBulk()}
                inputMode="decimal"
                placeholder="Amount"
                aria-label="Bulk amount"
                className="h-10 w-28 border border-[#2D3831]/50 bg-white px-3 text-sm outline-none focus:border-[#2D3A31]"
              />
              <button type="button" onClick={applyBulk} className="h-10 border border-[#2D6A4F] px-4 text-sm text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10">
                Apply to {selected.size} region{selected.size === 1 ? '' : 's'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto border border-[#2D3831]/15">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-[#EDEBE8]">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input type="checkbox" checked={allShownSelected} onChange={toggleAll} disabled={shown.length === 0} aria-label="Select all shown" className="h-4 w-4 accent-[#2D3A31]" />
                </th>
                <th className="px-3 py-3 text-left font-normal">Region</th>
                <th className="px-3 py-3 text-left font-normal">Island group</th>
                <th className="px-3 py-3 text-right font-normal">Shipping rate</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const isChanged = draft[r.region_code] !== undefined && Number(draft[r.region_code]) !== r.rate;
                return (
                  <tr key={r.region_code} className={`border-t border-[#2D3831]/10 transition-colors duration-300 ${isChanged ? 'bg-yellow-50' : selected.has(r.region_code) ? 'bg-[#2D3831]/5' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.has(r.region_code)} onChange={() => toggle(r.region_code)} aria-label={`Select ${r.region}`} className="h-4 w-4 accent-[#2D3A31]" />
                    </td>
                    <td className="px-3 py-2">{r.region}</td>
                    <td className="px-3 py-2 text-[#2D3831]/70">{r.group}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        {isChanged && <span className="text-[11px] text-[#2D3831]/50 line-through">{money(r.rate)}</span>}
                        <div className="relative w-28">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#2D3831]/60">₱</span>
                          <input
                            value={valueOf(r)}
                            onChange={(e) => setValue(r.region_code, cleanAmount(e.target.value))}
                            inputMode="decimal"
                            aria-label={`Rate for ${r.region}`}
                            className="h-10 w-full border border-[#2D3831]/40 bg-white pl-6 pr-2 text-right text-sm outline-none focus:border-[#2D3A31]"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && shown.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-[#2D3831]/60">No regions found.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-[#2D3831]/60">Loading...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {error && <p role="alert" className="admin-fade mt-3 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#2D3831]/60">{changed.length} unsaved change{changed.length === 1 ? '' : 's'}</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setDraft({}); setError(''); }} disabled={changed.length === 0} className="border border-[#2D3831]/40 px-5 py-3 text-sm transition-colors hover:bg-[#2D3831]/5 disabled:opacity-40">
              Reset
            </button>
            <button type="button" onClick={tryClose} className="border border-[#B3261E] px-5 py-3 text-sm text-[#B3261E] transition-colors hover:bg-red-50">
              Cancel
            </button>
            <button type="button" onClick={requestSave} disabled={changed.length === 0} className="border border-[#2D6A4F] px-5 py-3 text-sm text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10 disabled:opacity-40">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {confirm === 'save' && (
        <ConfirmModal
          title="Save shipping rates?"
          message={`${changed.length} region${changed.length === 1 ? '' : 's'} will get new rates. Customers will be charged the new rates at checkout right away.`}
          confirmLabel="Save"
          busy={busy}
          onConfirm={save}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'discard' && (
        <ConfirmModal
          title="Discard changes?"
          message="Your unsaved rate changes will be lost."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          danger
          onConfirm={onClose}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
