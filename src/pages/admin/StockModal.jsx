import { useEffect, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { adminAdjustStock } from '../../api';
import { ConfirmModal, useToast } from './AdminUI';

export default function StockModal({ product, onClose, onDone }) {
  const toast = useToast();
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('1');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirming) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, confirming]);

  const value = Number(amount);
  const remove = mode === 'remove';
  const valid = Number.isInteger(value) && value >= 1 && value <= 100000 && (!remove || value <= product.stock);
  const newStock = product.stock + (remove ? -value : value);

  const step = (delta) => {
    const next = Math.min(100000, Math.max(1, (Number(amount) || 0) + delta));
    setAmount(String(next));
    setError('');
  };

  const submit = async () => {
    setBusy(true);
    try {
      await adminAdjustStock(product.id, value, mode);
      toast(remove ? `Removed ${value} stock from ${product.name}.` : `Added ${value} stock to ${product.name}.`);
      onDone();
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
        className="admin-modal relative w-full max-w-sm bg-white px-8 py-8 shadow-2xl"
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#2D3831]/60 hover:bg-[#2D3831]/5">
          <X className="h-4 w-4" />
        </button>
        <h2 className="pr-10 text-2xl uppercase tracking-[0.08em]">Adjust Stock</h2>

        <div className="mt-5 flex items-center gap-4">
          <img src={product.image} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-[#EBE5DE] object-cover" />
          <div className="min-w-0">
            <p className="text-lg leading-tight text-[#2D3A31]">{product.name}</p>
            <p className="mt-1 text-xs text-[#2D3831]/70">Current stock: {product.stock}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2" role="group" aria-label="Adjustment type">
          {[
            { key: 'add', label: 'Add stock' },
            { key: 'remove', label: 'Remove stock' },
          ].map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                setMode(o.key);
                setError('');
              }}
              aria-pressed={mode === o.key}
              className={`border px-3 py-3 text-sm transition-colors duration-200 ${
                mode === o.key
                  ? o.key === 'add'
                    ? 'border-[#2D6A4F] bg-[#2D6A4F] text-white'
                    : 'border-[#B3261E] bg-[#B3261E] text-white'
                  : 'border-[#2D3831]/40 hover:bg-[#2D3831]/5'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm text-[#2D3A31]">
          {remove ? 'How many to remove?' : 'How many to add?'}
          <div className="mt-1 flex">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Decrease"
              className="flex h-12 w-12 items-center justify-center border border-r-0 border-[#8A6A4F]/70 transition-colors hover:bg-[#2D3831]/5"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              inputMode="numeric"
              className="h-12 min-w-0 flex-1 border border-[#8A6A4F]/70 text-center text-lg outline-none focus:border-[#2D3A31]"
            />
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Increase"
              className="flex h-12 w-12 items-center justify-center border border-l-0 border-[#8A6A4F]/70 transition-colors hover:bg-[#2D3831]/5"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </label>
        {valid && <p className="mt-2 text-xs text-[#2D3831]/70">New stock will be {newStock}.</p>}
        {remove && value > product.stock && (
          <p className="mt-2 text-xs text-[#B3261E]">You can only remove up to {product.stock}.</p>
        )}

        {error && <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="border border-[#2D3831]/40 px-6 py-3 text-sm transition-colors hover:bg-[#2D3831]/5">
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              valid
                ? setConfirming(true)
                : setError(remove && value > product.stock ? `You can only remove up to ${product.stock}.` : 'Enter a whole number from 1 to 100,000.')
            }
            className={`border px-6 py-3 text-sm transition-colors ${
              remove ? 'border-[#B3261E] text-[#B3261E] hover:bg-red-50' : 'border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F]/10'
            }`}
          >
            {remove ? 'Remove Stock' : 'Add Stock'}
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmModal
          title={remove ? 'Remove stock?' : 'Add stock?'}
          message={`${value} unit${value === 1 ? '' : 's'} will be ${remove ? 'removed from' : 'added to'} ${product.name}. New stock: ${newStock}.`}
          confirmLabel={remove ? 'Remove' : 'Add'}
          danger={remove}
          busy={busy}
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
