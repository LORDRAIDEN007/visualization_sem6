// src/components/Controls/ViewToggle.js
import React from 'react';

const ViewToggle = ({ viewMode, setViewMode }) => {
  return (
    <div className="view-toggles">
      <button 
        className={`toggle-button ${viewMode === 'chart' ? 'active' : ''}`}
        onClick={() => setViewMode('chart')}
      >
        Chart View
      </button>
      <button 
        className={`toggle-button ${viewMode === 'table' ? 'active' : ''}`}
        onClick={() => setViewMode('table')}
      >
        Table View
      </button>
      <button 
        className={`toggle-button ${viewMode === 'split' ? 'active' : ''}`}
        onClick={() => setViewMode('split')}
      >
        Split View
      </button>
      <button 
        className={`toggle-button ${viewMode === 'workspace' ? 'active' : ''}`}
        onClick={() => setViewMode('workspace')}
      >
        Workspace View
      </button>
    </div>
  );
};

export default ViewToggle;