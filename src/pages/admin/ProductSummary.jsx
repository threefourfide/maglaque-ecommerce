import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { adminFetchProduct } from '../../api';

export const money = (n) => `₱${Number(n || 0).toLocaleString()}`;

const dash = (v) => v || '--';

function Row({ label, value }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="w-14 shrink-0 text-[#2D3831]/70">{label}</span>
      <span className="min-w-0 break-words text-[#2D3831]">{dash(value)}</span>
    </div>
  );
}

function Column({ title, list = [] }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-[#2D3831]">{title}</p>
      <ul className="mt-2 space-y-1 text-xs text-[#2D3831]">
        {list.length ? list.map((v, i) => <li key={i}>{v}</li>) : <li>--</li>}
      </ul>
    </div>
  );
}

export function ProductSummary({ product, showMaterials = true }) {
  const [index, setIndex] = useState(0);
  const images = product.images?.length ? product.images : [product.image].filter(Boolean);
  const current = images[Math.min(index, images.length - 1)];
  const spec = product.specifications || {};
  const mat = product.materialDetails || {};

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="shrink-0">
          <div className="h-44 w-44 overflow-hidden rounded-2xl bg-[#EBE5DE]">
            {current && (
              <img
                key={current.slice(-24)}
                src={current}
                alt={product.name}
                style={{ objectPosition: product.imagePosition }}
                className="admin-fade h-full w-full object-cover"
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-2 flex justify-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                    i === index ? 'bg-[#2D3A31]' : 'bg-[#2D3831]/25'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0">
          {product.category && (
            <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-[#2D3831]/60">{product.category}</p>
          )}
          <h3 className="text-2xl font-semibold text-[#2D3A31]">{product.name}</h3>
          <p className="mt-1 text-[#2D3831]">{money(product.price)}</p>
          <p className="mt-3 break-words text-sm leading-relaxed text-[#2D3831]/80">{product.description}</p>
        </div>
      </div>

      <div className={`mt-6 grid gap-4 bg-[#F6F2EC] p-4 ${showMaterials ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="border border-[#2D3831]/40 bg-white p-4">
          <p className="text-sm font-semibold text-[#2D3A31]">Product Specifications</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold">Dimensions</p>
              <Row label="Length:" value={spec.length} />
              <Row label="Width:" value={spec.width} />
              <Row label="Height:" value={spec.height} />
              <Row label="Depth:" value={spec.depth} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold">Product Details</p>
              <Row label="Material:" value={spec.material} />
              <Row label="Color:" value={spec.color} />
              <Row label="Finish:" value={spec.finish} />
            </div>
          </div>
        </div>
        {showMaterials && (
          <div className="border border-[#2D3831]/40 bg-white p-4">
            <p className="text-sm font-semibold text-[#2D3A31]">Product Materials</p>
            <div className="mt-3 flex gap-3">
              <Column title="Carpentry" list={mat.carpentry} />
              <Column title="Upholstery" list={mat.upholstery} />
              <Column title="Finishing" list={mat.finishing} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function ProductModal({ productId, onBack, onEdit, hideEdit = false }) {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetchProduct(productId)
      .then(({ product: p }) => setProduct(p))
      .catch((err) => setError(err.message));
  }, [productId]);

  return (
    <div className="admin-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onBack}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="admin-modal relative max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-white px-6 py-8 shadow-2xl sm:px-10"
      >
        <button type="button" onClick={onBack} aria-label="Close" className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-[#2D3831]/60 hover:bg-[#2D3831]/5">
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-6 text-center text-3xl uppercase tracking-[0.12em]">Product Details</h2>

        {error && <p role="alert" className="bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {product && <ProductSummary product={product} />}

        <div className="mt-6 flex gap-3">
          {!hideEdit && (
            <button type="button" onClick={() => onEdit(product)} disabled={!product} className="w-32 border border-[#2D3831]/40 py-4 text-sm hover:bg-[#2D3831]/5 disabled:opacity-40">
              Edit Product
            </button>
          )}
          <button type="button" onClick={onBack} className="w-32 border border-[#2D3831]/40 py-4 text-sm hover:bg-[#2D3831]/5">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
