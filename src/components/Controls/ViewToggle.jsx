import { useState, useEffect } from 'react';

const ViewToggle = ({ viewMode, setViewMode }) => {
  // Track if table has been initialized
  const [tableInitialized, setTableInitialized] = useState(false);
  
  // When table view is shown, mark it as initialized
  useEffect(() => {
    if (viewMode === 'table') {
      setTableInitialized(true);
    }
  }, [viewMode]);
  
  // Handle view mode change with table initialization check
  const handleViewChange = (newMode) => {
    // If switching to split view but table hasn't been initialized yet
    if (newMode === 'split' && !tableInitialized) {
      // Briefly show table view to initialize components
      setViewMode('table');
      // Then switch to split view after a short delay
      setTimeout(() => {
        setViewMode('split');
      }, 100);
      // Mark table as initialized
      setTableInitialized(true);
    } else {
      // For all other cases, just set the view mode directly
      setViewMode(newMode);
    }
  };

  return (
    <div className="view-toggles">
      <button 
        className={`toggle-button ${viewMode === 'chart' ? 'active' : ''}`}
        onClick={() => handleViewChange('chart')}
      >
        Chart View
      </button>
      <button 
        className={`toggle-button ${viewMode === 'table' ? 'active' : ''}`}
        onClick={() => handleViewChange('table')}
      >
        Table View
      </button>
      <button 
        className={`toggle-button ${viewMode === 'split' ? 'active' : ''}`}
        onClick={() => handleViewChange('split')}
      >
        Split View
      </button>
      <button 
        className={`toggle-button ${viewMode === 'workspace' ? 'active' : ''}`}
        onClick={() => handleViewChange('workspace')}
      >
        Workspace View
      </button>
    </div>
  );
};

export default ViewToggle;