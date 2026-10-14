import { useCallback, useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Rating from '@mui/material/Rating';
import { adminFetchReviews, adminSetReviewHidden, adminReplyReview } from '../../api';
import { Backdrop, ConfirmModal, useLive, useToast } from './AdminUI';
import ReviewMedia from '../../components/ReviewMedia';

const selectClass =
  'h-12 border border-[#2D3831]/60 bg-white px-3 text-sm text-[#2D3831] outline-none focus:border-[#2D3A31]';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function Stars({ value, size = 'small' }) {
  return (
    <Rating
      value={value}
      precision={0.1}
      readOnly
      size={size}
      sx={{ color: '#0F4C3A', '& .MuiRating-iconEmpty': { color: 'rgba(45, 56, 49, 0.25)' } }}
    />
  );
}

function ReplyModal({ review, onClose, onSent }) {
  const toast = useToast();
  const [text, setText] = useState(review.reply);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await adminReplyReview(review.id, text);
      toast(review.reply ? 'Your reply was updated.' : 'Your reply was posted.');
      onSent();
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
      <h2 className="pr-10 text-2xl uppercase tracking-[0.08em]">{review.reply ? 'Edit Reply' : 'Reply to Review'}</h2>

      <div className="mt-5 flex items-center gap-3">
        {review.product.image && <img src={review.product.image} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-[#EBE5DE] object-cover" />}
        <div className="min-w-0">
          <p className="truncate text-[#2D3A31]">{review.product.name}</p>
          <p className="text-xs text-[#2D3831]/60">{review.customer} · {formatDate(review.date)}</p>
        </div>
      </div>

      <div className="mt-4 bg-[#FAF6EF] p-4">
        <Stars value={review.rating} />
        <p className="mt-2 text-sm leading-relaxed text-[#2D3831]/80">{review.comment || 'No written review.'}</p>
        <ReviewMedia items={review.media} size="h-20 w-20" />
      </div>

      <label className="mt-5 block text-sm text-[#2D3A31]">
        Your reply
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
          rows={4}
          maxLength={500}
          placeholder="Write a reply that customers will see under this review"
          className="mt-1 w-full resize-none border border-[#8A6A4F]/70 bg-white p-3 text-sm outline-none focus:border-[#2D3A31]"
        />
        <span className="block text-right text-xs text-[#2D3831]/50">{text.length}/500</span>
      </label>

      {error && <p role="alert" className="mt-3 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="border border-[#2D3831]/40 px-6 py-3 text-sm transition-colors hover:bg-[#2D3831]/5">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => (text.trim().length < 2 ? setError('Write your reply.') : setConfirming(true))}
          className="border border-[#2D6A4F] px-6 py-3 text-sm text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10"
        >
          {review.reply ? 'Save Reply' : 'Send Reply'}
        </button>
      </div>

      {confirming && (
        <ConfirmModal
          title={review.reply ? 'Save reply?' : 'Send reply?'}
          message="Your reply will show under this review in the store right away."
          confirmLabel={review.reply ? 'Save' : 'Send'}
          busy={busy}
          onConfirm={send}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Backdrop>
  );
}

export default function AdminReviews() {
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ reviews: [], summary: null, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const [replyFor, setReplyFor] = useState(null);
  const [confirm, setConfirm] = useState(null);
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
    if (rating) params.rating = rating;
    if (status) params.status = status;
    return adminFetchReviews(params)
      .then((res) => {
        setData(res);
        setAnimKey((k) => k + 1);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, search, rating, status]);

  useEffect(() => {
    load();
  }, [load]);

  useLive(['reviews'], load);

  const toggleHidden = async () => {
    const { review } = confirm;
    const hide = review.status === 'Shown';
    setBusy(true);
    try {
      await adminSetReviewHidden(review.id, hide);
      toast(hide ? 'The review is now hidden from the store.' : 'The review is now shown in the store.');
      setConfirm(null);
      await load();
    } catch (err) {
      setConfirm(null);
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const th = 'border border-[#2D3831]/10 bg-[#EDEBE8] px-3 py-4 text-left text-base';
  const td = 'border border-[#2D3831]/10 px-3 py-3 text-sm align-top';
  const summary = data.summary;

  return (
    <div>
      <h1 className="text-right text-[22px] uppercase tracking-wide sm:text-3xl md:text-5xl">Reviews &amp; Ratings Management</h1>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="border border-[#2D3831]/15 bg-white px-5 py-4">
          <p className="text-sm text-[#2D3831]">Average Rating</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-4xl text-[#2D3A31]">{summary ? summary.average.toFixed(1) : '—'}</span>
            {summary && <Stars value={summary.average} size="large" />}
            <span className="text-sm text-[#2D3831]/60">out of 5</span>
          </div>
        </div>
        <div className="border border-[#2D3831]/15 bg-white px-5 py-4">
          <p className="text-sm text-[#2D3831]">Total Reviews</p>
          <p className="mt-4 text-center text-4xl text-[#2D3A31]">{summary ? summary.total.toLocaleString() : '—'}</p>
          {summary && summary.hidden > 0 && <p className="mt-1 text-center text-xs text-[#2D3831]/60">{summary.hidden} hidden from the store</p>}
        </div>
      </div>

      <div className="mt-4 bg-white p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-md flex-1">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search customer or product"
              className="h-12 w-full border border-[#2D3831]/60 bg-white pl-3 pr-10 text-sm outline-none focus:border-[#2D3A31]"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>
          <select value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }} className={selectClass} aria-label="Filter by stars">
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} Star{n === 1 ? '' : 's'}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectClass} aria-label="Filter by status">
            <option value="">All Statuses</option>
            <option value="shown">Shown</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>

        {error && <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Customer</th>
                <th className={th}>Rating</th>
                <th className={th}>Review</th>
                <th className={th}>Status</th>
                <th className={`${th} w-40 min-w-40 text-center`}>Actions</th>
              </tr>
            </thead>
            <tbody key={animKey} className="admin-fade">
              {data.reviews.map((r, i) => (
                <tr key={r.id} className="admin-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      {r.product.image && <img src={r.product.image} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-[#EBE5DE] object-cover" />}
                      <span className="min-w-0">{r.product.name}</span>
                    </div>
                  </td>
                  <td className={td}>
                    {r.customer}
                    <span className="block text-[11px] text-[#2D3831]/60">{formatDate(r.date)}</span>
                  </td>
                  <td className={td}>
                    <Stars value={r.rating} />
                  </td>
                  <td className={`${td} w-[300px] max-w-[300px]`}>
                    <div className="flex min-w-0 flex-col items-start gap-3">
                      <p className="w-full whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">
                        {r.comment || <span className="text-[#2D3831]/50">No written review.</span>}
                      </p>
                      <ReviewMedia items={r.media} size="h-16 w-16" />
                      {r.reply && (
                        <p className="w-full border-l-2 border-[#0F4C3A] pl-2 text-xs text-[#2D3831]/70 [overflow-wrap:anywhere]">
                          <strong className="font-semibold text-[#0F4C3A]">Replied:</strong> {r.reply}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className={`${td} text-xs font-bold uppercase ${r.status === 'Shown' ? 'text-[#2D6A4F]' : 'text-[#B3261E]'}`}>{r.status}</td>
                  <td className={`${td} w-40 min-w-40`}>
                    <div className="flex flex-col items-stretch gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyFor(r)}
                        className="w-full whitespace-nowrap border border-[#2D6A4F] px-3 py-2 text-sm text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10"
                      >
                        {r.reply ? 'Edit Reply' : 'Reply'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ review: r })}
                        className={`w-full whitespace-nowrap border px-3 py-2 text-sm transition-colors ${
                          r.status === 'Shown'
                            ? 'border-[#B3261E] text-[#B3261E] hover:bg-red-50'
                            : 'border-[#2D3831]/60 text-[#6B4F3A] hover:bg-[#2D3A31] hover:text-[#F9F6F0]'
                        }`}
                      >
                        {r.status === 'Shown' ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && data.reviews.length === 0 && (
                <tr>
                  <td colSpan={6} className={`${td} py-16 text-center text-[#2D3831]/60`}>No reviews found.</td>
                </tr>
              )}
              {loading && data.reviews.length === 0 && (
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

      {replyFor && (
        <ReplyModal
          key={replyFor.id}
          review={replyFor}
          onClose={() => setReplyFor(null)}
          onSent={() => {
            setReplyFor(null);
            load();
          }}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={confirm.review.status === 'Shown' ? 'Hide review?' : 'Show review?'}
          message={
            confirm.review.status === 'Shown'
              ? `${confirm.review.customer}'s review of ${confirm.review.product.name} will no longer appear in the store, and it won't count toward the product's rating.`
              : `${confirm.review.customer}'s review of ${confirm.review.product.name} will appear in the store again.`
          }
          confirmLabel={confirm.review.status === 'Shown' ? 'Hide' : 'Show'}
          danger={confirm.review.status === 'Shown'}
          busy={busy}
          onConfirm={toggleHidden}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
