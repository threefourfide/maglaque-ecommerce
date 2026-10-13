import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminFetchLogs } from '../../api';
import { useLive } from './AdminUI';

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function AdminLogs() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ logs: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animKey, setAnimKey] = useState(0);

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
    return adminFetchLogs(params)
      .then((res) => {
        setData(res);
        setAnimKey((k) => k + 1);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useLive(['logs'], () => {
    load();
  });

  const th = 'border border-[#2D3831]/10 bg-[#EDEBE8] px-3 py-4 text-left text-base';
  const td = 'border border-[#2D3831]/10 px-3 py-3 text-sm align-middle';

  return (
    <div>
      <h1 className="text-right text-[26px] uppercase tracking-wide sm:text-4xl md:text-6xl">Action Logs</h1>

      <div className="mt-4 bg-white p-4 md:p-6">
        <div className="relative max-w-md">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or action"
            className="h-12 w-full border border-[#2D3831]/60 bg-white pl-3 pr-10 text-sm outline-none focus:border-[#2D3A31]"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        </div>

        {error && <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Action</th>
                <th className={th}>Reason</th>
                <th className={th}>Date &amp; Time</th>
              </tr>
            </thead>
            <tbody key={animKey} className="admin-fade">
              {data.logs.map((l, i) => (
                <tr key={l.id} className="admin-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className={td}>{l.name}</td>
                  <td className={td}>{l.action}</td>
                  <td className={td}>{l.reason || '--'}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDateTime(l.date)}</td>
                </tr>
              ))}
              {!loading && data.logs.length === 0 && (
                <tr>
                  <td colSpan={4} className={`${td} py-16 text-center text-[#2D3831]/60`}>No actions recorded yet.</td>
                </tr>
              )}
              {loading && data.logs.length === 0 && (
                <tr>
                  <td colSpan={4} className={`${td} py-16 text-center text-[#2D3831]/60`}>Loading...</td>
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
    </div>
  );
}
