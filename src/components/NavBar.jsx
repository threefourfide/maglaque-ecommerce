import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search } from 'lucide-react';

export default function NavBar({ cartCount }) {
  return (
    <header className="sticky top-0 z-50 bg-[#F9F6F0]/90 backdrop-blur-md border-b border-[#2D3831]/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        <Link to="/" className="text-2xl font-serif tracking-[0.2em] text-[#2D3831]">
          ELLE
        </Link>

        <nav className="hidden md:flex items-center space-x-10 text-sm tracking-widest text-[#2D3831]/80">
          <Link to="/" className="hover:text-[#2D3831] transition-colors">HOME</Link>
          <Link to="/catalog" className="hover:text-[#2D3831] transition-colors">COLLECTION</Link>
        </nav>

        <div className="flex items-center space-x-6">
          <Link to="/catalog" className="text-[#2D3831] hover:opacity-70 transition-opacity">
            <Search className="w-5 h-5 stroke-[1.5]" />
          </Link>
          
          <Link to="/cart" className="relative text-[#2D3831] hover:opacity-70 transition-opacity flex items-center">
            <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#2D3831] text-[#F9F6F0] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-sans">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

      </div>
    </header>
  );
}