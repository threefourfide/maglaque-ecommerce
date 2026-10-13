import { useEffect, useState } from 'react';
import { adminFetchHomeContent, adminSaveHomeContent, DEFAULT_HOME_CONTENT } from '../../api';
import { useToast } from './AdminUI';

const fieldGroups = [
  {
    title: 'Homepage Copy',
    fields: [
      { name: 'heroTitle', label: 'Homepage headline', maxLength: 120 },
      { name: 'philosophyTitle', label: 'Philosophy section heading', maxLength: 80 },
      { name: 'philosophyText', label: 'Philosophy quote', maxLength: 500, multiline: true },
    ],
  },
];
const fields = fieldGroups.flatMap((group) => group.fields);

const inputClass = 'mt-1 w-full border border-[#8A6A4F]/70 bg-white px-3 py-3 text-sm outline-none transition-colors focus:border-[#2D3A31]';

export default function AdminHomePage() {
  const toast = useToast();
  const [content, setContent] = useState(DEFAULT_HOME_CONTENT);
  const [savedContent, setSavedContent] = useState(DEFAULT_HOME_CONTENT);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    adminFetchHomeContent()
      .then((data) => {
        if (!active) return;
        setContent(data);
        setSavedContent(data);
      })
      .catch((err) => {
        if (active) {
          setLoadFailed(true);
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const dirty = fields.some(({ name }) => content[name] !== savedContent[name]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await adminSaveHomeContent(content);
      setContent(saved);
      setSavedContent(saved);
      toast('Homepage content was updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[22px] uppercase tracking-wide sm:text-3xl md:text-5xl">Homepage Content</h1>

      <section className="mt-6 bg-white p-6 md:p-8">
        <p className="mt-2 text-sm text-[#2D3831]/65">
          Edit the homepage headline and philosophy copy.
        </p>

        {error && <p role="alert" className="mt-5 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <form onSubmit={save} className="mt-6 space-y-6">
          {fieldGroups.map((group) => (
            <section key={group.title} className="space-y-5 border-t border-[#2D3831]/10 pt-6">
              <h2 className="font-serif text-xl">{group.title}</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {group.fields.map(({ name, label, maxLength, multiline }) => (
                  <label key={name} className={`block text-sm text-[#2D3A31] ${multiline ? 'sm:col-span-2' : ''}`}>
                    {label}
                    {multiline ? (
                      <textarea
                        value={content[name]}
                        onChange={(event) => setContent((previous) => ({ ...previous, [name]: event.target.value }))}
                        maxLength={maxLength}
                        rows={4}
                        disabled={loading || busy}
                        className={`${inputClass} resize-y`}
                      />
                    ) : (
                      <input
                        value={content[name]}
                        onChange={(event) => setContent((previous) => ({ ...previous, [name]: event.target.value }))}
                        maxLength={maxLength}
                        disabled={loading || busy}
                        className={inputClass}
                      />
                    )}
                    <span className="mt-1 block text-right text-xs text-[#2D3831]/50">
                      {content[name].length}/{maxLength}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}

          <div className="flex justify-end border-t border-[#2D3831]/10 pt-5">
            <button
              type="submit"
              disabled={loading || loadFailed || busy || !dirty || fields.some(({ name }) => !content[name].trim())}
              className="min-h-11 bg-[#2D3A31] px-8 py-3 text-xs uppercase tracking-[0.2em] text-[#F9F6F0] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Loading...' : busy ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
