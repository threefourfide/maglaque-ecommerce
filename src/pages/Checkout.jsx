import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export default function Checkout({ cart, clearCart }) {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    paymentMethod: 'card'
  });

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    clearCart();
  };

  if (isSubmitted) {
    return (
      <div className="bg-[#F9F6F0] min-h-[75vh] flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="max-w-md space-y-6">
          <CheckCircle2 className="w-16 h-16 mx-auto text-[#2D3831] stroke-[1]" />
          <h1 className="text-3xl md:text-4xl font-serif text-[#2D3831]">Order Confirmed</h1>
          <p className="text-xs tracking-wider text-[#2D3831]/70 leading-relaxed">
            Thank you for your order. We have received your purchase and are carefully preparing your pieces for shipment. A confirmation email has been sent to {formData.email}.
          </p>
          <div className="pt-6">
            <Link 
              to="/" 
              className="inline-block px-8 py-4 bg-[#2D3831] text-[#F9F6F0] text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="bg-[#F9F6F0] min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-3xl font-serif text-[#2D3831] mb-4">Your Cart is Empty</h2>
        <p className="text-xs tracking-wider text-[#2D3831]/60 mb-8">Add items to your cart before proceeding to checkout.</p>
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

        <button 
          onClick={() => navigate('/cart')}
          className="flex items-center space-x-2 text-xs tracking-[0.15em] uppercase text-[#2D3831]/70 hover:text-[#2D3831] mb-12 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Cart</span>
        </button>

        <h1 className="text-3xl md:text-4xl font-serif mb-12 border-b border-[#2D3831]/10 pb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
 
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-xs font-sans tracking-[0.2em] uppercase text-[#2D3831]/60">Shipping Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  name="firstName" 
                  placeholder="First Name" 
                  required 
                  value={formData.firstName} 
                  onChange={handleChange}
                  className="bg-transparent border border-[#2D3831]/20 px-4 py-3 text-sm text-[#2D3831] placeholder-[#2D3831]/40 focus:outline-none focus:border-[#2D3831]"
                />
                <input 
                  type="text" 
                  name="lastName" 
                  placeholder="Last Name" 
                  required 
                  value={formData.lastName} 
                  onChange={handleChange}
                  className="bg-transparent border border-[#2D3831]/20 px-4 py-3 text-sm text-[#2D3831] placeholder-[#2D3831]/40 focus:outline-none focus:border-[#2D3831]"
                />
              </div>

              <input 
                type="email" 
                name="email" 
                placeholder="Email Address" 
                required 
                value={formData.email} 
                onChange={handleChange}
                className="w-full bg-transparent border border-[#2D3831]/20 px-4 py-3 text-sm text-[#2D3831] placeholder-[#2D3831]/40 focus:outline-none focus:border-[#2D3831]"
              />

                <input 
                type="tel" 
                name="phone" 
                placeholder="Phone Number" 
                required 
                value={formData.phone} 
                onChange={handleChange}
                className="w-full bg-transparent border border-[#2D3831]/20 px-4 py-3 text-sm text-[#2D3831] placeholder-[#2D3831]/40 focus:outline-none focus:border-[#2D3831]"
                />

              <input 
                type="text" 
                name="address" 
                placeholder="Street Address" 
                required 
                value={formData.address} 
                onChange={handleChange}
                className="w-full bg-transparent border border-[#2D3831]/20 px-4 py-3 text-sm text-[#2D3831] placeholder-[#2D3831]/40 focus:outline-none focus:border-[#2D3831]"
              />

              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  name="city" 
                  placeholder="City" 
                  required 
                  value={formData.city} 
                  onChange={handleChange}
                  className="bg-transparent border border-[#2D3831]/20 px-4 py-3 text-sm text-[#2D3831] placeholder-[#2D3831]/40 focus:outline-none focus:border-[#2D3831]"
                />
                <input 
                  type="text" 
                  name="country" 
                  placeholder="Country" 
                  required 
                  value={formData.country} 
                  onChange={handleChange}
                  className="bg-transparent border border-[#2D3831]/20 px-4 py-3 text-sm text-[#2D3831] placeholder-[#2D3831]/40 focus:outline-none focus:border-[#2D3831]"
                />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-[#2D3831]/10">
              <h2 className="text-xs font-sans tracking-[0.2em] uppercase text-[#2D3831]/60">Payment Method</h2>
              
              <div className="space-y-3">

                <label className="flex items-center space-x-3 border border-[#2D3831]/20 p-4 cursor-pointer hover:border-[#2D3831]">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="cod" 
                    checked={formData.paymentMethod === 'cod'} 
                    onChange={handleChange}
                    className="accent-[#2D3831]"
                  />
                  <span className="text-sm tracking-wide">Cash on Delivery</span>
                </label>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-[#2D3831] text-[#F9F6F0] text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity"
            >
              Place Order — ${subtotal.toLocaleString()}
            </button>
          </form>

          <div className="bg-[#EBE5DE]/40 p-8 border border-[#2D3831]/10 space-y-6">
            <h3 className="text-xs font-sans tracking-[0.2em] uppercase border-b border-[#2D3831]/10 pb-4">Order Summary</h3>
            
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-4">
                    <img src={item.image} alt={item.name} className="w-12 h-14 object-cover bg-[#EBE5DE]" />
                    <div>
                      <p className="font-serif text-[#2D3831]">{item.name}</p>
                      <p className="text-xs text-[#2D3831]/60">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-medium">${(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#2D3831]/10 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#2D3831]/70">Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#2D3831]/70">Shipping</span>
                <span className="text-xs uppercase tracking-wider">Free</span>
              </div>
              <div className="flex justify-between text-base font-medium pt-2 border-t border-[#2D3831]/10">
                <span>Total</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}