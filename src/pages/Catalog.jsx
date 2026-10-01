import React, { useState } from 'react';
import ProductCard from '../components/ProductCard';

export default function Catalog({ products, addToCart }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 3; // Number of items per page

  // Extract unique categories from products
  const categories = ['All', ...new Set(products.map((p) => p.category))];

  // Filter products based on category and search query
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate total pages
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  // Get current page products
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // Reset page when filter or search changes
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="bg-[#F9F6F0] text-[#2D3831] min-h-screen py-16 px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif tracking-wide">The Collection</h1>
          <p className="text-sm tracking-wider text-[#2D3831]/70">
            Thoughtfully curated furniture and objects designed to bring calm and harmony into your space.
          </p>
        </div>

        {/* Filters & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 border-b border-[#2D3831]/10 pb-8">
          
          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-5 py-2 text-xs tracking-[0.15em] uppercase transition-all duration-300 ${
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
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search pieces..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-transparent border border-[#2D3831]/20 px-4 py-2.5 text-sm text-[#2D3831] placeholder-[#2D3831]/40 focus:outline-none focus:border-[#2D3831]"
            />
          </div>

        </div>

        {/* Products Grid */}
        {currentProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-16">
              {currentProducts.map((product) => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-3 pt-8 border-t border-[#2D3831]/10">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-xs tracking-widest uppercase border border-[#2D3831]/20 disabled:opacity-30 hover:border-[#2D3831] transition-colors"
                >
                  Previous
                </button>

                <div className="flex space-x-2">
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`w-9 h-9 text-xs font-medium transition-colors ${
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
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-xs tracking-widest uppercase border border-[#2D3831]/20 disabled:opacity-30 hover:border-[#2D3831] transition-colors"
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