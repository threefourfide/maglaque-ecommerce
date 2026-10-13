import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { onLive } from '../../live';

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [open, setOpen] = useState(false);

  const show = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setOpen(true);
  }, []);

  const close = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        key={toast?.id}
        open={open}
        autoHideDuration={3000}
        onClose={close}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: 2000 }}
      >
        <Alert
          onClose={close}
          severity={toast?.type === 'error' ? 'error' : 'success'}
          variant="filled"
          sx={{
            width: '100%',
            maxWidth: 420,
            fontFamily: 'inherit',
            borderRadius: 0,
            backgroundColor: toast?.type === 'error' ? '#B3261E' : '#2D3A31',
            color: '#F9F6F0',
          }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return (
    <div
      className="admin-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="admin-modal w-full max-w-md bg-white px-8 py-8 text-center shadow-2xl"
      >
        <h2 className="text-2xl uppercase tracking-[0.1em]">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#2D3831]/80">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-w-[7rem] border border-[#2D3831]/40 px-5 py-3 text-sm transition-colors hover:bg-[#2D3831]/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-w-[7rem] border px-5 py-3 text-sm transition-colors disabled:opacity-50 ${
              danger
                ? 'border-[#B3261E] text-[#B3261E] hover:bg-red-50'
                : 'border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F]/10'
            }`}
          >
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SlidingTabs({
  items,
  value,
  onChange,
  className = '',
  pillClassName = '',
  buttonClassName = '',
  activeClassName = '',
  inactiveClassName = '',
}) {
  const wrap = useRef(null);
  const refs = useRef({});
  const [box, setBox] = useState(null);
  const [animate, setAnimate] = useState(false);
  const signature = items.map((i) => i.key).join('|');

  const measure = useCallback(() => {
    const el = refs.current[value];
    if (!el) return setBox(null);
    setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
  }, [value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, signature]);

  useEffect(() => {
    refs.current[value]?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [value]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimate(true));
    const observer = new ResizeObserver(measure);
    if (wrap.current) observer.observe(wrap.current);
    document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measure]);

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 ${pillClassName} ${
          animate ? 'transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''
        }`}
        style={
          box
            ? { width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)`, opacity: 1 }
            : { opacity: 0 }
        }
      />
      {items.map((item) => (
        <button
          key={item.key}
          ref={(el) => {
            refs.current[item.key] = el;
          }}
          type="button"
          onClick={() => onChange(item.key)}
          aria-current={item.key === value ? 'page' : undefined}
          className={`relative z-10 transition-colors duration-300 ${buttonClassName} ${
            item.key === value ? activeClassName : inactiveClassName
          }`}
        >
          {item.content ?? item.label}
        </button>
      ))}
    </div>
  );
}

const fieldClass =
  'mt-1 h-11 w-full border border-[#8A6A4F]/70 bg-white px-3 text-sm outline-none transition-colors focus:border-[#2D3A31]';

export function ReasonDialog({
  title,
  message,
  reasons,
  confirmLabel,
  cancelLabel = 'Cancel',
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const submit = () => {
    if (!reason) return setLocalError('Choose a reason.');
    const final = reason === 'Others' ? other.trim() : reason;
    if (final.length < 3) return setLocalError('Type the reason.');
    setLocalError('');
    onConfirm(final);
  };

  return (
    <div className="admin-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="admin-modal max-h-[92vh] w-full max-w-md overflow-y-auto bg-white px-8 py-8 shadow-2xl"
      >
        <h2 className="text-2xl uppercase tracking-[0.08em]">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#2D3831]/80">{message}</p>
        <label className="mt-5 block text-sm text-[#2D3A31]">
          Reason
          <select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setLocalError('');
            }}
            className={fieldClass}
          >
            <option value="">Select a reason</option>
            {reasons.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        {reason === 'Others' && (
          <textarea
            value={other}
            onChange={(e) => {
              setOther(e.target.value);
              setLocalError('');
            }}
            rows={3}
            maxLength={300}
            placeholder="Type the reason"
            className="admin-fade mt-3 w-full resize-none border border-[#8A6A4F]/70 bg-white p-3 text-sm outline-none focus:border-[#2D3A31]"
          />
        )}
        {(localError || error) && (
          <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="border border-[#2D3831]/40 px-6 py-3 text-sm transition-colors hover:bg-[#2D3831]/5 disabled:opacity-50">
            {cancelLabel}
          </button>
          <button type="button" onClick={submit} disabled={busy} className="border border-[#B3261E] px-6 py-3 text-sm text-[#B3261E] transition-colors hover:bg-red-50 disabled:opacity-50">
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useLive(types, handler) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  const key = types.join('|');
  useEffect(
    () =>
      onLive((event) => {
        if (key.split('|').includes(event.type)) ref.current(event);
      }),
    [key]
  );
}

export function Backdrop({ onClose, children, z = 'z-50' }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`admin-backdrop fixed inset-0 ${z} flex items-center justify-center bg-black/50 p-4`} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="admin-modal relative max-h-[92vh] w-full max-w-lg overflow-y-auto bg-white px-6 py-8 shadow-2xl sm:px-10"
      >
        {children}
      </div>
    </div>
  );
}
