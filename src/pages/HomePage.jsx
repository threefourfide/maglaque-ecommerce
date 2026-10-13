import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { DEFAULT_HOME_CONTENT, fetchHomeContent } from '../api';
import { onLive } from '../live';

export default function HomePage({ products, addToCart }) {
  const [homeContent, setHomeContent] = useState(DEFAULT_HOME_CONTENT);
  const [homeContentError, setHomeContentError] = useState('');
  const featuredProducts = products.filter((p) => p.featured);

  useEffect(() => {
    let active = true;
    const load = () => fetchHomeContent()
      .then((content) => {
        if (!active) return;
        setHomeContent({ ...DEFAULT_HOME_CONTENT, ...content });
        setHomeContentError('');
      })
      .catch((err) => {
        if (active) setHomeContentError(err.message);
      });
    load();
    const off = onLive((event) => {
      if (event.type === 'homepage') load();
    });
    return () => {
      active = false;
      off();
    };
  }, []);

  // Category tiles: first 4 categories, each with its count + a cover image
  const categoryTiles = [...new Set(products.map((p) => p.category))]
    .slice(0, 4)
    .map((name) => {
      const items = products.filter((p) => p.category === name);
      return { name, count: items.length, image: items[0].image, position: items[0].imagePosition };
    });

  return (
    <div className="bg-[#F9F6F0] text-[#2D3831] min-h-screen">

      <section className="relative flex min-h-[min(700px,calc(100svh-4rem))] items-center justify-center overflow-hidden bg-[#EBE5DE] py-16 sm:min-h-[75vh] sm:py-20">
        {homeContentError && (
          <p role="alert" className="absolute left-4 top-4 z-20 bg-red-50 px-4 py-2 text-xs text-red-700">
            Homepage text could not be refreshed: {homeContentError}
          </p>
        )}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=1920" 
            alt="ELLE Interior" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-5 px-5 text-center sm:space-y-6 sm:px-6">
          <h1 className="font-serif text-4xl leading-tight tracking-wide text-[#F9F6F0] sm:text-5xl md:text-6xl">
            {homeContent.heroTitle}
          </h1>
          <p className="mx-auto max-w-xl text-sm font-light leading-relaxed tracking-wide text-[#F9F6F0]/90 sm:text-base sm:tracking-widest">
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
        <h2 className="text-xs uppercase tracking-[0.3em] text-[#2D3831]/60">{homeContent.philosophyTitle}</h2>
        <p className="text-2xl md:text-3xl font-serif leading-relaxed text-[#2D3831]">
          “{homeContent.philosophyText}”
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

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-8 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} />
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex justify-between items-end mb-12 border-b border-[#2D3831]/10 pb-4">
          <div>
            <h2 className="text-xs tracking-[0.3em] uppercase text-[#2D3831]/60 mb-1">Browse</h2>
            <h3 className="text-3xl font-serif text-[#2D3831]">Shop by Category</h3>
          </div>
          <Link
            to="/catalog"
            className="text-xs tracking-[0.2em] uppercase hover:opacity-70 transition-opacity underline underline-offset-8"
          >
            Explore More
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Big tile: all pieces */}
          <Link
            to="/catalog"
            className="group relative col-span-2 lg:row-span-2 min-h-[320px] overflow-hidden bg-[#EBE5DE]"
          >
            <img
              src={products[0]?.image}
              alt="All pieces"
              style={{ objectPosition: products[0]?.imagePosition }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2D3831]/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-8 text-center text-[#F9F6F0]">
              <p className="text-3xl font-serif tracking-wide">All</p>
              <p className="text-xs tracking-[0.2em] uppercase mt-1">{products.length} items</p>
            </div>
          </Link>

          {/* Category tiles */}
          {categoryTiles.map((cat) => (
            <Link
              key={cat.name}
              to={`/catalog?category=${encodeURIComponent(cat.name)}`}
              className="group flex flex-col"
            >
              <div className="relative overflow-hidden aspect-[9/10] bg-[#EBE5DE] mb-4">
                <img
                  src={cat.image}
                  alt={cat.name}
                  style={{ objectPosition: cat.position }}
                  className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[#2D3831]/0 group-hover:bg-[#2D3831]/5 transition-colors duration-300" />
              </div>
              <p className="text-center font-serif text-lg text-[#2D3831]">{cat.name}</p>
              <p className="text-center text-xs tracking-wider text-[#2D3831]/60 uppercase">
                {cat.count} {cat.count === 1 ? 'item' : 'items'}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24">
  <div className="relative flex min-h-[420px] items-center overflow-hidden bg-[#2D3A31]">
    <img
      src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=1920"
      alt="ELLE showroom"
      className="absolute inset-0 h-full w-full object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-r from-[#2D3A31]/90 via-[#2D3A31]/60 to-transparent" />

    <div className="relative z-10 max-w-xl space-y-5 px-8 py-14 md:px-14">
      <p className="text-xs uppercase tracking-[0.3em] text-[#F9F6F0]/70">About Us</p>
      <h2 className="font-serif text-3xl leading-tight text-[#F9F6F0] md:text-5xl">
        Discover the Story Behind <span className="italic">ELLE</span>
      </h2>
      <p className="text-sm leading-relaxed tracking-wide text-[#F9F6F0]/85">
        Thoughtfully designed furniture and objects made to bring calm into everyday living.
        Learn who we are, what we believe in, and how every piece is made.
      </p>
      <div className="flex flex-wrap gap-4 pt-2">
        <Link
          to="/about"
          className="border border-[#F9F6F0] bg-[#F9F6F0] px-8 py-4 text-xs uppercase tracking-[0.2em] text-[#2D3A31] transition-colors hover:bg-transparent hover:text-[#F9F6F0]"
        >
          About Us
        </Link>
        <Link
          to="/catalog"
          className="border border-[#F9F6F0]/70 px-8 py-4 text-xs uppercase tracking-[0.2em] text-[#F9F6F0] transition-colors hover:bg-[#F9F6F0] hover:text-[#2D3A31]"
        >
          Explore Collection
        </Link>
      </div>
    </div>
  </div>
</section>

    </div>
  );
}