import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminFetchArchive, adminFetchArchiveTypes, adminRestoreProduct, adminPurgeProduct } from '../../api';
import { ConfirmModal, SlidingTabs, useToast, useLive } from './AdminUI';
import { ProductModal, money } from './ProductSummary';

const formatDate = (iso) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function AdminArchive() {
  const toast = useToast();
  const [type, setType] = useState('All');
  const [types, setTypes] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ products: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const [viewId, setViewId] = useState(null);
  const [confirm, setConfirm] = useState(null);
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
      adminFetchArchiveTypes()
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
    return adminFetchArchive(params)
      .then((res) => {
        setData(res);
        setAnimKey((k) => k + 1);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [type, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useLive(['products'], () => {
    load();
    loadTypes();
  });

  const run = async () => {
    const { kind, product } = confirm;
    setBusy(true);
    try {
      if (kind === 'restore') {
        await adminRestoreProduct(product.id);
        toast(`${product.name} was restored.`);
      } else {
        await adminPurgeProduct(product.id);
        toast(`${product.name} was permanently deleted.`);
      }
      setConfirm(null);
      await loadTypes();
      if (data.products.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch (err) {
      setConfirm(null);
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
      <h1 className="text-right text-[26px] uppercase tracking-wide sm:text-4xl md:text-6xl">Archive</h1>

      <div className="mt-4 overflow-x-auto bg-white p-2">
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

      <div className="mt-4 bg-white p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 key={type} className="admin-fade text-2xl uppercase tracking-wide md:text-4xl">
            {type === 'All' ? 'Deleted Products' : type}
          </h2>
          <div className="relative w-full max-w-md">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search"
              className="h-12 w-full border border-[#2D3831]/60 bg-white pl-3 pr-10 text-sm outline-none focus:border-[#2D3A31]"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>
        </div>

        {error && <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Product Name</th>
                <th className={th}>Type</th>
                <th className={th}>Price</th>
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
                        <span className="mt-0.5 block text-[11px] text-[#2D3831]/60">
                          Deleted {formatDate(p.archivedAt)}
                          {p.archivedBy && ` by ${p.archivedBy}`}
                          {p.reason && ` · ${p.reason}`}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className={`${td} text-center`}>{p.category}</td>
                  <td className={`${td} text-center`}>{money(p.price)}</td>
                  <td className={td}>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: 'restore', product: p })}
                        className="border border-[#2D6A4F] px-5 py-2 text-sm text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: 'purge', product: p })}
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
                  <td colSpan={4} className={`${td} py-16 text-center text-[#2D3831]/60`}>
                    The archive is empty.
                  </td>
                </tr>
              )}
              {loading && data.products.length === 0 && (
                <tr>
                  <td colSpan={4} className={`${td} py-16 text-center text-[#2D3831]/60`}>
                    Loading...
                  </td>
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

      {viewId && !confirm && <ProductModal productId={viewId} onBack={() => setViewId(null)} onEdit={() => setViewId(null)} hideEdit />}
      {confirm && (
        <ConfirmModal
          title={confirm.kind === 'restore' ? 'Restore product?' : 'Delete permanently?'}
          message={
            confirm.kind === 'restore'
              ? `${confirm.product.name} will go back to the store and the Products list.`
              : `${confirm.product.name} and its reviews will be permanently deleted. This can't be undone.`
          }
          confirmLabel={confirm.kind === 'restore' ? 'Restore' : 'Delete'}
          danger={confirm.kind === 'purge'}
          busy={busy}
          onConfirm={run}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
