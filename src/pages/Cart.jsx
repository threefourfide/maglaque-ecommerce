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
    <div className="min-h-screen bg-[#F9F6F0] px-4 py-10 text-[#2D3831] sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        
        <h1 className="mb-8 border-b border-[#2D3831]/10 pb-5 font-serif text-3xl sm:mb-12 sm:pb-6 sm:text-4xl">Your Cart</h1>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3 lg:gap-16">

          <div className="space-y-6 lg:col-span-2 lg:space-y-8">
            {cart.map((item) => (
              <div key={item.id} className="flex flex-col items-start justify-between gap-4 border-b border-[#2D3831]/10 pb-6 sm:flex-row sm:items-center sm:gap-6 sm:pb-8">

                <div className="flex min-w-0 items-center gap-4 sm:gap-6">
                  <div className="h-24 w-20 shrink-0 overflow-hidden bg-[#EBE5DE] sm:h-28 sm:w-24">
                    <img src={item.image} alt={item.name} style={{ objectPosition: item.imagePosition }} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#2D3831]/60 mb-1">{item.category}</p>
                    <h3 className="mb-2 break-words font-serif text-base text-[#2D3831] sm:text-lg">{item.name}</h3>
                    <p className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-[#2D3831]">
                      {item.discountPercent > 0 && (
                        <span className="text-xs font-normal text-[#2D3831]/50 line-through">
                          ₱{item.originalPrice.toLocaleString()}
                        </span>
                      )}
                      ₱{item.price.toLocaleString()}
                      {item.discountPercent > 0 && (
                        <span className="bg-[#2D3A31] px-1.5 py-0.5 text-[10px] font-normal tracking-widest text-[#F9F6F0]">
                          -{item.discountPercent}%
                        </span>
                      )}
                    </p>
                    {item.stock !== undefined && item.stock <= 0 && (
                      <p className="mt-1 text-xs text-red-700">Out of stock</p>
                    )}
                    {item.stock > 0 && item.quantity >= item.stock && (
                      <p className="mt-1 text-xs text-[#B7791F]">Only {item.stock} in stock</p>
                    )}
                  </div>
                </div>

                <div className="flex w-full items-center justify-between sm:w-auto sm:gap-8">
                  <div className="flex items-center border border-[#2D3831]/20">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name} quantity`}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-[#2D3831]/5"
                    >
                      -
                    </button>
                    <span aria-live="polite" className="min-w-10 px-2 text-center text-xs">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${item.name} quantity`}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.stock !== undefined && item.quantity >= item.stock}
                      className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-[#2D3831]/5 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.name} from cart`}
                    title="Remove item"
                    className="flex h-11 w-11 items-center justify-center text-[#2D3831]/50 transition-colors hover:text-[#2D3831]"
                  >
                    <Trash2 className="w-4 h-4 stroke-[1.5]" />
                  </button>
                </div>

              </div>
            ))}
          </div>

          <div className="space-y-5 border border-[#2D3831]/10 bg-[#EBE5DE]/40 p-5 sm:space-y-6 sm:p-8 lg:sticky lg:top-24">
            <h3 className="text-xs font-sans tracking-[0.2em] uppercase border-b border-[#2D3831]/10 pb-4">Order Summary</h3>
            
            <div className="flex justify-between text-sm tracking-wide">
              <span className="text-[#2D3831]/70">Subtotal</span>
              <span className="font-medium">₱{subtotal.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-sm tracking-wide">
              <span className="text-[#2D3831]/70">Shipping</span>
              <span className="text-xs uppercase tracking-wider text-[#2D3831]/60">Calculated at checkout</span>
            </div>

            <div className="border-t border-[#2D3831]/10 pt-4 flex justify-between text-base font-medium">
              <span>Total</span>
              <span>₱{subtotal.toLocaleString()}</span>
            </div>

            <button
              type="button"
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