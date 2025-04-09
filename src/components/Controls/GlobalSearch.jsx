// src/components/Controls/GlobalSearch.js
import React from 'react';

const GlobalSearch = ({ searchTerm, setSearchTerm, resetFilters }) => {
  return (
    <div className="global-search">
      <input
        type="text"
        placeholder="Search across all columns..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <button 
        onClick={resetFilters}
        className="reset-button"
      >
        Reset All Filters
      </button>
    </div>
  );
};

export default GlobalSearch;