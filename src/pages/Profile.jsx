import { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { goBack } from '../utils/nav';
import { cleanPhone, validPhone, validName, PHONE_ERROR, NAME_ERROR } from '../utils/validate';
import PhAddressFields from '../components/Phaddressfields';
import PasswordVisibilityField from '../components/PasswordVisibilityField';
import ReviewModal from '../components/ReviewModal';
import { Clock, Package, Truck, Star, Pencil, Trash2, X, MapPin, Calendar, CreditCard, Check, CheckCircle2, Camera, ArrowLeft, ShoppingBag } from 'lucide-react';

const sampleOrders = [
  {
    id: 'ELLE-1053',
    date: '2026-10-10',
    status: 'Pending',
    items: [{ name: 'Soren Minimalist Coffee Table', price: 890, quantity: 1 }],
  },
  {
    id: 'ELLE-1051',
    date: '2026-10-08',
    status: 'Processing',
    items: [{ name: 'Lumière Linen Pendant Light', price: 420, quantity: 1 }],
  },
  {
    id: 'ELLE-1046',
    date: '2026-10-05',
    status: 'Out for Delivery',
    items: [{ name: 'Kuro Ceramic Vase', price: 180, quantity: 1 }],
  },
  {
    id: 'ELLE-1042',
    date: '2026-10-02',
    status: 'To Review',
    items: [
      { name: 'Aalto Lounge Chair', price: 1250, quantity: 1 },
      { name: 'Kuro Ceramic Vase', price: 180, quantity: 2 },
    ],
  },
];

// The row of status cards on the Orders page
const statusTabs = [
  { status: 'All', label: 'All Orders', Icon: ShoppingBag },
  { status: 'Pending', label: 'Pending', Icon: Clock },
  { status: 'Processing', label: 'Processing', Icon: Package },
  { status: 'Out for Delivery', label: 'Out for Delivery', Icon: Truck },
  { status: 'To Review', label: 'To Review', Icon: Star },
];

const trackerSteps = [
  { status: 'Pending', label: 'Pending', Icon: Clock },
  { status: 'Processing', label: 'Processing', Icon: Package },
  { status: 'Out for Delivery', label: 'Out for Delivery', Icon: Truck },
  { status: 'Completed', label: 'Completed', Icon: Check },
];

// Accent colors (muted to fit the ELLE palette) - change the hex values to restyle
const ACCENT = '#2D3A31'; // dark green: active sidebar item, avatar, default badge
const inputClass =
  'w-full border border-[#2D3831]/20 bg-transparent px-4 py-3 text-sm text-[#2D3831] ' +
  'placeholder:text-[#2D3831]/40 outline-none transition-colors focus:border-[#2D3831]';

const emptyPasswordForm = { current: '', next: '', confirm: '' };

const getPasswordChecks = (pw) => [
  { label: '8 to 20 characters', ok: pw.length >= 8 && pw.length <= 20 },
  { label: 'At least one uppercase letter', ok: /[A-Z]/.test(pw) },
  { label: 'At least one lowercase letter', ok: /[a-z]/.test(pw) },
  { label: 'At least one number', ok: /\d/.test(pw) },
];
const emptyAddress = {
  name: '',
  phone: '',
  regionCode: '',
  region: '',
  provinceCode: '',
  province: '',
  cityCode: '',
  city: '',
  barangayCode: '',
  barangay: '',
  zip: '',
  street: '',
  isDefault: false,
};

const formatAddress = (a) =>
  [a.street, a.barangay, a.city, a.province, a.zip].filter(Boolean).join(', ');

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const orderTotal = (order) =>
  order.total ?? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

export default function Profile({
  user,
  orders = sampleOrders,
  onChangePassword,
  onChangePhoto,
  onMarkReceived,
  onMarkSeen,
  addresses = [],
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  onSubmitReview,
}) {
  const location = useLocation(); // Checkout can send the user here to add an address
  const navigate = useNavigate();
  const cameFromCheckout = !!location.state?.addAddress;
  const [tab, setTab] = useState(location.state?.tab || 'profile'); // profile | addresses | password | purchase
  const [editing, setEditing] = useState(location.state?.addAddress ? 'new' : null); // null | 'new' | address id
  const [addrForm, setAddrForm] = useState(
    location.state?.addAddress
      ? { ...emptyAddress, name: user?.name || '', isDefault: addresses.length === 0 }
      : emptyAddress
  );
  const [addrError, setAddrError] = useState('');
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressConfirmOpen, setAddressConfirmOpen] = useState(false);
  const addressConfirmCancelRef = useRef(null);
  const addressConfirmSubmitRef = useRef(null);
  const [addressSuccess, setAddressSuccess] = useState('');
  const addressSuccessCloseRef = useRef(null);
  const addressSuccessContinueRef = useRef(null);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [addressDeleting, setAddressDeleting] = useState(false);
  const [addressActionError, setAddressActionError] = useState('');
  const deleteCancelRef = useRef(null);
  const deleteConfirmRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [form, setForm] = useState(emptyPasswordForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);
  const passwordConfirmCancelRef = useRef(null);
  const passwordConfirmSubmitRef = useRef(null);
  const passwordSuccessCloseRef = useRef(null);
  const passwordSuccessContinueRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [showReq, setShowReq] = useState(false);
  const [receiveStep, setReceiveStep] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState('');
  const [photoMenu, setPhotoMenu] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileRef = useRef(null);
  const passwordChecks = getPasswordChecks(form.next);
  const [selectedOrderId, setSelectedOrderId] = useState(null); // order shown in the details popup
  const [reviewTarget, setReviewTarget] = useState(null); // { orderId, item } being reviewed
  const [reviewed, setReviewed] = useState({}); // "orderId::itemName" -> submitted review

  // Order details popup: close with Esc, lock page scroll while open
  useEffect(() => {
    if (!selectedOrderId) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        // close the review popup first, then the order popup
        if (reviewTarget) setReviewTarget(null);
        else setSelectedOrderId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedOrderId, reviewTarget]);

  useEffect(() => {
    if (!addressConfirmOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    addressConfirmCancelRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !addressSaving) {
        setAddressConfirmOpen(false);
      } else if (event.key === 'Tab') {
        const first = addressConfirmCancelRef.current;
        const last = addressConfirmSubmitRef.current;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [addressConfirmOpen, addressSaving]);

  useEffect(() => {
    if (!addressSuccess) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    addressSuccessContinueRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAddressSuccess('');
      } else if (event.key === 'Tab') {
        const first = addressSuccessCloseRef.current;
        const last = addressSuccessContinueRef.current;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [addressSuccess]);

  useEffect(() => {
    if (!passwordConfirmOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    passwordConfirmCancelRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) {
        setPasswordConfirmOpen(false);
      } else if (event.key === 'Tab') {
        const first = passwordConfirmCancelRef.current;
        const last = passwordConfirmSubmitRef.current;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [passwordConfirmOpen, saving]);

  useEffect(() => {
    if (!success) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    passwordSuccessContinueRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSuccess('');
      } else if (event.key === 'Tab') {
        const first = passwordSuccessCloseRef.current;
        const last = passwordSuccessContinueRef.current;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [success]);

  useEffect(() => {
    if (!addressToDelete) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    deleteCancelRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !addressDeleting) {
        setAddressToDelete(null);
        return;
      }
      if (event.key === 'Tab') {
        const first = deleteCancelRef.current;
        const last = deleteConfirmRef.current;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [addressToDelete, addressDeleting]);

  // Must be logged in to see this page
  if (!user) return <Navigate to="/auth" replace />;

  const matchesStatus = (o, status) =>
    status === 'To Review'
      ? ['Completed', 'To Review'].includes(o.status) && o.items.some((i) => !i.reviewed)
      : o.status === status;

  const isUnseen = (o) => !!o.customerSeenStatus && o.customerSeenStatus !== o.status;
  const countFor = (status) => orders.filter((o) => matchesStatus(o, status) && isUnseen(o)).length;
  const purchaseUnseen = statusTabs.reduce((n, t) => n + countFor(t.status), 0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.current || !form.next || !form.confirm) {
      return setError('Fill in all the fields.');
    }
    if (!passwordChecks.every((c) => c.ok)) {
      return setError("Your new password doesn't meet all the requirements.");
    }
    if (form.next === form.current) {
      return setError('New password must be different from the current one.');
    }
    if (form.next !== form.confirm) {
      return setError('New passwords do not match.');
    }

    setError('');
    setPasswordConfirmOpen(true);
  };

  const confirmPasswordChange = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onChangePassword?.({ currentPassword: form.current, newPassword: form.next });
      setPasswordConfirmOpen(false);
      setForm(emptyPasswordForm);
      setSuccess('Your password has been updated.');
    } catch (err) {
      setPasswordConfirmOpen(false);
      setError(err.message || 'Could not update your password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- addresses ---------- */
  const startAdd = () => {
    setAddrForm({ ...emptyAddress, name: user.name, isDefault: addresses.length === 0 });
    setAddrError('');
    setEditing('new');
  };

  const startEdit = (a) => {
    setAddrForm(Object.fromEntries(Object.keys(emptyAddress).map((k) => [k, a[k] ?? emptyAddress[k]])));
    setAddrError('');
    setEditing(a.id);
  };

  const cancelAddr = () => {
    setEditing(null);
    setAddrError('');
  };

  const handleAddrChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddrForm({ ...addrForm, [name]: type === 'checkbox' ? checked : name === 'phone' ? cleanPhone(value) : value });
    setAddrError('');
  };

  const handleAddrSubmit = (e) => {
    e.preventDefault();
    const { name, phone, region, province, city, barangay, zip, street } = addrForm;
    if (![name, phone, region, province, city, barangay, zip, street].every((v) => v.trim())) {
      return setAddrError('Fill in all the fields.');
    }
    if (!/^\d{4}$/.test(zip.trim())) {
      return setAddrError('ZIP code must be 4 digits.');
    }
    if (!validName(name)) return setAddrError(NAME_ERROR);
    if (!validPhone(phone.trim())) return setAddrError(PHONE_ERROR);
    setAddrError('');
    setAddressConfirmOpen(true);
  };

  const confirmAddressSave = async () => {
    if (addressSaving) return;
    const { name, phone, zip, street } = addrForm;
    const data = {
      ...addrForm,
      name: name.trim(),
      phone: phone.trim(),
      zip: zip.trim(),
      street: street.trim(),
    };
    setAddressSaving(true);
    try {
      if (editing === 'new') await onAddAddress?.(data);
      else await onUpdateAddress?.(editing, data);
      setAddressConfirmOpen(false);
      setEditing(null);
      setAddressSuccess(editing === 'new' ? 'Your address has been saved successfully.' : 'Your address has been updated successfully.');
    } catch (err) {
      setAddressConfirmOpen(false);
      setAddrError(err.message || 'Could not save the address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (!addressToDelete || addressDeleting) return;
    setAddressDeleting(true);
    setAddressActionError('');
    try {
      await onDeleteAddress?.(addressToDelete.id);
      setAddressToDelete(null);
    } catch (err) {
      setAddressToDelete(null);
      setAddressActionError(err.message || 'Could not delete this address. Please try again.');
    } finally {
      setAddressDeleting(false);
    }
  };

  const handleSetDefaultAddress = async (id) => {
    setAddressActionError('');
    try {
      await onSetDefaultAddress?.(id);
    } catch (err) {
      setAddressActionError(err.message || 'Could not update the default address. Please try again.');
    }
  };

  const handleReviewSubmit = async (data) => {
    const { orderId, item } = reviewTarget;
    await onSubmitReview?.({ orderId, productId: item.id, productName: item.name, ...data });
    setReviewed((prev) => ({ ...prev, [`${orderId}::${item.name}`]: data }));
    setReviewTarget(null);
  };

  const resizeImage = (file) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const scale = Math.max(size / img.width, size / img.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Choose a valid image (JPG, PNG or WEBP).'));
      };
      img.src = url;
    });

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return setPhotoError('Choose a JPG, PNG or WEBP image.');
    }
    if (file.size > 5 * 1024 * 1024) {
      return setPhotoError('Image must be 5 MB or smaller.');
    }
    setPhotoBusy(true);
    setPhotoError('');
    try {
      await onChangePhoto?.(await resizeImage(file));
    } catch (err) {
      setPhotoError(err.message || 'Could not update your photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoRemove = async () => {
    setPhotoMenu(false);
    setPhotoBusy(true);
    setPhotoError('');
    try {
      await onChangePhoto?.(null);
    } catch (err) {
      setPhotoError(err.message || 'Could not remove your photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleReceived = async (orderId) => {
    setReceiving(true);
    setReceiveError('');
    try {
      await onMarkReceived?.(orderId);
      setReceiveStep(false);
    } catch (err) {
      setReceiveError(err.message || 'Could not update your order.');
    } finally {
      setReceiving(false);
    }
  };

  /* ---------- sidebar ---------- */
  const navItem = (key, label, badge = 0) => {
    const active = tab === key;
    return (
      <button
        type="button"
        onClick={() => {
          setTab(key);
          setEditing(null);
        }}
        aria-current={active ? 'page' : undefined}
        className={`block whitespace-nowrap border-l-2 px-4 py-2.5 text-left text-sm transition-colors lg:w-full ${
          active
            ? 'font-medium'
            : 'border-transparent text-[#2D3831]/60 hover:text-[#2D3831]'
        }`}
        style={
          active
            ? { borderColor: ACCENT, color: ACCENT, backgroundColor: `${ACCENT}14` }
            : undefined
        }
      >
        <span className="flex items-center justify-between gap-2">
          {label}
          {badge > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#2D3A31] px-1 text-[10px] text-[#F9F6F0]">
              {badge}
            </span>
          )}
        </span>
      </button>
    );
  };

  /* ---------- content panels ---------- */
  const renderProfile = () => (
    <section className="border border-[#2D3831]/10 bg-white p-8">
      <h2 className="font-serif text-2xl text-[#2D3831]">Personal information</h2>

      <div className="mt-8 flex items-center gap-5">
        <div className="relative shrink-0">
          <div
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border font-serif text-3xl"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            {user.photo ? (
              <img src={user.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <button
            type="button"
            onClick={() => setPhotoMenu((v) => !v)}
            disabled={photoBusy}
            aria-label="Change profile photo"
            title="Change photo"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#F9F6F0] bg-[#2D3A31] text-[#F9F6F0] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Camera className="h-4 w-4 stroke-[1.5]" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoFile}
            className="hidden"
          />
          {photoMenu && (
            <div className="absolute left-0 top-full z-10 mt-3 w-44 border border-[#2D3831]/10 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setPhotoMenu(false);
                  fileRef.current?.click();
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-[#2D3831] hover:bg-[#2D3831]/5"
              >
                {user.photo ? 'Change photo' : 'Upload photo'}
              </button>
              {user.photo && (
                <button
                  type="button"
                  onClick={handlePhotoRemove}
                  className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Remove photo
                </button>
              )}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-xl text-[#2D3831]">{user.name}</p>
          <p className="truncate text-sm text-[#2D3831]/60">{user.email}</p>
        </div>
      </div>

      {photoError && (
        <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">
          {photoError}
        </p>
      )}

      <dl className="mt-8 space-y-5 border-t border-[#2D3831]/10 pt-6 text-sm">
        <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
          <dt className="text-xs tracking-widest text-[#2D3831]/50">NAME</dt>
          <dd className="text-[#2D3831]">{user.name}</dd>
        </div>
        <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
          <dt className="text-xs tracking-widest text-[#2D3831]/50">EMAIL</dt>
          <dd className="break-all text-[#2D3831]">{user.email}</dd>
        </div>
      </dl>
    </section>
  );

  const renderPassword = () => (
    <section className="max-w-xl border border-[#2D3831]/10 bg-white p-8">
      <h2 className="font-serif text-2xl text-[#2D3831]">Change password</h2>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <PasswordVisibilityField
          name="current"
          value={form.current}
          onChange={handleChange}
          placeholder="Current password"
          autoComplete="current-password"
          className={inputClass}
        />
        <PasswordVisibilityField
          name="next"
          value={form.next}
          onChange={handleChange}
          onFocus={() => setShowReq(true)}
          placeholder="New password"
          autoComplete="new-password"
          className={inputClass}
        />

        {showReq && (
          <ul className="grid gap-1.5 px-1 text-xs" aria-label="Password requirements">
            {passwordChecks.map((c) => (
              <li
                key={c.label}
                className={`flex items-center gap-2 transition-colors ${
                  c.ok ? 'text-[#2D3A31]' : 'text-[#2D3831]/50'
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    c.ok ? 'border-[#2D3A31] bg-[#2D3A31] text-[#F9F6F0]' : 'border-[#2D3831]/40'
                  }`}
                >
                  {c.ok && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </span>
                {c.label}
              </li>
            ))}
          </ul>
        )}
        <PasswordVisibilityField
          name="confirm"
          value={form.confirm}
          onChange={handleChange}
          placeholder="Confirm new password"
          autoComplete="new-password"
          className={inputClass}
        />

        {error && (
          <p role="alert" className="bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#2D3831] py-3 text-xs tracking-[0.2em] text-[#F9F6F0] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'SAVING...' : 'UPDATE PASSWORD'}
        </button>
      </form>
    </section>
  );

  const renderAddresses = () => (
    <section>
      {addressActionError && (
        <p role="alert" className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {addressActionError}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-2xl text-[#2D3831]">Addresses</h2>
        {editing === null && addresses.length > 0 && (
          <button
            type="button"
            onClick={startAdd}
            className="border border-[#2D3831] px-6 py-3 text-xs tracking-[0.2em] text-[#2D3831] transition-colors hover:bg-[#2D3831] hover:text-[#F9F6F0]"
          >
            ADD NEW ADDRESS
          </button>
        )}
      </div>

      {/* add / edit form */}
      {editing !== null && (
        <form
          onSubmit={handleAddrSubmit}
          noValidate
          className="mt-6 max-w-xl space-y-4 border border-[#2D3831]/10 bg-white p-8"
        >
          <p className="text-xs tracking-[0.2em] text-[#2D3831]/60">
            {editing === 'new' ? 'NEW ADDRESS' : 'EDIT ADDRESS'}
          </p>

          <input name="name" value={addrForm.name} onChange={handleAddrChange} placeholder="Full name" autoComplete="name" className={inputClass} />
          <input name="phone" type="tel" inputMode="tel" maxLength={13} value={addrForm.phone} onChange={handleAddrChange} placeholder="Phone number (09XXXXXXXXX or +639XXXXXXXXX)" autoComplete="tel" className={inputClass} />
          <PhAddressFields
            value={addrForm}
            onChange={(patch) => {
              setAddrForm((prev) => ({ ...prev, ...patch }));
              setAddrError('');
            }}
            inputClass={inputClass}
          />

          <label className="flex items-center gap-3 text-sm text-[#2D3831]">
            <input
              type="checkbox"
              name="isDefault"
              checked={addrForm.isDefault}
              onChange={handleAddrChange}
              disabled={editing !== 'new' && addrForm.isDefault}
              className="accent-[#2D3831]"
            />
            Set as default address
          </label>

          {addrError && (
            <p role="alert" className="bg-red-50 px-4 py-3 text-sm text-red-700">
              {addrError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={addressSaving}
              className="min-h-11 flex-1 bg-[#2D3831] py-3 text-xs tracking-[0.2em] text-[#F9F6F0] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {addressSaving ? 'SAVING...' : 'SAVE ADDRESS'}
            </button>
            <button
              type="button"
              onClick={cancelAddr}
              className="flex-1 border border-[#2D3831]/30 py-3 text-xs tracking-[0.2em] text-[#2D3831] transition-colors hover:border-[#2D3831]"
            >
              CANCEL
            </button>
          </div>
        </form>
      )}

      {/* empty state */}
      {editing === null && addresses.length === 0 && (
        <div className="mt-6 border border-dashed border-[#2D3831]/20 bg-white px-6 py-16 text-center">
          <p className="text-[#2D3831]/60">You haven't added a shipping address yet.</p>
          <button
            type="button"
            onClick={startAdd}
            className="mt-6 inline-block border border-[#2D3831] px-8 py-3 text-xs tracking-[0.2em] text-[#2D3831] transition-colors hover:bg-[#2D3831] hover:text-[#F9F6F0]"
          >
            ADD ADDRESS
          </button>
        </div>
      )}

      {/* saved addresses */}
      {editing === null && addresses.length > 0 && (
        <ul className="mt-6 space-y-4">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-4 border border-[#2D3831]/10 bg-white p-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-[#2D3831]">{a.name}</p>
                  <span className="text-sm text-[#2D3831]/60">{a.phone}</span>
                  {a.isDefault && (
                    <span
                      className="border px-2 py-0.5 text-[10px] tracking-widest"
                      style={{ borderColor: ACCENT, color: ACCENT }}
                    >
                      DEFAULT
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-[#2D3831]/80">{formatAddress(a)}</p>

                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefaultAddress(a.id)}
                    className="mt-4 text-xs tracking-widest text-[#2D3831]/60 underline-offset-4 transition-colors hover:text-[#2D3A31] hover:underline"
                  >
                    SET AS DEFAULT
                  </button>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  aria-label="Edit address"
                  title="Edit"
                  className="p-2 text-[#2D3831]/60 transition-colors hover:text-[#2D3A31]"
                >
                  <Pencil className="h-4 w-4 stroke-[1.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddressActionError('');
                    setAddressToDelete(a);
                  }}
                  aria-label="Delete address"
                  title="Delete"
                  className="flex h-11 w-11 items-center justify-center text-[#2D3831]/60 transition-colors hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4 stroke-[1.5]" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const renderPurchase = () => {
    const list = statusFilter === 'All' ? orders : orders.filter((o) => matchesStatus(o, statusFilter));

    return (
      <section>
        <h2 className="font-serif text-2xl text-[#2D3831]">Orders</h2>

        {/* status cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {statusTabs.map(({ status, label, Icon }) => {
            const active = statusFilter === status;
            const count = countFor(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(active ? 'All' : status);
                  if (!active && status !== 'All') onMarkSeen?.(status === 'To Review' ? 'Completed' : status);
                }}
                aria-pressed={active}
                className={`group relative flex flex-col items-center gap-3 border px-4 py-6 transition-colors ${
                  active
                    ? 'border-[#2D3A31] bg-[#2D3A31] text-[#F9F6F0]'
                    : 'border-[#2D3A31]/20 bg-white text-[#2D3A31] hover:border-[#2D3A31] hover:bg-[#2D3A31] hover:text-[#F9F6F0]'
                }`}
              >
                <Icon className="h-6 w-6 stroke-[1.5]" />
                <span className="text-xs tracking-widest">{label.toUpperCase()}</span>
                {count > 0 && (
                  <span
                    className={`absolute right-3 top-3 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] transition-colors ${
                      active
                        ? 'bg-[#F9F6F0] text-[#2D3A31]'
                        : 'bg-[#2D3A31] text-[#F9F6F0] group-hover:bg-[#F9F6F0] group-hover:text-[#2D3A31]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* order list */}
        <p className="mt-10 text-xs tracking-[0.2em] text-[#2D3831]/60">
          {statusFilter === 'All' ? 'ALL ORDERS' : `${statusFilter.toUpperCase()} ORDERS`}
        </p>

        {list.length === 0 ? (
          <div className="mt-4 border border-dashed border-[#2D3831]/20 bg-white px-6 py-16 text-center">
            <p className="text-[#2D3831]/60">
              {orders.length === 0
                ? "You haven't placed any orders yet."
                : statusFilter === 'All' ? 'No orders were found.' : `No ${statusFilter.toLowerCase()} orders.`}
            </p>
            {orders.length === 0 && (
              <Link
                to="/catalog"
                className="mt-6 inline-block border border-[#2D3831] px-8 py-3 text-xs tracking-[0.2em] text-[#2D3831] transition-colors hover:bg-[#2D3831] hover:text-[#F9F6F0]"
              >
                BROWSE THE COLLECTION
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {list.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => {
                    setReceiveStep(false);
                    setReceiveError('');
                    setSelectedOrderId(order.id);
                  }}
                  className="flex w-full flex-col items-start justify-between gap-3 border border-[#2D3831]/10 bg-white p-4 text-left transition-colors hover:border-[#2D3A31] sm:flex-row sm:gap-4 sm:p-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#2D3831]">
                      {order.items[0].name}
                      {order.items.length > 1 && (
                        <span className="font-normal text-[#2D3831]/60"> + {order.items.length - 1} more</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-[#2D3831]/60">
                      Order {order.id} | {formatDate(order.date)}
                    </p>
                    <p className="mt-1 text-sm text-[#2D3831]/60">
                      Total: ₱{orderTotal(order).toLocaleString()}
                    </p>
                  </div>
                  <span className="shrink-0 border border-[#2D3A31]/30 bg-[#2D3A31]/5 px-3 py-1 text-xs tracking-widest text-[#2D3A31]">
                    {order.status.toUpperCase()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  const renderOrderModal = () => {
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) return null;

    const current =
      order.status === 'To Review'
        ? trackerSteps.length - 1
        : Math.max(0, trackerSteps.findIndex((t) => t.status === order.status));
    const total = orderTotal(order);
    const merchandise = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = order.shippingFee || 0;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D3831]/50 p-4"
        onClick={() => setSelectedOrderId(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] w-full max-w-3xl overflow-y-auto bg-[#F9F6F0] shadow-2xl"
        >
          {/* header */}
          <div className="flex items-start justify-between gap-4 border-b border-[#2D3831]/10 px-4 py-5 sm:px-8 sm:py-6">
            <div>
              <h2 id="order-modal-title" className="font-serif text-2xl text-[#2D3831]">Order Details</h2>
              <p className="mt-1 text-xs tracking-widest text-[#2D3831]/60">ID: {order.id}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedOrderId(null)}
              aria-label="Close"
              className="p-2 text-[#2D3831]/60 transition-colors hover:text-[#2D3A31]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* status tracker */}
          <div className="flex items-start px-4 pt-6 sm:px-8 sm:pt-8">
            {trackerSteps.map(({ status, label, Icon }, i) => (
              <div key={status} className="relative flex flex-1 flex-col items-center">
                {i < trackerSteps.length - 1 && (
                  <span
                    className={`absolute left-1/2 top-5 h-0.5 w-full ${
                      i < current ? 'bg-[#2D3A31]' : 'bg-[#2D3831]/15'
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border ${
                    i <= current
                      ? 'border-[#2D3A31] bg-[#2D3A31] text-[#F9F6F0]'
                      : 'border-[#2D3831]/20 bg-[#F9F6F0] text-[#2D3831]/40'
                  }`}
                >
                  <Icon className="h-4 w-4 stroke-[1.5]" />
                </span>
                <span
                  className={`mt-2 text-center text-[10px] tracking-widest ${
                    i <= current ? 'text-[#2D3A31]' : 'text-[#2D3831]/40'
                  }`}
                >
                  {label.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          {order.status === 'Out for Delivery' && (
            <div className="mx-4 mt-6 border border-[#2D3A31]/30 bg-white px-5 py-4 sm:mx-8 sm:mt-8">
              <p className="text-sm text-[#2D3831]">Your order is out for delivery.</p>
              <p className="mt-1 text-xs text-[#2D3831]/60">Once it arrives, confirm that you received it.</p>
              {receiveError && <p role="alert" className="mt-3 bg-red-50 px-3 py-2 text-xs text-red-700">{receiveError}</p>}
              {!receiveStep ? (
                <button
                  type="button"
                  onClick={() => setReceiveStep(true)}
                  className="mt-4 w-full bg-[#2D3831] py-3 text-xs tracking-[0.2em] text-[#F9F6F0] transition-opacity hover:opacity-90 sm:w-auto sm:px-8"
                >
                  ORDER RECEIVED
                </button>
              ) : (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-[#2D3831]">Did you receive this order?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={receiving}
                      onClick={() => handleReceived(order.id)}
                      className="bg-[#2D3831] px-6 py-2.5 text-xs tracking-[0.2em] text-[#F9F6F0] transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {receiving ? 'SAVING...' : 'YES, RECEIVED'}
                    </button>
                    <button
                      type="button"
                      disabled={receiving}
                      onClick={() => setReceiveStep(false)}
                      className="border border-[#2D3831]/30 px-6 py-2.5 text-xs tracking-[0.2em] text-[#2D3831] transition-colors hover:border-[#2D3831] disabled:opacity-50"
                    >
                      NOT YET
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-8 px-4 py-6 sm:px-8 sm:py-8 md:grid-cols-2">
            {/* items + summary */}
            <div>
              <h3 className="text-xs tracking-[0.2em] text-[#2D3831]/60">ORDER ITEMS</h3>
              <ul className="mt-4 divide-y divide-[#2D3831]/10 border-b border-[#2D3831]/10">
                {order.items.map((item, i) => {
                  const product = item.image ? { image: item.image } : null;
                  const done = item.reviewed || reviewed[`${order.id}::${item.name}`];
                  return (
                    <li key={i} className="flex items-center gap-4 py-4 text-sm">
                      {product && (
                        <img src={product.image} alt="" className="h-14 w-12 shrink-0 bg-[#EBE5DE] object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[#2D3831]">{item.name}</p>
                        <p className="mt-1 text-xs text-[#2D3831]/60">Qty {item.quantity}</p>
                        {['Completed', 'To Review'].includes(order.status) &&
                          (done ? (
                            <p className="mt-2 flex items-center gap-1 text-[10px] tracking-[0.2em] text-[#2D3A31]">
                              <Check className="h-3 w-3" /> REVIEWED
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReviewTarget({ orderId: order.id, item })}
                              className="mt-2 border border-[#2D3A31] px-4 py-1.5 text-[10px] tracking-[0.2em] text-[#2D3A31] transition-colors hover:bg-[#2D3A31] hover:text-[#F9F6F0]"
                            >
                              WRITE A REVIEW
                            </button>
                          ))}
                      </div>
                      <p className="shrink-0 text-[#2D3831]">₱{(item.price * item.quantity).toLocaleString()}</p>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 space-y-2 border border-[#2D3831]/10 bg-white p-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#2D3831]/70">Subtotal</span>
                  <span>₱{merchandise.toLocaleString()}</span>
                </div>
                {order.discountCode && order.discountAmount > 0 && (
                  <div className="flex justify-between text-[#2D6A4F]">
                    <span>Code {order.discountCode} savings</span>
                    <span>₱{order.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#2D3831]/70">Shipping{order.shippingPromo ? ` (${order.shippingPromo})` : ''}</span>
                  {shippingFee > 0 ? (
                    <span className="flex items-baseline gap-2">
                      {order.shippingFeeOriginal > shippingFee && (
                        <span className="text-xs text-[#2D3831]/50 line-through">₱{order.shippingFeeOriginal.toLocaleString()}</span>
                      )}
                      ₱{shippingFee.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xs uppercase tracking-wider">Free shipping</span>
                  )}
                </div>
                <div className="flex justify-between border-t border-[#2D3831]/10 pt-3 font-medium">
                  <span>Total</span>
                  <span className="font-serif text-lg">₱{total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* delivery info */}
            <div>
              <h3 className="text-xs tracking-[0.2em] text-[#2D3831]/60">DELIVERY</h3>
              <div className="mt-4 space-y-5 text-sm">
                {order.shipping && (
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2D3A31]" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#2D3831]">Ship to</p>
                      <p className="text-[#2D3831]/80">
                        {order.shipping.name}
                        {order.shipping.phone && ` · ${order.shipping.phone}`}
                      </p>
                      <p className="text-[#2D3831]/60">{formatAddress(order.shipping)}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#2D3A31]" />
                  <div>
                    <p className="font-medium text-[#2D3831]">Order date</p>
                    <p className="text-[#2D3831]/60">{formatDate(order.date)}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[#2D3A31]" />
                  <div>
                    <p className="font-medium text-[#2D3831]">Payment</p>
                    <p className="text-[#2D3831]/60">Cash on Delivery</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[80vh] bg-[#F9F6F0]">
    <div className="max-w-6xl mx-auto px-6 py-16">
      {cameFromCheckout && (
        <button
          type="button"
          onClick={() => goBack(navigate, '/checkout')}
          className="mb-8 flex items-center space-x-2 text-xs tracking-[0.15em] uppercase text-[#2D3831]/70 hover:text-[#2D3831] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}
      <h1 className="text-4xl font-serif text-[#2D3831]">My Account</h1>
      <p className="mt-2 text-sm text-[#2D3831]/60">Manage your details and track your orders.</p>

      <div className="mt-12 grid gap-10 lg:grid-cols-[240px_1fr]">
        {/* ============ SIDEBAR ============ */}
        <aside className="flex gap-2 overflow-x-auto border-b border-[#2D3831]/10 pb-4 lg:block lg:space-y-8 lg:overflow-visible lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <nav aria-label="My account" className="shrink-0">
            <p className="mb-3 hidden px-4 text-xs tracking-[0.2em] text-[#2D3831] lg:block">MY ACCOUNT</p>
            <div className="flex gap-1 lg:block lg:space-y-1">
              {navItem('profile', 'Profile')}
              {navItem('addresses', 'Addresses')}
              {navItem('password', 'Change password')}
            </div>
          </nav>

          <nav aria-label="My purchase" className="shrink-0">
            <p className="mb-3 hidden px-4 text-xs tracking-[0.2em] text-[#2D3831] lg:block">MY PURCHASE</p>
            <div className="flex gap-1 lg:block lg:space-y-1">{navItem('purchase', 'My Purchase', purchaseUnseen)}</div>
          </nav>
        </aside>

        {/* ============ CONTENT ============ */}
        <div className="min-w-0">
          {tab === 'profile' && renderProfile()}
          {tab === 'addresses' && renderAddresses()}
          {tab === 'password' && renderPassword()}
          {tab === 'purchase' && renderPurchase()}
        </div>
      </div>

      {renderOrderModal()}

      {reviewTarget && (
        <ReviewModal
          item={reviewTarget.item}
          image={reviewTarget.item.image}
          onClose={() => setReviewTarget(null)}
          onSubmit={handleReviewSubmit}
        />
      )}
      {addressSuccess && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#26302A]/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAddressSuccess('');
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-success-title"
            aria-describedby="address-success-message"
            className="relative w-full max-w-md rounded-3xl border border-[#E4DCCB] bg-[#F9F6F0] px-6 py-10 text-center text-[#26302A] shadow-2xl sm:px-9"
          >
            <button
              ref={addressSuccessCloseRef}
              type="button"
              aria-label="Close confirmation"
              onClick={() => setAddressSuccess('')}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-[#7D8179] transition-colors hover:bg-[#F0EADD] hover:text-[#26302A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D3A31]"
            >
              <X className="h-5 w-5" />
            </button>
            <CheckCircle2 className="mx-auto mb-5 h-14 w-14 stroke-[1.4] text-[#2D6A4F]" aria-hidden="true" />
            <h2 id="address-success-title" className="font-serif text-3xl font-medium">
              {addressSuccess.includes('updated') ? 'Address updated' : 'Address saved'}
            </h2>
            <p id="address-success-message" className="mt-3 text-sm leading-relaxed text-[#7D8179]">
              {addressSuccess}
            </p>
            <button
              ref={addressSuccessContinueRef}
              type="button"
              onClick={() => setAddressSuccess('')}
              className="mt-7 min-h-12 w-full rounded-xl bg-[#2D3A31] px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-[#F9F6F0] transition-colors hover:bg-[#1F2A23] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2D3A31]"
            >
              Continue
            </button>
          </section>
        </div>
      )}
      {addressToDelete && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#26302A]/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !addressDeleting) setAddressToDelete(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-address-title"
            aria-describedby="delete-address-message"
            className="w-full max-w-md border border-[#E4DCCB] bg-[#F9F6F0] p-6 text-[#26302A] shadow-2xl sm:p-8"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="delete-address-title" className="font-serif text-2xl">
                  Delete this address?
                </h2>
                <p id="delete-address-message" className="mt-2 text-sm leading-relaxed text-[#2D3831]/70">
                  The saved address for {addressToDelete.name} will be permanently removed from your account.
                </p>
              </div>
            </div>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={deleteCancelRef}
                type="button"
                disabled={addressDeleting}
                onClick={() => setAddressToDelete(null)}
                className="min-h-11 border border-[#2D3831]/30 px-5 py-3 text-xs tracking-[0.15em] text-[#2D3831] transition-colors hover:border-[#2D3831] disabled:opacity-50"
              >
                KEEP ADDRESS
              </button>
              <button
                ref={deleteConfirmRef}
                type="button"
                disabled={addressDeleting}
                onClick={handleDeleteAddress}
                className="min-h-11 bg-red-800 px-5 py-3 text-xs tracking-[0.15em] text-white transition-colors hover:bg-red-900 disabled:cursor-wait disabled:opacity-60"
              >
                {addressDeleting ? 'DELETING...' : 'DELETE ADDRESS'}
              </button>
            </div>
          </section>
        </div>
      )}
      {passwordConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#26302A]/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setPasswordConfirmOpen(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="password-confirm-title"
            aria-describedby="password-confirm-message"
            className="w-full max-w-md border border-[#E4DCCB] bg-[#F9F6F0] p-6 text-[#26302A] shadow-2xl sm:p-8"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EBE5DE] text-[#2D3A31]">
                <X className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="password-confirm-title" className="font-serif text-2xl">
                  Update your password?
                </h2>
                <p id="password-confirm-message" className="mt-2 text-sm leading-relaxed text-[#2D3831]/70">
                  Your current password will be replaced with the new password you entered.
                </p>
              </div>
            </div>
            {error && (
              <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={passwordConfirmCancelRef}
                type="button"
                disabled={saving}
                onClick={() => setPasswordConfirmOpen(false)}
                className="min-h-11 border border-[#2D3831]/30 px-5 py-3 text-xs tracking-[0.15em] text-[#2D3831] transition-colors hover:border-[#2D3831] disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                ref={passwordConfirmSubmitRef}
                type="button"
                disabled={saving}
                onClick={confirmPasswordChange}
                className="min-h-11 bg-[#2D3A31] px-5 py-3 text-xs tracking-[0.15em] text-[#F9F6F0] transition-colors hover:bg-[#1F2A23] disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? 'UPDATING...' : 'CONFIRM UPDATE'}
              </button>
            </div>
          </section>
        </div>
      )}
      {addressConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#26302A]/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !addressSaving) setAddressConfirmOpen(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="address-confirm-title"
            aria-describedby="address-confirm-message"
            className="w-full max-w-md border border-[#E4DCCB] bg-[#F9F6F0] p-6 text-[#26302A] shadow-2xl sm:p-8"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EBE5DE] text-[#2D3A31]">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="address-confirm-title" className="font-serif text-2xl">
                  {editing === 'new' ? 'Add this address?' : 'Save address changes?'}
                </h2>
                <p id="address-confirm-message" className="mt-2 text-sm leading-relaxed text-[#2D3831]/70">
                  {editing === 'new'
                    ? `Save this shipping address for ${addrForm.name.trim()}?`
                    : `Save your changes to the address for ${addrForm.name.trim()}?`}
                </p>
              </div>
            </div>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={addressConfirmCancelRef}
                type="button"
                disabled={addressSaving}
                onClick={() => setAddressConfirmOpen(false)}
                className="min-h-11 border border-[#2D3831]/30 px-5 py-3 text-xs tracking-[0.15em] text-[#2D3831] transition-colors hover:border-[#2D3831] disabled:opacity-50"
              >
                CONTINUE EDITING
              </button>
              <button
                ref={addressConfirmSubmitRef}
                type="button"
                disabled={addressSaving}
                onClick={confirmAddressSave}
                className="min-h-11 bg-[#2D3A31] px-5 py-3 text-xs tracking-[0.15em] text-[#F9F6F0] transition-colors hover:bg-[#1F2A23] disabled:cursor-wait disabled:opacity-60"
              >
                {addressSaving ? 'SAVING...' : editing === 'new' ? 'CONFIRM SAVE' : 'CONFIRM CHANGES'}
              </button>
            </div>
          </section>
        </div>
      )}
      {success && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#26302A]/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSuccess('');
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-success-title"
            aria-describedby="password-success-message"
            className="relative w-full max-w-md rounded-3xl border border-[#E4DCCB] bg-[#F9F6F0] px-6 py-10 text-center text-[#26302A] shadow-2xl sm:px-9"
          >
            <button
              ref={passwordSuccessCloseRef}
              type="button"
              aria-label="Close confirmation"
              onClick={() => setSuccess('')}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-[#7D8179] transition-colors hover:bg-[#F0EADD] hover:text-[#26302A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D3A31]"
            >
              <X className="h-5 w-5" />
            </button>
            <CheckCircle2 className="mx-auto mb-5 h-14 w-14 stroke-[1.4] text-[#2D6A4F]" aria-hidden="true" />
            <h2 id="password-success-title" className="font-serif text-3xl font-medium">
              Password updated
            </h2>
            <p id="password-success-message" role="status" className="mt-3 text-sm leading-relaxed text-[#7D8179]">
              {success}
            </p>
            <button
              ref={passwordSuccessContinueRef}
              type="button"
              onClick={() => setSuccess('')}
              className="mt-7 min-h-12 w-full rounded-xl bg-[#2D3A31] px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-[#F9F6F0] transition-colors hover:bg-[#1F2A23] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2D3A31]"
            >
              Continue
            </button>
          </section>
        </div>
      )}
    </div>
    </div>
  );
}