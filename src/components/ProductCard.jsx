import React from 'react';
import { Link } from 'react-router-dom';

export default function ProductCard({ product, addToCart }) {
  return (
    <div className="group flex flex-col">
      <Link to={`/product/${product.id}`} className="relative overflow-hidden aspect-[4/5] bg-[#EBE5DE] mb-4">
        <img 
          src={product.image} 
          alt={product.name}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[#2D3831]/0 group-hover:bg-[#2D3831]/5 transition-colors duration-300" />
      </Link>

      <div className="flex justify-between items-start mb-1">
        <Link to={`/product/${product.id}`} className="font-serif text-lg text-[#2D3831] hover:opacity-70 transition-opacity">
          {product.name}
        </Link>
        <span className="font-sans font-medium text-[#2D3831]">
          ${product.price.toLocaleString()}
        </span>
      </div>

      <p className="text-xs tracking-wider text-[#2D3831]/60 uppercase mb-4">
        {product.category}
      </p>

      <button
        onClick={() => addToCart(product)}
        className="w-full py-3 bg-transparent border border-[#2D3831] text-[#2D3831] text-xs tracking-[0.15em] uppercase hover:bg-[#2D3831] hover:text-[#F9F6F0] transition-all duration-300"
      >
        Add to Cart
      </button>
    </div>
  );
}