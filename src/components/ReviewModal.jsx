import { useEffect, useRef, useState } from 'react';
import { X, Star, Camera } from 'lucide-react';
import { IMAGE_TYPES, VIDEO_TYPES, MAX_VIDEO_BYTES, MAX_IMAGE_BYTES } from '../utils/media';

const quickTags = [
  'Great quality!',
  'Very comfortable',
  'Worth the price',
  'Fast delivery',
  'Exactly as described',
  'Highly recommend!',
];

const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const MAX_MEDIA = 5;
const MAX_CHARS = 500;

/**
 * "Write a Review" popup.
 * Props: item { name, price }, image (url), onClose(), onSubmit({ rating, comment, media })
 */
export default function ReviewModal({ item, image, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [media, setMedia] = useState([]); // [{ file, url, isVideo }]
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  // free the preview URLs when the popup closes
  const mediaRef = useRef(media);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);
  useEffect(() => () => mediaRef.current.forEach((m) => URL.revokeObjectURL(m.url)), []);

  const toggleTag = (tag) => {
    if (comment.includes(tag)) {
      setComment(comment.replace(tag, '').replace(/\s{2,}/g, ' ').trim());
    } else {
      setComment(((comment ? comment.trimEnd() + ' ' : '') + tag).slice(0, MAX_CHARS));
    }
  };

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    const problems = [];
    const valid = picked.filter((file) => {
      const isVideo = VIDEO_TYPES.includes(file.type);
      if (!isVideo && !IMAGE_TYPES.includes(file.type)) {
        problems.push(`${file.name}: use JPG, PNG, WEBP, MP4, WEBM or MOV.`);
        return false;
      }
      if (isVideo && file.size > MAX_VIDEO_BYTES) {
        problems.push(`${file.name}: videos must be 20 MB or smaller.`);
        return false;
      }
      if (!isVideo && file.size > MAX_IMAGE_BYTES) {
        problems.push(`${file.name}: photos must be 15 MB or smaller.`);
        return false;
      }
      return true;
    });
    setError(problems[0] || '');
    setMedia((prev) => {
      const room = MAX_MEDIA - prev.length;
      const added = valid.slice(0, room).map((file) => ({
        file,
        url: URL.createObjectURL(file),
        isVideo: VIDEO_TYPES.includes(file.type),
      }));
      return [...prev, ...added];
    });
    e.target.value = ''; // allow picking the same file again
  };

  const removeMedia = (index) => {
    setMedia((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setAttempted(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit({ rating, comment: comment.trim(), media: media.map((m) => m.file) });
    } catch (err) {
      setError(err.message || 'Could not submit your review.');
      setBusy(false);
    }
  };

  const shown = hover || rating;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2D3831]/50 p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto bg-[#F9F6F0] shadow-2xl"
      >
        {/* header */}
        <div className="flex items-center justify-between gap-4 px-8 pb-2 pt-8">
          <h2 id="review-title" className="font-serif text-2xl text-[#2D3831]">Write a Review</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-[#2D3831]/60 transition-colors hover:text-[#2D3A31]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-8 pb-8 pt-4">
          {/* product */}
          <div className="flex items-center gap-4 border border-[#2D3831]/10 bg-[#EBE5DE]/40 p-4">
            {image ? (
              <img src={image} alt={item.name} className="h-16 w-16 shrink-0 bg-[#EBE5DE] object-cover" />
            ) : (
              <div className="h-16 w-16 shrink-0 bg-[#EBE5DE]" />
            )}
            <div className="min-w-0">
              <p className="truncate font-serif text-lg text-[#2D3831]">{item.name}</p>
              <p className="text-sm text-[#2D3831]/70">₱{item.price.toLocaleString()}</p>
            </div>
          </div>

          {/* rating */}
          <div>
            <p className="text-sm font-medium text-[#2D3831]">
              Your Rating <span className="text-red-600">*</span>
            </p>
            <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  aria-pressed={rating === n}
                  className="p-1"
                >
                  <Star
                    className={`h-9 w-9 stroke-[1.5] transition-colors ${
                      n <= shown ? 'fill-[#2D3A31] text-[#2D3A31]' : 'text-[#2D3831]/30'
                    }`}
                  />
                </button>
              ))}
              {shown > 0 && (
                <span className="ml-3 text-xs tracking-widest text-[#2D3831]/60">
                  {ratingLabels[shown].toUpperCase()}
                </span>
              )}
            </div>
            {attempted && !rating && (
              <p role="alert" className="mt-2 text-xs text-red-700">
                Please select a star rating to submit.
              </p>
            )}
          </div>

          {/* review text */}
          <div>
            <p className="text-sm font-medium text-[#2D3831]">
              Review <span className="font-normal text-[#2D3831]/60">(Optional)</span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {quickTags.map((tag) => {
                const on = comment.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-pressed={on}
                    className={`rounded-full border px-4 py-2 text-xs transition-colors ${
                      on
                        ? 'border-[#2D3A31] bg-[#2D3A31] text-[#F9F6F0]'
                        : 'border-[#2D3831]/25 text-[#2D3831]/80 hover:border-[#2D3A31] hover:text-[#2D3A31]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX_CHARS))}
              rows={4}
              placeholder="Share your experience with this product..."
              className="mt-3 w-full resize-none border border-[#2D3831]/20 bg-white px-4 py-3 text-sm text-[#2D3831] outline-none transition-colors placeholder:text-[#2D3831]/40 focus:border-[#2D3A31]"
            />
            <p className="mt-1 text-right text-[11px] text-[#2D3831]/40">
              {comment.length}/{MAX_CHARS}
            </p>
          </div>

          {/* photo / video */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={media.length >= MAX_MEDIA}
              className="flex items-center gap-2 border border-[#2D3831]/40 px-5 py-3 text-xs uppercase tracking-[0.15em] text-[#2D3831] transition-colors hover:border-[#2D3A31] hover:bg-[#2D3A31] hover:text-[#F9F6F0] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Camera className="h-4 w-4 stroke-[1.5]" />
              Add Photo / Video
            </button>

            {media.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3">
                {media.map((m, i) => (
                  <li key={m.url} className="relative h-16 w-16 bg-[#EBE5DE]">
                    {m.isVideo ? (
                      <video src={m.url} muted className="h-full w-full object-cover" />
                    ) : (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      aria-label="Remove"
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#2D3A31] text-[#F9F6F0]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p role="alert" className="bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          {/* actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="flex-1 border border-[#2D3831]/30 py-3 text-xs tracking-[0.2em] text-[#2D3831] transition-colors hover:border-[#2D3A31]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 bg-[#2D3A31] py-3 text-xs tracking-[0.2em] text-[#F9F6F0] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (media.length ? 'UPLOADING...' : 'SENDING...') : 'SUBMIT REVIEW'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}