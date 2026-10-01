import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#2D3831] text-[#F9F6F0] pt-20 pb-12 mt-24">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-[#F9F6F0]/10">
        
        <div className="space-y-4 md:col-span-1">
          <h2 className="text-2xl font-serif tracking-[0.2em]">ELLE</h2>
          <p className="text-xs tracking-wide text-[#F9F6F0]/70 leading-relaxed">
            Thoughtfully designed furniture and living objects for a calmer, more intentional home.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-sans tracking-[0.2em] uppercase mb-6 text-[#F9F6F0]/50">Navigation</h3>
          <ul className="space-y-3 text-sm tracking-wider">
            <li><Link to="/" className="hover:opacity-70 transition-opacity">Home</Link></li>
            <li><Link to="/catalog" className="hover:opacity-70 transition-opacity">Collection</Link></li>
            <li><span className="cursor-pointer hover:opacity-70 transition-opacity">Spaces</span></li>
            <li><span className="cursor-pointer hover:opacity-70 transition-opacity">Studio</span></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-sans tracking-[0.2em] uppercase mb-6 text-[#F9F6F0]/50">Care & Support</h3>
          <ul className="space-y-3 text-sm tracking-wider text-[#F9F6F0]/80">
            <li className="cursor-pointer hover:opacity-70 transition-opacity">Shipping & Delivery</li>
            <li className="cursor-pointer hover:opacity-70 transition-opacity">Returns & Exchanges</li>
            <li className="cursor-pointer hover:opacity-70 transition-opacity">Care Instructions</li>
            <li className="cursor-pointer hover:opacity-70 transition-opacity">Contact Us</li>
          </ul>
        </div>

        <div className="space-y-4 md:col-span-1">
          <h3 className="text-xs font-sans tracking-[0.2em] uppercase text-[#F9F6F0]/50">Journal</h3>
          <p className="text-xs text-[#F9F6F0]/70 tracking-wide">
            Subscribe to receive updates on new collections and private design releases.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col space-y-2">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="bg-transparent border border-[#F9F6F0]/30 px-4 py-3 text-sm text-[#F9F6F0] placeholder-[#F9F6F0]/40 focus:outline-none focus:border-[#F9F6F0]"
            />
            <button 
              type="submit"
              className="py-3 bg-[#F9F6F0] text-[#2D3831] text-xs tracking-[0.15em] uppercase hover:bg-[#F9F6F0]/90 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-[#F9F6F0]/50 tracking-wider">
        <p>&copy; {new Date().getFullYear()} ELLE Furniture. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <span className="cursor-pointer hover:underline">Privacy Policy</span>
          <span className="cursor-pointer hover:underline">Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}