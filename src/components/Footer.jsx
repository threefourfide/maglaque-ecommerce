import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, X } from 'lucide-react';
import { subscribeToNewsletter } from '../api';

const footerInfo = {
  shipping: {
    title: 'Shipping & Delivery',
    paragraphs: [
      'Available delivery options and shipping charges are shown during checkout after you select a delivery address.',
      'You can check an order’s latest status from My Account → My Purchase.',
    ],
  },
  returns: {
    title: 'Returns & Exchanges',
    paragraphs: [
      'Please review your item and order details before placing an order. A detailed returns and exchanges policy is not currently available on this site.',
      'For an order already in progress, check its status in My Account → My Purchase.',
    ],
  },
  care: {
    title: 'Care Instructions',
    paragraphs: [
      'Care needs vary by material and finish. Check the product details for material information and follow any care guidance provided with your item.',
      'If you are unsure how to clean a surface, test a suitable method on a small, inconspicuous area first.',
    ],
  },
  contact: {
    title: 'Contact Us',
    paragraphs: [
      'ELLE has not configured a public phone number or support email yet.',
      'For order updates, visit My Account → My Purchase. Your order details include the delivery information used at checkout.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    paragraphs: [
      'ELLE stores account details to provide sign-in and account features, and uses delivery details to process and track orders.',
      'Product reviews may be displayed on the storefront with the reviewer name shown by the site. Newsletter email addresses are stored so ELLE can manage Journal subscriptions.',
      'This site does not currently provide newsletter unsubscribe controls or a detailed privacy contact. Please avoid subscribing if you do not want your email stored for this purpose.',
    ],
  },
  terms: {
    title: 'Terms of Service',
    paragraphs: [
      'Product details, availability, and prices are presented on the storefront and may change. An order is subject to the status shown in your account.',
      'Cash on Delivery is the payment method currently offered at checkout.',
      'A detailed returns, warranty, and dispute-resolution policy is not currently available on this site.',
    ],
  },
};

export default function Footer() {
  const [activeInfo, setActiveInfo] = useState(null);
  const [email, setEmail] = useState('');
  const [newsletterMessage, setNewsletterMessage] = useState(null);
  const [newsletterBusy, setNewsletterBusy] = useState(false);

  useEffect(() => {
    if (!activeInfo) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActiveInfo(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeInfo]);

  const handleSubscribe = async (event) => {
    event.preventDefault();
    setNewsletterBusy(true);
    setNewsletterMessage(null);
    try {
      const result = await subscribeToNewsletter(email);
      setNewsletterMessage({ type: 'success', text: result.message });
      setEmail('');
    } catch (err) {
      setNewsletterMessage({ type: 'error', text: err.message });
    } finally {
      setNewsletterBusy(false);
    }
  };

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
            <li><Link to="/about" className="hover:opacity-70 transition-opacity">About Us</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-sans tracking-[0.2em] uppercase mb-6 text-[#F9F6F0]/50">Care &amp; Support</h3>
          <ul className="space-y-3 text-sm tracking-wider text-[#F9F6F0]/80">
            <li><button type="button" onClick={() => setActiveInfo('shipping')} className="text-left transition-opacity hover:opacity-70">Shipping &amp; Delivery</button></li>
            <li><button type="button" onClick={() => setActiveInfo('returns')} className="text-left transition-opacity hover:opacity-70">Returns &amp; Exchanges</button></li>
            <li><button type="button" onClick={() => setActiveInfo('care')} className="text-left transition-opacity hover:opacity-70">Care Instructions</button></li>
            <li><button type="button" onClick={() => setActiveInfo('contact')} className="text-left transition-opacity hover:opacity-70">Contact Us</button></li>
          </ul>
        </div>

        <div className="space-y-4 md:col-span-1">
          <h3 className="text-xs font-sans tracking-[0.2em] uppercase text-[#F9F6F0]/50">Journal</h3>
          <p className="text-xs text-[#F9F6F0]/70 tracking-wide">
            Subscribe to receive updates on new collections and private design releases.
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col space-y-2">
            <input 
              type="email" 
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setNewsletterMessage(null);
              }}
              placeholder="Enter your email"
              aria-label="Enter your email"
              autoComplete="email"
              required
              className="bg-transparent border border-[#F9F6F0]/30 px-4 py-3 text-sm text-[#F9F6F0] placeholder-[#F9F6F0]/40 focus:outline-none focus:border-[#F9F6F0]"
            />
            <button 
              type="submit"
              disabled={newsletterBusy}
              className="py-3 bg-[#F9F6F0] text-[#2D3831] text-xs tracking-[0.15em] uppercase hover:bg-[#F9F6F0]/90 transition-colors"
            >
              {newsletterBusy ? 'Submitting...' : 'Subscribe'}
            </button>
            {newsletterMessage && (
              <p role={newsletterMessage.type === 'error' ? 'alert' : 'status'} className={`text-xs ${newsletterMessage.type === 'error' ? 'text-red-200' : 'text-[#F9F6F0]/80'}`}>
                {newsletterMessage.text}
              </p>
            )}
          </form>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-[#F9F6F0]/50 tracking-wider">
        <p>&copy; {new Date().getFullYear()} ELLE Furniture. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <button type="button" onClick={() => setActiveInfo('privacy')} className="hover:underline">Privacy Policy</button>
          <button type="button" onClick={() => setActiveInfo('terms')} className="hover:underline">Terms of Service</button>
        </div>
      </div>

      {activeInfo && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveInfo(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-info-title"
            className="relative w-full max-w-lg bg-[#F9F6F0] px-6 py-8 text-[#26302A] shadow-2xl sm:px-9"
          >
            <button
              type="button"
              onClick={() => setActiveInfo(null)}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-[#7D8179] transition-colors hover:bg-[#F0EADD] hover:text-[#26302A]"
            >
              <X className="h-5 w-5" />
            </button>
            <Info className="mb-4 h-9 w-9 stroke-[1.4] text-[#2D6A4F]" aria-hidden="true" />
            <h2 id="footer-info-title" className="pr-10 font-serif text-3xl">{footerInfo[activeInfo].title}</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#4D554F]">
              {footerInfo[activeInfo].paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <button
              type="button"
              onClick={() => setActiveInfo(null)}
              className="mt-7 min-h-11 bg-[#2D3A31] px-8 py-3 text-xs uppercase tracking-[0.2em] text-[#F9F6F0] transition-opacity hover:opacity-90"
            >
              Close
            </button>
          </section>
        </div>
      )}
    </footer>
  );
}