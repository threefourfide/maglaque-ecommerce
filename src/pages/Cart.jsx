import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight } from 'lucide-react';

export default function Cart({ cart, updateQuantity, removeFromCart }) {
  const navigate = useNavigate();

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="bg-[#F9F6F0] min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-3xl font-serif text-[#2D3831] mb-4">Your Cart is Empty</h2>
        <p className="text-xs tracking-wider text-[#2D3831]/60 mb-8">Discover our collection and bring intentional pieces into your home.</p>
        <Link 
          to="/catalog" 
          className="px-8 py-3 bg-[#2D3831] text-[#F9F6F0] text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
        >
          Explore Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#F9F6F0] text-[#2D3831] min-h-screen py-16 px-6">
      <div className="max-w-7xl mx-auto">
        
        <h1 className="text-3xl md:text-4xl font-serif mb-12 border-b border-[#2D3831]/10 pb-6">Your Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">

          <div className="lg:col-span-2 space-y-8">
            {cart.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-[#2D3831]/10 gap-6">

                <div className="flex items-center space-x-6">
                  <div className="w-24 h-28 bg-[#EBE5DE] overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#2D3831]/60 mb-1">{item.category}</p>
                    <h3 className="font-serif text-lg text-[#2D3831] mb-2">{item.name}</h3>
                    <p className="text-sm font-medium text-[#2D3831]">${item.price.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto space-x-8">
                  <div className="flex items-center border border-[#2D3831]/20">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-3 py-1 hover:bg-[#2D3831]/5 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 text-xs">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1 hover:bg-[#2D3831]/5 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-[#2D3831]/50 hover:text-[#2D3831] transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4 stroke-[1.5]" />
                  </button>
                </div>

              </div>
            ))}
          </div>

          <div className="bg-[#EBE5DE]/40 p-8 border border-[#2D3831]/10 space-y-6">
            <h3 className="text-xs font-sans tracking-[0.2em] uppercase border-b border-[#2D3831]/10 pb-4">Order Summary</h3>
            
            <div className="flex justify-between text-sm tracking-wide">
              <span className="text-[#2D3831]/70">Subtotal</span>
              <span className="font-medium">${subtotal.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-sm tracking-wide">
              <span className="text-[#2D3831]/70">Shipping</span>
              <span className="text-xs uppercase tracking-wider text-[#2D3831]/60">Calculated at checkout</span>
            </div>

            <div className="border-t border-[#2D3831]/10 pt-4 flex justify-between text-base font-medium">
              <span>Total</span>
              <span>${subtotal.toLocaleString()}</span>
            </div>

            <button 
              onClick={() => navigate('/checkout')}
              className="w-full py-4 bg-[#2D3831] text-[#F9F6F0] text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity flex items-center justify-center space-x-3"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}