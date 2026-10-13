import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { adminCreateAdmin } from '../../api';
import { Backdrop, ConfirmModal, useToast } from './AdminUI';
import { cleanPhone, validPhone, validName, PHONE_ERROR, NAME_ERROR } from '../../utils/validate';

const fieldClass =
  'mt-1 h-11 w-full border border-[#8A6A4F]/70 bg-white px-3 text-sm outline-none transition-colors focus:border-[#2D3A31]';

const passwordChecks = (pw) => [
  { label: '8 to 20 characters', ok: pw.length >= 8 && pw.length <= 20 },
  { label: 'At least one uppercase letter', ok: /[A-Z]/.test(pw) },
  { label: 'At least one lowercase letter', ok: /[a-z]/.test(pw) },
  { label: 'At least one number', ok: /\d/.test(pw) },
];

export default function AddAdminModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const checks = passwordChecks(form.password);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError('');
  };

  const validate = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password || !form.confirm) return 'Fill in all the fields.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Enter a valid email address.';
    if (!validName(form.name)) return NAME_ERROR;
    if (!validPhone(form.phone)) return PHONE_ERROR;
    if (!checks.every((c) => c.ok)) return "The password doesn't meet all the requirements.";
    if (form.password !== form.confirm) return 'Passwords do not match.';
    return '';
  };

  const create = async () => {
    setBusy(true);
    try {
      await adminCreateAdmin({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      toast(`Admin account for ${form.name.trim()} was created.`);
      onCreated();
    } catch (err) {
      setConfirming(false);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Backdrop onClose={confirming ? () => setConfirming(false) : onClose}>
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#2D3831]/60 hover:bg-[#2D3831]/5">
        <X className="h-4 w-4" />
      </button>
      <h2 className="pr-10 text-2xl uppercase tracking-[0.08em]">Add Admin Account</h2>

      <div className="mt-5 space-y-4">
        <label className="block text-sm text-[#2D3A31]">
          Full name
          <input value={form.name} onChange={set('name')} autoComplete="off" className={fieldClass} />
        </label>
        <label className="block text-sm text-[#2D3A31]">
          Email address
          <input type="email" value={form.email} onChange={set('email')} autoComplete="off" className={fieldClass} />
        </label>
        <label className="block text-sm text-[#2D3A31]">
          Phone number
          <input type="tel" inputMode="tel" maxLength={13} value={form.phone} onChange={(e) => { setForm((f) => ({ ...f, phone: cleanPhone(e.target.value) })); setError(''); }} placeholder="09XXXXXXXXX or +639XXXXXXXXX" autoComplete="off" className={fieldClass} />
        </label>
        <label className="block text-sm text-[#2D3A31]">
          Password
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" className={fieldClass} />
        </label>
        <ul className="grid gap-1.5 text-xs sm:grid-cols-2" aria-label="Password requirements">
          {checks.map((c) => (
            <li key={c.label} className={`flex items-center gap-2 transition-colors duration-300 ${c.ok ? 'text-[#2D3A31]' : 'text-[#2D3831]/50'}`}>
              <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${c.ok ? 'border-[#2D3A31] bg-[#2D3A31] text-[#F9F6F0]' : 'border-[#2D3831]/40'}`}>
                {c.ok && <Check className="h-2.5 w-2.5 stroke-[3]" />}
              </span>
              {c.label}
            </li>
          ))}
        </ul>
        <label className="block text-sm text-[#2D3A31]">
          Confirm password
          <input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" className={fieldClass} />
        </label>
      </div>

      {error && <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="border border-[#2D3831]/40 px-6 py-3 text-sm transition-colors hover:bg-[#2D3831]/5">
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
          Create
        </button>
      </div>

      {confirming && (
        <ConfirmModal
          title="Create admin account?"
          message={`${form.name.trim()} (${form.email.trim()}) will have full admin access.`}
          confirmLabel="Create"
          busy={busy}
          onConfirm={create}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Backdrop>
  );
}
