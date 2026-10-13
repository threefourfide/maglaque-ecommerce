import { Link } from 'react-router-dom';

export default function ProductCard({ product, addToCart }) {
  const soldOut = (product.stock ?? 0) <= 0;

  return (
    <div className="group flex h-full flex-col">
      <Link to={`/product/${product.id}`} className="relative mb-3 aspect-[4/5] overflow-hidden bg-[#EBE5DE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D3A31] sm:mb-4">
        <img 
          src={product.image} 
          alt={product.name}
          style={{ objectPosition: product.imagePosition }}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[#2D3831]/0 group-hover:bg-[#2D3831]/5 transition-colors duration-300" />
        {product.discountPercent > 0 && (
          <span className="absolute left-3 top-3 bg-[#2D3A31] px-2.5 py-1 text-[10px] tracking-widest text-[#F9F6F0]">
            -{product.discountPercent}%
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-[#2D3831]/80 py-2 text-center text-[10px] uppercase tracking-[0.2em] text-[#F9F6F0]">
            Out of stock
          </span>
        )}
      </Link>

      <div className="mb-1 flex items-start justify-between gap-2 sm:gap-3">
        <Link to={`/product/${product.id}`} className="min-w-0 break-words font-serif text-base text-[#2D3831] transition-opacity hover:opacity-70 sm:text-lg">
          {product.name}
        </Link>
        <span className="shrink-0 text-right font-sans text-xs font-medium text-[#2D3831] sm:pl-2 sm:text-sm">
          {product.discountPercent > 0 && (
            <span className="mr-1 block text-[10px] font-normal text-[#2D3831]/50 line-through sm:mr-2 sm:inline sm:text-xs">
              ₱{product.originalPrice.toLocaleString()}
            </span>
          )}
          ₱{product.price.toLocaleString()}
        </span>
      </div>

      <p className="mb-3 text-[10px] uppercase tracking-wider text-[#2D3831]/60 sm:mb-4 sm:text-xs">
        {product.category}
      </p>

      <button
        onClick={() => addToCart(product)}
        disabled={soldOut}
        className="mt-auto min-h-11 w-full border border-[#2D3831] bg-transparent px-2 py-3 text-[10px] uppercase tracking-[0.12em] text-[#2D3831] transition-all duration-300 hover:bg-[#2D3831] hover:text-[#F9F6F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D3A31] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#2D3831] sm:text-xs sm:tracking-[0.15em]"
        type="button"
      >
        {soldOut ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  );
}