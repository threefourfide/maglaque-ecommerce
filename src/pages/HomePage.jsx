import React from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

export default function HomePage({ products, addToCart }) {
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="bg-[#F9F6F0] text-[#2D3831] min-h-screen">

      <section className="relative h-[85vh] bg-[#EBE5DE] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=1920" 
            alt="ELLE Interior" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="relative z-10 text-center max-w-3xl px-6 space-y-6">
          <h1 className="text-4xl md:text-6xl font-serif text-[#F9F6F0] tracking-wide leading-tight">
            The Art of Intentional Living
          </h1>
          <p className="text-sm md:text-base text-[#F9F6F0]/90 tracking-widest font-light max-w-xl mx-auto">
            Crafted for tranquility. Discover minimalist furniture and organic objects designed to elevate your everyday spaces.
          </p>
          <div className="pt-4">
            <Link 
              to="/catalog" 
              className="inline-block px-8 py-4 bg-[#F9F6F0] text-[#2D3831] text-xs tracking-[0.2em] uppercase hover:bg-[#2D3831] hover:text-[#F9F6F0] transition-all duration-300"
            >
              Explore Collection
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 max-w-4xl mx-auto px-6 text-center space-y-6">
        <h2 className="text-xs uppercase tracking-[0.3em] text-[#2D3831]/60">Our Philosophy</h2>
        <p className="text-2xl md:text-3xl font-serif leading-relaxed text-[#2D3831]">
          "We believe that true luxury lies in simplicity, honest materials, and designs that create a sense of calm within your home."
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex justify-between items-end mb-12 border-b border-[#2D3831]/10 pb-4">
          <div>
            <h2 className="text-xs tracking-[0.3em] uppercase text-[#2D3831]/60 mb-1">Curated Selection</h2>
            <h3 className="text-3xl font-serif text-[#2D3831]">Featured Pieces</h3>
          </div>
          <Link 
            to="/catalog" 
            className="text-xs tracking-[0.2em] uppercase hover:opacity-70 transition-opacity underline underline-offset-8"
          >
            View All Collection
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} />
          ))}
        </div>
      </section>

    </div>
  );
}