import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

export default function ProductDetails({ products, addToCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState(false);

  const product = products.find((p) => p.id === parseInt(id));

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

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 3000);
  };

  return (
    <div className="bg-[#F9F6F0] text-[#2D3831] min-h-screen py-12 px-6">
      <div className="max-w-7xl mx-auto">

        <button 
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-xs tracking-[0.15em] uppercase text-[#2D3831]/70 hover:text-[#2D3831] mb-12 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          <div className="aspect-[4/5] bg-[#EBE5DE] overflow-hidden">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-8 lg:py-6">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#2D3831]/60 mb-2">{product.category}</p>
              <h1 className="text-3xl md:text-4xl font-serif text-[#2D3831] mb-4">{product.name}</h1>
              <p className="text-xl font-sans font-medium text-[#2D3831]">${product.price.toLocaleString()}</p>
            </div>

            <p className="text-sm tracking-wide text-[#2D3831]/80 leading-relaxed">
              {product.description}
            </p>

            <div className="border-t border-b border-[#2D3831]/10 py-6 space-y-4">
              <h3 className="text-xs font-sans tracking-[0.2em] uppercase text-[#2D3831]/60">Details & Materials</h3>
              <p className="text-xs tracking-wide text-[#2D3831]/70 leading-relaxed">
                {product.details}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <span className="text-xs tracking-[0.15em] uppercase text-[#2D3831]/70">Quantity</span>
                <div className="flex items-center border border-[#2D3831]/20">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 hover:bg-[#2D3831]/5 transition-colors"
                  >
                    -
                  </button>
                  <span className="px-4 text-sm">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 hover:bg-[#2D3831]/5 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full py-4 bg-[#2D3831] text-[#F9F6F0] text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity flex items-center justify-center space-x-3"
              >
                <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
                <span>Add to Cart — ${(product.price * quantity).toLocaleString()}</span>
              </button>

              {addedMessage && (
                <p className="text-center text-xs tracking-wider text-[#2D3831] font-medium animate-pulse">
                  Successfully added to your cart.
                </p>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}