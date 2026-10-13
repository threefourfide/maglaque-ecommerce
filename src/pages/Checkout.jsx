import { useEffect, useState } from 'react';
import { fetchShippingRates, fetchShippingPromos } from '../api';
import { goBack } from '../utils/nav';
import { onLive } from '../live';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, MoreHorizontal, Plus, Check } from 'lucide-react';

const formatAddress = (a) =>
  [a.street, a.barangay, a.city, a.province, a.zip].filter(Boolean).join(', ');

export default function Checkout({ cart, clearCart, addOrder, user, addresses = [] }) {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');

  const [rates, setRates] = useState([]);
  const [promos, setPromos] = useState([]);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  useEffect(() => {
    const load = () => {
      fetchShippingRates()
        .then(({ rates: list }) => {
          setRates(list);
          setRatesLoaded(true);
        })
        .catch(() => { });
      fetchShippingPromos()
        .then(({ promos: list }) => setPromos(list))
        .catch(() => { });
    };
    load();
    return onLive((event) => {
      if (event.type === 'shipping' || event.type === 'products') load();
    });
  }, []);

  const overStock = cart.find((i) => i.stock !== undefined && i.quantity > i.stock);

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  // Chosen address: the one picked, else the default, else the first saved one
  const selected =
    addresses.find((a) => a.id === selectedId) ||
    addresses.find((a) => a.isDefault) ||
    addresses[0] ||
    null;

  const rateFor = (a) => (a ? rates.find((r) => (a.regionCode && r.region_code === a.regionCode) || r.region === a.region) : null);
  const baseRate = rateFor(selected)?.rate ?? 0;
  const promo = promos
    .filter((p) => subtotal >= p.minSpend)
    .sort((a, b) => b.percent - a.percent)[0];
  const shippingFee = promo ? Math.round(baseRate * (100 - promo.percent)) / 100 : baseRate;
  const nextPromo = baseRate > 0
    ? promos.filter((p) => subtotal < p.minSpend).sort((a, b) => a.minSpend - b.minSpend)[0]
    : null;
  const grandTotal = subtotal + shippingFee;

  // Addresses are managed in the account page
  const goAddAddress = () =>
    navigate('/account', { state: { tab: 'addresses', addAddress: true } });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected || placing) return;
    setPlacing(true);
    setOrderError('');
    try {
      await addOrder({ addressId: selected.id });
      setIsSubmitted(true);
      clearCart();
    } catch (err) {
      setOrderError(err.message || 'Could not place your order.');
    } finally {
      setPlacing(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-[#F9F6F0] min-h-[75vh] flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="max-w-md space-y-6">
          <CheckCircle2 className="w-16 h-16 mx-auto text-[#2D3831] stroke-[1]" />
          <h1 className="text-3xl md:text-4xl font-serif text-[#2D3831]">Order Confirmed</h1>
          <p className="text-xs tracking-wider text-[#2D3831]/70 leading-relaxed">
            Thank you for your order. We have received your purchase and are carefully preparing your pieces for shipment. A confirmation email has been sent to {user?.email}.
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

  // Addresses live in the account, so checkout needs a signed-in user
  if (!user) {
    return (
      <div className="bg-[#F9F6F0] min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-3xl font-serif text-[#2D3831] mb-4">Sign in to Check Out</h2>
        <p className="text-xs tracking-wider text-[#2D3831]/60 mb-8">Your shipping addresses are saved in your account.</p>
        <Link
          to="/auth"
          className="px-8 py-3 bg-[#2D3831] text-[#F9F6F0] text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
        >
          Sign In
        </Link>
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
    <div className="min-h-screen bg-[#F9F6F0] px-4 py-10 text-[#2D3831] sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">

        <button
          onClick={() => goBack(navigate, '/cart')}
          className="mb-8 flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#2D3831]/70 transition-colors hover:text-[#2D3831] sm:mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <h1 className="mb-8 border-b border-[#2D3831]/10 pb-5 font-serif text-3xl sm:mb-12 sm:pb-6 sm:text-4xl">Checkout</h1>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-16">

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-xs font-sans tracking-[0.2em] uppercase text-[#2D3831]/60">Shipping Address</h2>

              {/* Ship To row */}
              <div className="flex items-start gap-2 sm:gap-4">
                <span className="w-14 shrink-0 pt-4 text-[10px] uppercase tracking-[0.15em] text-[#2D3831]/60 sm:w-16 sm:text-xs">Ship To</span>

                <div className="min-w-0 flex-1 border border-[#2D3831]/20 bg-[#EBE5DE]/40 px-3 py-3 text-xs sm:px-4 sm:text-sm">
                  {selected ? (
                    <>
                      <p className="font-medium">
                        {selected.name}
                        <span className="font-normal text-[#2D3831]/60"> · {selected.phone}</span>
                      </p>
                      <p className="mt-1 text-[#2D3831]/80">{formatAddress(selected)}</p>
                      {selected.isDefault && (
                        <span className="mt-2 inline-block border border-[#2D3831]/30 px-2 py-0.5 text-[10px] tracking-widest">
                          DEFAULT
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="py-1 text-[#2D3831]/60">You have no saved shipping address yet.</p>
                  )}
                </div>

                {/* "..." menu: choose another address or add a new one */}
                {selected && (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((o) => !o)}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      aria-label="Choose shipping address"
                      title="Choose address"
                      className="p-3 text-[#2D3831]/70 transition-colors hover:text-[#2D3831]"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>

                    {menuOpen && (
                      <>
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label="Close menu"
                          onClick={() => setMenuOpen(false)}
                          className="fixed inset-0 z-10 cursor-default"
                        />
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-20 mt-2 w-80 max-w-[80vw] border border-[#2D3831]/15 bg-[#F9F6F0] shadow-lg"
                        >
                          <ul className="max-h-72 divide-y divide-[#2D3831]/10 overflow-y-auto">
                            {addresses.map((a) => (
                              <li key={a.id}>
                                <button
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={a.id === selected.id}
                                  onClick={() => {
                                    setSelectedId(a.id);
                                    setMenuOpen(false);
                                  }}
                                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[#2D3831]/5"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate font-medium">{a.name}</span>
                                    <span className="block text-xs text-[#2D3831]/70">{formatAddress(a)}</span>
                                  </span>
                                  {a.id === selected.id && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
                                </button>
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={goAddAddress}
                            className="flex w-full items-center gap-2 border-t border-[#2D3831]/10 px-4 py-3 text-xs tracking-[0.15em] uppercase transition-colors hover:bg-[#2D3831]/5"
                          >
                            <Plus className="h-4 w-4" />
                            Add new address
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!selected && (
                <button
                  type="button"
                  onClick={goAddAddress}
                  className="flex items-center gap-2 border border-[#2D3831] px-6 py-3 text-xs tracking-[0.2em] uppercase transition-colors hover:bg-[#2D3831] hover:text-[#F9F6F0]"
                >
                  <Plus className="h-4 w-4" />
                  Add address
                </button>
              )}
            </div>

            <div className="space-y-6 pt-6 border-t border-[#2D3831]/10">
              <h2 className="text-xs font-sans tracking-[0.2em] uppercase text-[#2D3831]/60">Payment Method</h2>

              <div className="space-y-3">

                <label className="flex items-center space-x-3 border border-[#2D3831]/20 bg-[#EBE5DE]/40 p-4 cursor-pointer hover:border-[#2D3831]">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="accent-[#2D3831]"
                  />
                  <span className="text-sm tracking-wide">Cash on Delivery</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={!selected || placing || !!overStock}
              className="w-full py-4 bg-[#2D3831] text-[#F9F6F0] text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {placing ? 'Placing order...' : 'Place Order'}
            </button>
            {overStock && (
              <p role="alert" className="-mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">
                {overStock.stock <= 0 ? `${overStock.name} is out of stock.` : `${overStock.name} only has ${overStock.stock} left.`} Update your cart to continue.
              </p>
            )}
            {orderError && (
              <p role="alert" className="-mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">
                {orderError}
              </p>
            )}
            {!selected && (
              <p className="-mt-4 text-xs tracking-wider text-[#2D3831]/60">
                Add a shipping address to place your order.
              </p>
            )}
          </form>

          <div className="space-y-5 border border-[#2D3831]/10 bg-[#EBE5DE]/40 p-5 sm:space-y-6 sm:p-8 lg:sticky lg:top-24">
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
                  <span className="font-medium">₱{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#2D3831]/10 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#2D3831]/70">Subtotal</span>
                <span>₱{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#2D3831]/70">Shipping</span>
                {!selected ? (
                  <span className="text-xs text-[#2D3831]/60">Choose an address</span>
                ) : !ratesLoaded ? (
                  <span className="text-xs text-[#2D3831]/60">Calculating...</span>
                ) : shippingFee > 0 ? (
                  <span className="flex items-baseline gap-2">
                    {baseRate !== shippingFee && (
                      <span className="text-xs text-[#2D3831]/50 line-through">₱{baseRate.toLocaleString()}</span>
                    )}
                    ₱{shippingFee.toLocaleString()}
                  </span>
                ) : (
                  <span className="flex items-baseline gap-2">
                    {baseRate > 0 && (
                      <span className="text-xs text-[#2D3831]/50 line-through">₱{baseRate.toLocaleString()}</span>
                    )}
                    <span className="text-xs uppercase tracking-wider">Free shipping</span>
                  </span>
                )}
              </div>
              {selected && (
                <p className="text-[11px] tracking-wide text-[#2D3831]/50">
                  Shipping to {selected.region}
                  {promo && baseRate > 0 ? ` · ${promo.name} applied` : ''}
                </p>
              )}
              {nextPromo && (
                <p className="text-[11px] tracking-wide text-[#2D6A4F]">
                  Spend ₱{(nextPromo.minSpend - subtotal).toLocaleString()} more to get {nextPromo.percent === 100 ? 'free shipping' : `${nextPromo.percent}% off shipping`} ({nextPromo.name}).
                </p>
              )}
              <div className="flex justify-between text-base font-medium pt-2 border-t border-[#2D3831]/10">
                <span>Total</span>
                <span>₱{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}