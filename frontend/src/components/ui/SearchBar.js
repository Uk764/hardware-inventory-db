// SearchBar.js
// Reusable search input component

import React from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

const SearchBar = ({ value, onChange, placeholder = 'Search...' }) => {
  return (
    <div className="relative">
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 
                            text-gray-400 text-lg" />
      <input
        type="text"
        className="input-field pl-10 pr-10 w-72"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 
                     text-gray-400 hover:text-gray-600"
        >
          <FiX />
        </button>
      )}
    </div>
  );
};

export default SearchBar;