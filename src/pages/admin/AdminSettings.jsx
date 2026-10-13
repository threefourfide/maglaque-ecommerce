import { useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Camera, Check, User } from 'lucide-react';
import { updateProfile, changePassword, uploadPhoto, removePhoto } from '../../api';
import { ConfirmModal, useToast } from './AdminUI';
import { goBack as navBack } from '../../utils/nav';
import { cleanPhone, validPhone, validName, PHONE_ERROR, NAME_ERROR } from '../../utils/validate';

const fieldClass =
  'mt-1 h-12 w-full border border-[#8A6A4F]/70 bg-white px-3 text-sm outline-none transition-colors focus:border-[#2D3A31]';

const passwordChecks = (pw) => [
  { label: '8 to 20 characters', ok: pw.length >= 8 && pw.length <= 20 },
  { label: 'At least one uppercase letter', ok: /[A-Z]/.test(pw) },
  { label: 'At least one lowercase letter', ok: /[a-z]/.test(pw) },
  { label: 'At least one number', ok: /\d/.test(pw) },
];

const resizeImage = (file, size = 256) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(size / img.width, size / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const w = img.width * scale;
      const h = img.height * scale;
      canvas.getContext('2d').drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Choose a valid image (JPG, PNG or WEBP).'));
    };
    img.src = url;
  });

export default function AdminSettings() {
  const { user, onUserChange } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);

  const [profile, setProfile] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [profileError, setProfileError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [showReq, setShowReq] = useState(false);

  const [photoMenu, setPhotoMenu] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const checks = passwordChecks(pw.next);
  const dirty = profile.name.trim() !== user.name || profile.email.trim().toLowerCase() !== user.email || profile.phone.trim() !== (user.phone || '');

  const goBack = () => navBack(navigate, '/admin/orders');

  const validateProfile = () => {
    if (!profile.name.trim() || !profile.email.trim()) return 'Fill in your name and email.';
    if (!validName(profile.name)) return NAME_ERROR;
    if (!/^\S+@\S+\.\S+$/.test(profile.email.trim())) return 'Enter a valid email address.';
    if (profile.phone && !validPhone(profile.phone)) return PHONE_ERROR;
    return '';
  };

  const validatePassword = () => {
    if (!pw.current || !pw.next || !pw.confirm) return 'Fill in all the fields.';
    if (!checks.every((c) => c.ok)) return "Your new password doesn't meet all the requirements.";
    if (pw.next === pw.current) return 'The new password must be different from the current one.';
    if (pw.next !== pw.confirm) return 'The new passwords do not match.';
    return '';
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      const { user: me } = await updateProfile(profile);
      onUserChange(me);
      setProfile({ name: me.name, email: me.email, phone: me.phone || '' });
      setConfirm(null);
      toast('Your account details were updated.');
    } catch (err) {
      setConfirm(null);
      setProfileError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    setBusy(true);
    try {
      await changePassword({ currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      setShowReq(false);
      setConfirm(null);
      toast('Your password was updated.');
    } catch (err) {
      setConfirm(null);
      setPwError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast('Choose a JPG, PNG or WEBP image.', 'error');
    if (file.size > 5 * 1024 * 1024) return toast('Image must be 5 MB or smaller.', 'error');
    setPhotoBusy(true);
    try {
      const { user: me } = await uploadPhoto(await resizeImage(file));
      onUserChange(me);
      toast('Your profile photo was updated.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removeCurrentPhoto = async () => {
    setBusy(true);
    try {
      const { user: me } = await removePhoto();
      onUserChange(me);
      setConfirm(null);
      toast('Your profile photo was removed.');
    } catch (err) {
      setConfirm(null);
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-2 border border-[#2D3831]/40 bg-white px-5 py-3 text-sm transition-colors hover:bg-[#2D3A31] hover:text-[#F9F6F0]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-right text-[22px] uppercase tracking-wide sm:text-3xl md:text-5xl">Account Settings</h1>
      </div>

      <section className="mt-6 bg-white p-6 md:p-8">
        <h2 className="text-2xl">Profile</h2>

        <div className="mt-6 flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#2D3A31] bg-[#FAF6EF] text-[#2D3A31]">
              {user.photo ? <img src={user.photo} alt="" className="h-full w-full object-cover" /> : <User className="h-10 w-10 stroke-[1.5]" />}
            </div>
            <button
              type="button"
              onClick={() => setPhotoMenu((v) => !v)}
              disabled={photoBusy}
              aria-label="Change profile photo"
              title="Change photo"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#2D3A31] text-[#F9F6F0] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Camera className="h-4 w-4 stroke-[1.5]" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhoto} />
            {photoMenu && (
              <div className="admin-modal absolute left-0 top-full z-10 mt-3 w-44 border border-[#2D3831]/10 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoMenu(false);
                    fileRef.current?.click();
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[#2D3831]/5"
                >
                  {user.photo ? 'Change photo' : 'Upload photo'}
                </button>
                {user.photo && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenu(false);
                      setConfirm('photo');
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-[#B3261E] hover:bg-red-50"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl text-[#2D3A31]">{user.name}</p>
            <p className="truncate text-sm text-[#2D3831]/60">{user.email}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-[#2D3A31]">
            Name
            <input
              value={profile.name}
              onChange={(e) => { setProfile({ ...profile, name: e.target.value }); setProfileError(''); }}
              maxLength={80}
              autoComplete="name"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-[#2D3A31]">
            Phone Number
            <input
              value={profile.phone}
              onChange={(e) => { setProfile({ ...profile, phone: cleanPhone(e.target.value) }); setProfileError(''); }}
              placeholder="09XXXXXXXXX or +639XXXXXXXXX"
              maxLength={13}
              inputMode="tel"
              autoComplete="tel"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-[#2D3A31] sm:col-span-2">
            Email
            <input
              type="email"
              value={profile.email}
              onChange={(e) => { setProfile({ ...profile, email: e.target.value }); setProfileError(''); }}
              maxLength={120}
              autoComplete="email"
              className={fieldClass}
            />
          </label>
        </div>

        {profileError && <p role="alert" className="admin-fade mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{profileError}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              setProfile({ name: user.name, email: user.email, phone: user.phone || '' });
              setProfileError('');
            }}
            className="border border-[#2D3831]/40 px-6 py-3 text-sm transition-colors hover:bg-[#2D3831]/5 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              const msg = validateProfile();
              if (msg) return setProfileError(msg);
              setConfirm('profile');
            }}
            className="border border-[#2D6A4F] px-6 py-3 text-sm text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10 disabled:opacity-40"
          >
            Save Changes
          </button>
        </div>
      </section>

      <section className="mt-6 bg-white p-6 md:p-8">
        <h2 className="text-2xl">Change Password</h2>
        <div className="mt-6 space-y-4">
          <label className="block text-sm text-[#2D3A31]">
            Current password
            <input
              type="password"
              value={pw.current}
              onChange={(e) => { setPw({ ...pw, current: e.target.value }); setPwError(''); }}
              autoComplete="current-password"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-[#2D3A31]">
            New password
            <input
              type="password"
              value={pw.next}
              onChange={(e) => { setPw({ ...pw, next: e.target.value }); setPwError(''); }}
              onFocus={() => setShowReq(true)}
              autoComplete="new-password"
              className={fieldClass}
            />
          </label>
          {showReq && (
            <ul className="admin-fade grid gap-1.5 text-xs sm:grid-cols-2" aria-label="Password requirements">
              {checks.map((c) => (
                <li key={c.label} className={`flex items-center gap-2 transition-colors duration-300 ${c.ok ? 'text-[#2D3A31]' : 'text-[#2D3831]/50'}`}>
                  <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${c.ok ? 'border-[#2D3A31] bg-[#2D3A31] text-[#F9F6F0]' : 'border-[#2D3831]/40'}`}>
                    {c.ok && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </span>
                  {c.label}
                </li>
              ))}
            </ul>
          )}
          <label className="block text-sm text-[#2D3A31]">
            Confirm new password
            <input
              type="password"
              value={pw.confirm}
              onChange={(e) => { setPw({ ...pw, confirm: e.target.value }); setPwError(''); }}
              autoComplete="new-password"
              className={fieldClass}
            />
          </label>
        </div>

        {pwError && <p role="alert" className="admin-fade mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{pwError}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => {
              const msg = validatePassword();
              if (msg) return setPwError(msg);
              setConfirm('password');
            }}
            className="border border-[#2D6A4F] px-6 py-3 text-sm text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10"
          >
            Update Password
          </button>
        </div>
      </section>

      {confirm === 'profile' && (
        <ConfirmModal title="Save changes?" message="Your name, email and phone number will be updated." confirmLabel="Save" busy={busy} onConfirm={saveProfile} onCancel={() => setConfirm(null)} />
      )}
      {confirm === 'password' && (
        <ConfirmModal title="Update password?" message="You'll use the new password the next time you sign in." confirmLabel="Update" busy={busy} onConfirm={savePassword} onCancel={() => setConfirm(null)} />
      )}
      {confirm === 'photo' && (
        <ConfirmModal title="Remove photo?" message="Your profile photo will be removed." confirmLabel="Remove" danger busy={busy} onConfirm={removeCurrentPhoto} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}
