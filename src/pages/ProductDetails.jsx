import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Star, X } from 'lucide-react';
import { fetchReviews } from '../api';
import { goBack } from '../utils/nav';
import { onLive } from '../live';
import ReviewMedia from '../components/ReviewMedia';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// Row of 5 stars, filled up to the rounded rating
function Stars({ value, size = 'h-4 w-4', className = '' }) {
  return (
    <div className={`flex ${className}`} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} stroke-[1.5] ${
            n <= Math.round(value) ? 'fill-[#2D3A31] text-[#2D3A31]' : 'text-[#2D3831]/30'
          }`}
        />
      ))}
    </div>
  );
}

export default function ProductDetails({ products, loading, addToCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [imageSelection, setImageSelection] = useState({ productId: id, index: 0 });
  const [addedMessage, setAddedMessage] = useState(false);
  const [reviewPanel, setReviewPanel] = useState({ productId: id, open: false });
  const showReviews = reviewPanel.productId === id && reviewPanel.open;
  const [reviewsData, setReviewsData] = useState({ productId: id, reviews: [] });
  const productReviews = reviewsData.productId === id ? reviewsData.reviews : [];

  useEffect(() => {
    let active = true;
    const load = () =>
      fetchReviews(id)
        .then(
          ({ reviews }) =>
            active && setReviewsData({ productId: id, reviews })
        )
        .catch(() => {});
    load();
    const off = onLive((event) => {
      if (event.type === 'reviews') load();
    });
    return () => {
      active = false;
      off();
    };
  }, [id]);

  // Reviews popup: close with Esc, lock page scroll while open
  useEffect(() => {
    if (!showReviews) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setReviewPanel({ productId: id, open: false });
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showReviews, id]);

  const product = products.find((p) => p.id === parseInt(id));

  if (!product && loading) return <div className="min-h-[70vh] bg-[#F9F6F0]" />;

  if (!product) {
    return (
      <div className="bg-[#F9F6F0] min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-3xl font-serif text-[#2D3831] mb-4">Piece Not Found</h2>
        <p className="text-xs tracking-wider text-[#2D3831]/60 mb-8">The item you are looking for does not exist or has been removed.</p>
        <Link 
          to="/catalog" 
          className="px-8 py-3 bg-[#2D3831] text-[#F9F6F0] text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
        >
          Return to Collection
        </Link>
      </div>
    );
  }

  const reviewCount = productReviews.length;
  const average = reviewCount
    ? productReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  const stock = product.stock ?? 0;
  const soldOut = stock <= 0;
  const qty = Math.min(quantity, Math.max(1, stock));
  const productImages = product.images?.length ? product.images : [product.image].filter(Boolean);
  const imageIndex = imageSelection.productId === id
    ? Math.min(imageSelection.index, productImages.length - 1)
    : 0;

  const handleAddToCart = () => {
    addToCart(product, qty);
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 3000);
  };

  const handleBuyNow = () => {
    const added = addToCart(product, qty, { showSuccessToast: false });
    if (added) navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#2D3831] sm:px-6 sm:py-12">
      <div className="max-w-7xl mx-auto">

        <button 
          onClick={() => goBack(navigate, '/catalog')}
          className="mb-8 flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#2D3831]/70 transition-colors hover:text-[#2D3831] sm:mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-16">

          <div>
          <div className="aspect-[4/5] overflow-hidden bg-[#EBE5DE]">
            <img 
              src={productImages[imageIndex]} 
              alt={product.name} 
              style={{ objectPosition: product.imagePosition }}
              className="h-full w-full object-cover transition-opacity duration-300"
            />
          </div>
          {productImages.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1" aria-label="Product photos">
              {productImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setImageSelection({ productId: id, index })}
                  aria-label={`Show product photo ${index + 1}`}
                  aria-pressed={index === imageIndex}
                  className={`h-16 w-14 shrink-0 overflow-hidden border-2 sm:h-20 sm:w-16 ${index === imageIndex ? 'border-[#2D3A31]' : 'border-transparent'}`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          </div>

          <div className="space-y-6 sm:space-y-8 lg:py-6">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#2D3831]/60 mb-2">{product.category}</p>
              <h1 className="mb-4 break-words font-serif text-3xl text-[#2D3831] sm:text-4xl">{product.name}</h1>
              <p className="flex flex-wrap items-baseline gap-3 text-xl font-sans font-medium text-[#2D3831]">
                {product.discountPercent > 0 && (
                  <span className="text-base font-normal text-[#2D3831]/50 line-through">
                    ₱{product.originalPrice.toLocaleString()}
                  </span>
                )}
                <span>₱{product.price.toLocaleString()}</span>
                {product.discountPercent > 0 && (
                  <span className="bg-[#2D3A31] px-2.5 py-1 text-[10px] font-normal tracking-widest text-[#F9F6F0]">
                    -{product.discountPercent}%
                  </span>
                )}
              </p>
              <p
                className={`mt-3 text-xs tracking-[0.15em] uppercase ${
                  soldOut ? 'text-red-700' : stock < 10 ? 'text-[#B7791F]' : 'text-[#2D6A4F]'
                }`}
              >
                {soldOut ? 'Out of stock' : stock < 10 ? `Only ${stock} left` : `${stock} in stock`}
              </p>
            </div>

            <p className="text-sm tracking-wide text-[#2D3831]/80 leading-relaxed">
              {product.description}
            </p>

            {(product.details || product.materials) && (
              <div className="border-t border-b border-[#2D3831]/10 py-6 space-y-6">
                {product.details && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-sans tracking-[0.2em] uppercase text-[#2D3831]/60">Details</h3>
                    <p className="text-xs tracking-wide text-[#2D3831]/70 leading-relaxed">{product.details}</p>
                  </div>
                )}
                {product.materials && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-sans tracking-[0.2em] uppercase text-[#2D3831]/60">Materials</h3>
                    <p className="text-xs tracking-wide text-[#2D3831]/70 leading-relaxed">{product.materials}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs tracking-[0.15em] uppercase text-[#2D3831]/70">Quantity</span>
                <div className="flex items-center border border-[#2D3831]/20">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-[#2D3831]/5"
                  >
                    -
                  </button>
                  <span aria-live="polite" className="min-w-10 px-2 text-center text-sm">{qty}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity(Math.min(Math.max(1, stock), quantity + 1))}
                    disabled={qty >= stock}
                    className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-[#2D3831]/5 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleAddToCart}
                  disabled={soldOut}
                  className="flex flex-1 items-center justify-center space-x-3 border border-[#2D3831] py-4 text-xs tracking-[0.2em] uppercase text-[#2D3831] transition-colors hover:bg-[#2D3831] hover:text-[#F9F6F0] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#2D3831]"
                >
                  <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
                  <span>{addedMessage ? 'Added to Cart' : 'Add to Cart'}</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={soldOut}
                  className="flex-1 bg-[#2D3831] py-4 text-xs tracking-[0.2em] uppercase text-[#F9F6F0] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Buy It Now
                </button>
              </div>

              {addedMessage && (
                <p className="text-center text-xs tracking-wider text-[#2D3831] font-medium animate-pulse">
                  Successfully added to your cart.
                </p>
              )}
            </div>

            {/* Ratings summary + reviews */}
            <div className="border-t border-[#2D3831]/10 pt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-sans text-5xl font-semibold text-[#2D3831]">
                    {reviewCount ? average.toFixed(1) : '—'}
                  </p>
                  {reviewCount > 0 && <Stars value={average} size="h-5 w-5" className="mt-3" />}
                  <p className="mt-2 text-sm text-[#2D3831]/60">
                    {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                  </p>
                </div>

                {reviewCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setReviewPanel({ productId: id, open: true })}
                    aria-haspopup="dialog"
                    className="border border-[#2D3831]/40 px-8 py-4 text-xs font-medium uppercase tracking-[0.2em] text-[#2D3831] transition-colors hover:border-[#2D3A31] hover:bg-[#2D3A31] hover:text-[#F9F6F0]"
                  >
                    View Reviews
                  </button>
                )}
              </div>

              {showReviews && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D3831]/50 p-4"
                  onClick={() => setReviewPanel({ productId: id, open: false })}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reviews-title"
                    onClick={(e) => e.stopPropagation()}
                    className="flex max-h-[85vh] w-full max-w-xl flex-col bg-[#F9F6F0] shadow-2xl"
                  >
                    {/* header */}
                    <div className="flex items-start justify-between gap-4 border-b border-[#2D3831]/10 px-8 py-6">
                      <div className="min-w-0">
                        <h2 id="reviews-title" className="font-serif text-2xl text-[#2D3831]">Reviews</h2>
                        <p className="mt-1 truncate text-xs tracking-widest text-[#2D3831]/60">{product.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewPanel({ productId: id, open: false })}
                        aria-label="Close"
                        className="p-2 text-[#2D3831]/60 transition-colors hover:text-[#2D3A31]"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* summary */}
                    <div className="flex items-center gap-4 border-b border-[#2D3831]/10 px-8 py-5">
                      <p className="font-sans text-3xl font-semibold text-[#2D3831]">{average.toFixed(1)}</p>
                      <div>
                        <Stars value={average} />
                        <p className="mt-1 text-xs text-[#2D3831]/60">
                          {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                        </p>
                      </div>
                    </div>

                    {/* scrollable list */}
                    <ul className="divide-y divide-[#2D3831]/10 overflow-y-auto px-8">
                      {productReviews.map((r, i) => (
                        <li key={r.id || i} className="py-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2D3A31] font-serif text-[#2D3A31]">
                                {r.name.charAt(0)}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-[#2D3831]">{r.name}</p>
                                <Stars value={r.rating} size="h-3.5 w-3.5" className="mt-1" />
                              </div>
                            </div>
                            <p className="shrink-0 text-xs text-[#2D3831]/50">{formatDate(r.date)}</p>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-[#2D3831]/80">{r.comment}</p>
                          <ReviewMedia items={r.media} />
                          {r.reply && (
                            <div className="mt-4 border-l-2 border-[#2D3A31] bg-[#EBE5DE]/60 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-[#2D3A31]">Reply from ELLE</p>
                              <p className="mt-1 text-sm leading-relaxed text-[#2D3831]/80">{r.reply}</p>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}