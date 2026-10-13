import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  adminFetchUsers,
  adminDeactivateUser,
  adminActivateUser,
  adminDeleteUser,
} from '../../api';
import { Backdrop, ConfirmModal, useToast, useLive } from './AdminUI';

const selectClass =
  'h-12 border border-[#2D3831]/60 bg-white px-3 text-sm text-[#2D3831] outline-none focus:border-[#2D3A31]';
const fieldClass =
  'mt-1 h-11 w-full border border-[#8A6A4F]/70 bg-white px-3 text-sm outline-none transition-colors focus:border-[#2D3A31]';

const presets = [
  { key: '24h', label: '24 hours', amount: 24, unit: 'hours' },
  { key: '3d', label: '3 days', amount: 3, unit: 'days' },
  { key: '7d', label: '7 days', amount: 7, unit: 'days' },
  { key: '1m', label: '1 month', amount: 1, unit: 'months' },
  { key: '6m', label: '6 months', amount: 6, unit: 'months' },
  { key: '1y', label: '1 year', amount: 1, unit: 'years' },
];

const units = ['hours', 'days', 'weeks', 'months', 'years'];

const deactivateReasons = ['Violation of terms', 'Suspicious activity', 'Fraudulent orders', 'Spam or abuse', 'Customer request', 'Others'];
const deleteReasons = ['Customer request', 'Duplicate account', 'Fraudulent activity', 'Violation of terms', 'Inactive account', 'Others'];

const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const endDate = (amount, unit) => {
  const n = Number(amount);
  if (!Number.isInteger(n) || n < 1) return null;
  const d = new Date();
  if (unit === 'hours') d.setHours(d.getHours() + n);
  else if (unit === 'days') d.setDate(d.getDate() + n);
  else if (unit === 'weeks') d.setDate(d.getDate() + n * 7);
  else if (unit === 'months') d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  return d;
};

function ReasonModal({ kind, user, busy, error, onConfirm, onCancel }) {
  const isDelete = kind === 'delete';
  const reasons = isDelete ? deleteReasons : deactivateReasons;
  const [duration, setDuration] = useState('24h');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('days');
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  const [localError, setLocalError] = useState('');

  const chosen = presets.find((p) => p.key === duration);
  const end = isDelete ? null : chosen ? endDate(chosen.amount, chosen.unit) : endDate(amount, unit);

  const submit = () => {
    if (!isDelete && !chosen && !end) return setLocalError('Enter how long the account will be deactivated.');
    if (!reason) return setLocalError('Choose a reason.');
    const finalReason = reason === 'Others' ? other.trim() : reason;
    if (finalReason.length < 3) return setLocalError('Type the reason.');
    setLocalError('');
    onConfirm({
      reason: finalReason,
      duration: isDelete ? undefined : chosen ? { amount: chosen.amount, unit: chosen.unit } : { amount: Number(amount), unit },
    });
  };

  return (
    <Backdrop onClose={onCancel} z="z-[70]">
      <button type="button" onClick={onCancel} aria-label="Close" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#2D3831]/60 hover:bg-[#2D3831]/5">
        <X className="h-4 w-4" />
      </button>
      <h2 className="pr-10 text-2xl uppercase tracking-[0.08em]">{isDelete ? 'Delete account?' : 'Deactivate account?'}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#2D3831]/80">
        {isDelete
          ? `Are you sure you want to delete ${user.name} (${user.email})? This can't be undone. Their saved addresses and cart are removed; past orders are kept.`
          : `Are you sure you want to deactivate ${user.name} (${user.email})? They won't be able to sign in until the time is up.`}
      </p>

      {!isDelete && (
        <div className="mt-5">
          <p className="text-sm text-[#2D3A31]">Deactivate for</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[...presets, { key: 'custom', label: 'Custom' }].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setDuration(p.key);
                  setLocalError('');
                }}
                aria-pressed={duration === p.key}
                className={`border px-3 py-3 text-sm transition-colors duration-200 ${
                  duration === p.key
                    ? 'border-[#0F4C3A] bg-[#0F4C3A] text-white'
                    : 'border-[#2D3831]/40 hover:bg-[#2D3831]/5'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {duration === 'custom' && (
            <div className="admin-fade mt-3 flex gap-3">
              <input
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setLocalError('');
                }}
                inputMode="numeric"
                placeholder="Number"
                aria-label="Duration amount"
                className={`${fieldClass} mt-0 flex-1`}
              />
              <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Duration unit" className={`${fieldClass} mt-0 flex-1`}>
                {units.map((u) => (
                  <option key={u} value={u}>{u[0].toUpperCase() + u.slice(1)}</option>
                ))}
              </select>
            </div>
          )}
          {end && (
            <p className="mt-3 text-xs text-[#2D3831]/70">
              Will be reactivated automatically on <strong>{formatDateTime(end)}</strong>.
            </p>
          )}
        </div>
      )}

      <div className="mt-5">
        <label className="block text-sm text-[#2D3A31]">
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
      </div>

      {(localError || error) && (
        <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} disabled={busy} className="border border-[#2D3831]/40 px-6 py-3 text-sm transition-colors hover:bg-[#2D3831]/5 disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={busy} className="border border-[#B3261E] px-6 py-3 text-sm text-[#B3261E] transition-colors hover:bg-red-50 disabled:opacity-50">
          {busy ? 'Please wait...' : isDelete ? 'Delete' : 'Deactivate'}
        </button>
      </div>
    </Backdrop>
  );
}

export default function AdminUsers({ currentUserId }) {
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    const params = { page };
    if (search) params.search = search;
    if (role) params.role = role;
    if (status) params.status = status;
    return adminFetchUsers(params)
      .then((res) => {
        setData(res);
        setAnimKey((k) => k + 1);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, search, role, status]);

  useEffect(() => {
    load();
  }, [load]);

  useLive(['users'], () => {
    load();
  });

  const closeModal = () => {
    setModal(null);
    setModalError('');
  };

  const runReason = async (payload) => {
    const { kind, user } = modal;
    setBusy(true);
    setModalError('');
    try {
      if (kind === 'delete') {
        await adminDeleteUser(user.id, payload.reason);
        toast(`${user.name}'s account was deleted.`);
      } else {
        await adminDeactivateUser(user.id, payload);
        toast(`${user.name}'s account was deactivated.`);
      }
      closeModal();
      if (kind === 'delete' && data.users.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const runActivate = async () => {
    const { user } = modal;
    setBusy(true);
    try {
      await adminActivateUser(user.id);
      toast(`${user.name}'s account was activated.`);
      closeModal();
      await load();
    } catch (err) {
      closeModal();
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const th = 'border border-[#2D3831]/10 bg-[#EDEBE8] px-3 py-4 text-left text-base';
  const td = 'border border-[#2D3831]/10 px-3 py-3 text-sm align-middle';

  return (
    <div>
      <h1 className="text-right text-[26px] uppercase tracking-wide sm:text-4xl md:text-6xl">User Accounts</h1>

      <div className="mt-4 bg-white p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-md flex-1">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search"
              className="h-12 w-full border border-[#2D3831]/60 bg-white pl-3 pr-10 text-sm outline-none focus:border-[#2D3A31]"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className={selectClass} aria-label="Filter by role">
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectClass} aria-label="Filter by status">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>

        {error && <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Phone Number</th>
                <th className={th}>Role</th>
                <th className={th}>Status</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody key={animKey} className="admin-fade">
              {data.users.map((u, i) => {
                const self = String(u.id) === String(currentUserId);
                return (
                  <tr key={u.id} className="admin-row" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className={td}>
                      {u.name}
                      {self && <span className="ml-2 text-xs text-[#2D3831]/50">(you)</span>}
                    </td>
                    <td className={`${td} break-all`}>{u.email}</td>
                    <td className={td}>{u.phone || '--'}</td>
                    <td className={`${td} text-xs font-bold uppercase ${u.role === 'admin' ? 'text-[#0F4C3A]' : 'text-[#8A6A3F]'}`}>
                      {u.role}
                    </td>
                    <td className={td} title={u.active ? undefined : `Reason: ${u.deactivationReason}`}>
                      <span className={`text-xs font-bold uppercase ${u.active ? 'text-[#2D6A4F]' : 'text-[#B3261E]'}`}>
                        {u.active ? 'Active' : 'Deactivated'}
                      </span>
                      {!u.active && u.deactivatedUntil && (
                        <span className="mt-0.5 block text-[11px] text-[#2D3831]/60">until {formatDateTime(u.deactivatedUntil)}</span>
                      )}
                    </td>
                    <td className={td}>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={self}
                          title={self ? "You can't change your own account" : undefined}
                          onClick={() => setModal({ kind: u.active ? 'deactivate' : 'activate', user: u })}
                          className="border border-[#2D3831]/60 px-4 py-2 text-sm text-[#6B4F3A] transition-colors hover:bg-[#2D3A31] hover:text-[#F9F6F0] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#6B4F3A]"
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          disabled={self}
                          title={self ? "You can't delete your own account" : undefined}
                          onClick={() => setModal({ kind: 'delete', user: u })}
                          className="border border-[#B3261E] px-4 py-2 text-sm text-[#B3261E] transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && data.users.length === 0 && (
                <tr>
                  <td colSpan={6} className={`${td} py-16 text-center text-[#2D3831]/60`}>No accounts found.</td>
                </tr>
              )}
              {loading && data.users.length === 0 && (
                <tr>
                  <td colSpan={6} className={`${td} py-16 text-center text-[#2D3831]/60`}>Loading...</td>
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
      </div>

      {(modal?.kind === 'deactivate' || modal?.kind === 'delete') && (
        <ReasonModal kind={modal.kind} user={modal.user} busy={busy} error={modalError} onConfirm={runReason} onCancel={closeModal} />
      )}
      {modal?.kind === 'activate' && (
        <ConfirmModal
          title="Activate account?"
          message={`${modal.user.name} will be able to sign in again right away.`}
          confirmLabel="Activate"
          busy={busy}
          onConfirm={runActivate}
          onCancel={closeModal}
        />
      )}
    </div>
  );
}
