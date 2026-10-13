import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function Catalog({ products, addToCart }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 6;

  // Extract unique categories from products
  const categories = ['All', ...new Set(products.map((p) => p.category))];

  // Selected category comes from the URL (?category=Chairs), so home tiles can link here
  const categoryParam = searchParams.get('category');
  const selectedCategory = categories.includes(categoryParam) ? categoryParam : 'All';

  // Filter products based on category and search query
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(query) ||
                          (product.description || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  // Calculate total pages
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

  // Get current page products
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // Reset page when filter or search changes
  const handleCategoryChange = (category) => {
    setSearchParams(category === 'All' ? {} : { category });
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] px-4 py-10 text-[#2D3831] sm:px-6 sm:py-16">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mx-auto mb-10 max-w-2xl space-y-4 text-center sm:mb-16">
          <h1 className="font-serif text-4xl tracking-wide sm:text-5xl">The Collection</h1>
          <p className="text-sm leading-relaxed tracking-wider text-[#2D3831]/70">
            Thoughtfully curated furniture and objects designed to bring calm and harmony into your space.
          </p>
        </div>

        {/* Filters & Search Bar */}
        <div className="mb-8 space-y-5 border-b border-[#2D3831]/10 pb-6 sm:mb-12 sm:space-y-6 sm:pb-8">
          
          {/* Category Tabs */}
          <div aria-label="Filter by category" className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:gap-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={selectedCategory === category}
                onClick={() => handleCategoryChange(category)}
                className={`min-h-11 shrink-0 px-4 py-2 text-[11px] uppercase tracking-[0.15em] transition-all duration-300 sm:px-5 sm:text-xs ${
                  selectedCategory === category
                    ? 'bg-[#2D3831] text-[#F9F6F0]'
                    : 'bg-transparent text-[#2D3831] border border-[#2D3831]/20 hover:border-[#2D3831]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative block w-full sm:max-w-sm">
              <label htmlFor="catalog-search" className="sr-only">Search collection</label>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2D3831]/50" />
              <input
                id="catalog-search"
                type="text"
                inputMode="search"
                placeholder="Search pieces..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="min-h-11 w-full border border-[#2D3831]/20 bg-transparent py-2.5 pl-10 pr-10 text-sm text-[#2D3831] placeholder:text-[#2D3831]/40 focus:border-[#2D3831] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D3A31]/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-[#2D3831]/60 hover:text-[#2D3831]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <label className="flex min-h-11 items-center gap-3 text-xs uppercase tracking-[0.15em]">
              <span className="shrink-0 text-[#2D3831]/60">Sort by</span>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="min-h-11 w-full border border-[#2D3831]/20 bg-[#F9F6F0] px-3 text-sm normal-case tracking-normal focus:border-[#2D3831] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D3A31]/30 sm:w-auto"
              >
                <option value="featured">Featured</option>
                <option value="name">Name: A to Z</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </label>
          </div>
        </div>

        {/* Products Grid */}
        {currentProducts.length > 0 ? (
          <>
            <div aria-live="polite" className="mb-5 flex items-center justify-between text-xs tracking-wider text-[#2D3831]/60">
              <p>
                Showing {indexOfFirstProduct + 1}–{Math.min(indexOfLastProduct, sortedProducts.length)} of {sortedProducts.length} pieces
              </p>
              {(searchQuery || selectedCategory !== 'All' || sortBy !== 'featured') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSortBy('featured');
                    handleCategoryChange('All');
                  }}
                  className="min-h-11 px-2 underline underline-offset-4 hover:text-[#2D3831]"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="mb-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:mb-16 sm:gap-8 lg:grid-cols-3 lg:gap-10">
              {currentProducts.map((product) => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-[#2D3831]/10 pt-8 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="min-h-11 border border-[#2D3831]/20 px-3 py-2 text-[10px] uppercase tracking-widest transition-colors hover:border-[#2D3831] disabled:opacity-30 sm:px-4 sm:text-xs"
                >
                  Previous
                </button>

                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index + 1}
                      type="button"
                      onClick={() => setCurrentPage(index + 1)}
                      aria-label={`Page ${index + 1}`}
                      aria-current={currentPage === index + 1 ? 'page' : undefined}
                      className={`h-11 w-11 text-xs font-medium transition-colors ${
                        currentPage === index + 1
                          ? 'bg-[#2D3831] text-[#F9F6F0]'
                          : 'border border-[#2D3831]/20 text-[#2D3831] hover:border-[#2D3831]'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="min-h-11 border border-[#2D3831]/20 px-3 py-2 text-[10px] uppercase tracking-widest transition-colors hover:border-[#2D3831] disabled:opacity-30 sm:px-4 sm:text-xs"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24 space-y-4">
            <p className="font-serif text-2xl text-[#2D3831]">No pieces found.</p>
            <p className="text-xs tracking-wider text-[#2D3831]/60">Try adjusting your search or category filter.</p>
          </div>
        )}

      </div>
    </div>
  );
}