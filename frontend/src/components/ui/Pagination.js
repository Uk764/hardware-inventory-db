// Pagination.js
// Shows page numbers at bottom of product list

import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];

  // Show max 5 page numbers
  let startPage = Math.max(1, currentPage - 2);
  let endPage   = Math.min(totalPages, startPage + 4);

  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">

      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-gray-300 text-gray-600
                   hover:bg-gray-50 disabled:opacity-40 
                   disabled:cursor-not-allowed transition-colors"
      >
        <FiChevronLeft />
      </button>

      {/* Page numbers */}
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors
            ${page === currentPage
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
        >
          {page}
        </button>
      ))}

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-gray-300 text-gray-600
                   hover:bg-gray-50 disabled:opacity-40 
                   disabled:cursor-not-allowed transition-colors"
      >
        <FiChevronRight />
      </button>

    </div>
  );
};

export default Pagination;