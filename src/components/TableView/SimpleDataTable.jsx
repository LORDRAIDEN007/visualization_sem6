import React, { useState, useEffect, useRef } from 'react';
import { isNumeric, getUniqueValues, getVisibleRows } from '../shared/utils';

const TableControls = ({
  currentPage,
  setCurrentPage,
  totalPages,
  rowsPerPage,
  setRowsPerPage,
  displayDataLength,
  filteredDataLength,
  totalDataLength
}) => {
  return (
    <div className="table-controls">
      <div className="rows-per-page">
        <label>Rows per page:</label>
        <select
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(parseInt(e.target.value));
            setCurrentPage(1);
          }}
        >
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={250}>250</option>
          <option value={500}>500</option>
        </select>
      </div>

      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(1)}
        >
          First
        </button>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        >
          Prev
        </button>
        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        >
          Next
        </button>
        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(totalPages)}
        >
          Last
        </button>
      </div>

      <div className="row-count">
        Showing {displayDataLength} of {filteredDataLength} filtered rows
        (Total: {totalDataLength} rows)
      </div>
    </div>
  );
};

const SimpleDataTable = ({
  columns = [],
  data = [],
  displayData = [],
  setDisplayData,
  filteredAndSortedData = [],
  currentPage = 1,
  setCurrentPage,
  rowsPerPage = 10,
  setRowsPerPage,
  sortConfig = { key: null, direction: 'ascending' },
  setSortConfig,
  handleCellEdit,
  columnFilters = {},
  setColumnFilters,
  numericColumnRanges = {},
  filterColors = {}
}) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [columnDropdowns, setColumnDropdowns] = useState({});
  const tableContainerRef = useRef(null);
  const filterButtonRefs = useRef({});
  const dropdownRefs = useRef({});

  // Toggle individual column filter dropdown
  const toggleColumnFilter = (column) => {
    setColumnDropdowns(prev => {
      const newState = {...prev};
      newState[column] = !prev[column];
      return newState;
    });
  };

  // Check if a column contains numeric data
  const isNumericColumn = (column) => {
    if (!data.length) return false;
    return isNumeric(data[0][column]);
  };

  // Get unique values for categorical filters
  const getColumnUniqueValues = (column) => {
    const values = getUniqueValues(data, column);
    return values.sort((a, b) => {
      if (a === null || a === undefined) return -1;
      if (b === null || b === undefined) return 1;
      return String(a).localeCompare(String(b));
    });
  };

  // Handle numeric range filter changes
  const handleRangeFilterChange = (column, min, max) => {
    const filterValue = `>=${min} & <=${max}`;
    setColumnFilters(prev => ({
      ...prev,
      [column]: filterValue
    }));
  };

  // Handle categorical multi-select filters
  const handleMultipleSelection = (column, selectedValues) => {
    if (!selectedValues.length) {
      // Remove filter if no values selected
      const newFilters = { ...columnFilters };
      delete newFilters[column];
      setColumnFilters(newFilters);
      return;
    }
    
    const filterValue = selectedValues.join('|');
    setColumnFilters(prev => ({
      ...prev,
      [column]: filterValue
    }));
  };

  // Clear filter for a specific column
  const clearFilter = (column) => {
    const newFilters = { ...columnFilters };
    delete newFilters[column];
    setColumnFilters(newFilters);
  };

  // Calculate total pages
  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);

  // Update display data when pagination changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    setDisplayData(filteredAndSortedData.slice(startIndex, endIndex));

    // Reset to first page when filters change
    if (startIndex >= filteredAndSortedData.length && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [filteredAndSortedData, currentPage, rowsPerPage, setDisplayData, setCurrentPage]);

  // Handle sorting
  const handleSort = (column) => {
    setSortConfig(prev => {
      if (prev.key === column) {
        // Toggle direction if same column
        return {
          key: column,
          direction: prev.direction === 'ascending' ? 'descending' : 'ascending'
        };
      }
      // Default to ascending for new column
      return { key: column, direction: 'ascending' };
    });
  };

  // Handle table scroll for virtualization
  const handleTableScroll = () => {
    if (!tableContainerRef.current) return;

    const container = tableContainerRef.current;
    const scrollTop = container.scrollTop;
    const rowHeight = 40; // Approximate row height in pixels
    const newStartIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 10); // Buffer of 10 rows

    setVisibleStartIndex(newStartIndex);
  };

  // Get visible rows for virtualized rendering
  const getVisibleRowsData = () => {
    return getVisibleRows({
      displayData,
      tableContainerRef,
      visibleStartIndex,
      bufferSize: 10,
      estimatedRowHeight: 40
    });
  };

  // Handle cell edit internally before passing to parent
  const handleCellEditInternal = (rowId, column, value) => {
    handleCellEdit(rowId, column, value);
    setEditingCell(null);
  };

  // Calculate dropdown position based on button position
  const getDropdownPosition = (column) => {
    if (!filterButtonRefs.current[column]) return { right: '0' };
    
    const buttonRect = filterButtonRefs.current[column].getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    
    // Calculate available space on all sides
    const rightSpace = viewportWidth - buttonRect.right;
    const leftSpace = buttonRect.left;
    const bottomSpace = viewportHeight - buttonRect.bottom;
    
    // Default dropdown dimensions
    const dropdownWidth = 250;
    const dropdownHeight = 300; // Estimated max height
    
    // Position object to return
    const position = {};
    
    // Horizontal positioning
    if (rightSpace >= dropdownWidth) {
      // Enough space on the right
      position.left = '0';
      position.right = 'auto';
    } else if (leftSpace >= dropdownWidth) {
      // Not enough space on right, but enough on left
      position.right = '100%';
      position.left = 'auto';
      position.marginRight = '5px'; // Small gap
    } else {
      // Not enough space on either side, center it and make it smaller if needed
      position.left = '50%';
      position.right = 'auto';
      position.transform = 'translateX(-50%)';
      position.width = Math.min(dropdownWidth, Math.max(rightSpace, leftSpace) * 2) + 'px';
    }
    
    // Vertical positioning
    if (bottomSpace < dropdownHeight) {
      // Not enough space below, position above if possible
      if (buttonRect.top > dropdownHeight) {
        position.bottom = '100%';
        position.top = 'auto';
        position.marginBottom = '5px';
      } else {
        // Not enough space above either, just position below and let it overflow with scrollbar
        position.top = '100%';
        position.bottom = 'auto';
        position.maxHeight = (bottomSpace - 20) + 'px'; // Leave some margin
      }
    } else {
      // Enough space below
      position.top = '100%';
      position.bottom = 'auto';
    }
    
    return position;
  };

  // Handle filter button click
  const handleFilterButtonClick = (e, column) => {
    e.stopPropagation();
    e.preventDefault();
    
    setColumnDropdowns(prev => {
      // Close all other dropdowns
      const newState = {};
      columns.forEach(col => {
        newState[col] = col === column ? !prev[column] : false;
      });
      return newState;
    });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If click is inside a dropdown or filter button, don't close
      let isInsideDropdown = false;
      
      // Check if clicked inside any dropdown
      Object.keys(dropdownRefs.current).forEach(column => {
        if (dropdownRefs.current[column] && dropdownRefs.current[column].contains(event.target)) {
          isInsideDropdown = true;
        }
      });
      
      // Check if clicked on any filter button
      Object.keys(filterButtonRefs.current).forEach(column => {
        if (filterButtonRefs.current[column] && filterButtonRefs.current[column].contains(event.target)) {
          isInsideDropdown = true;
        }
      });
      
      if (!isInsideDropdown) {
        setColumnDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="table-container" ref={tableContainerRef} onScroll={handleTableScroll}>
      <TableControls
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        displayDataLength={displayData.length}
        filteredDataLength={filteredAndSortedData.length}
        totalDataLength={data.length}
      />
      
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>
                  <div className="th-content" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span onClick={() => handleSort(column)} style={{ cursor: 'pointer', marginRight: '5px', flexGrow: 1 }}>
                      {column}
                      {sortConfig.key === column && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </span>
                    
                    <div className="filter-button-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
                      <button 
                        className={`column-filter-button ${columnFilters[column] ? 'active-filter' : ''}`}
                        onClick={(e) => handleFilterButtonClick(e, column)}
                        ref={(el) => filterButtonRefs.current[column] = el}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: columnFilters[column] ? '#e0e0ff' : 'transparent',
                          border: columnFilters[column] ? '1px solid #9090ff' : '1px solid #ddd',
                          borderRadius: '3px',
                          padding: '2px 5px',
                          fontSize: '12px'
                        }}
                      >
                        🔍
                      </button>
                      
                      {columnDropdowns[column] && (
                        <div 
                          className="column-filter-dropdown"
                          ref={(el) => dropdownRefs.current[column] = el}
                          style={{
                            position: 'absolute',
                            zIndex: 1000,
                            width: '250px',
                            backgroundColor: '#fff',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            padding: '10px',
                            marginTop: '5px',
                            overflowY: 'auto',
                            ...getDropdownPosition(column)
                          }}
                        >
                          <div className="filter-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <h4 style={{ margin: '0' }}>Filter: {column}</h4>
                            {columnFilters[column] && (
                              <button 
                                onClick={() => clearFilter(column)}
                                style={{
                                  padding: '3px 8px',
                                  backgroundColor: '#f0f0f0',
                                  border: '1px solid #ddd',
                                  borderRadius: '3px',
                                  cursor: 'pointer'
                                }}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          
                          {isNumericColumn(column) ? (
                            // Numeric range filter
                            <div className="numeric-filter">
                              <p style={{ margin: '5px 0' }}>Numeric Range:</p>
                              {numericColumnRanges[column] && (
                                <div className="range-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  <label style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ width: '40px' }}>Min:</span>
                                    <input
                                      type="number"
                                      defaultValue={numericColumnRanges[column].min}
                                      min={numericColumnRanges[column].min}
                                      max={numericColumnRanges[column].max}
                                      step="any"
                                      style={{ 
                                        marginLeft: '5px', 
                                        width: '80px',
                                        padding: '3px',
                                        border: '1px solid #ccc' 
                                      }}
                                      onChange={(e) => {
                                        const min = parseFloat(e.target.value);
                                        const maxInput = document.querySelector(`#max-${column}`);
                                        const max = maxInput ? parseFloat(maxInput.value) : numericColumnRanges[column].max;
                                        handleRangeFilterChange(column, min, max);
                                      }}
                                    />
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ width: '40px' }}>Max:</span>
                                    <input
                                      id={`max-${column}`}
                                      type="number"
                                      defaultValue={numericColumnRanges[column].max}
                                      min={numericColumnRanges[column].min}
                                      max={numericColumnRanges[column].max}
                                      step="any"
                                      style={{ 
                                        marginLeft: '5px', 
                                        width: '80px',
                                        padding: '3px',
                                        border: '1px solid #ccc'
                                      }}
                                      onChange={(e) => {
                                        const max = parseFloat(e.target.value);
                                        const minInputs = document.querySelectorAll(`input[min="${numericColumnRanges[column].min}"]`);
                                        const minInput = minInputs[0];
                                        const min = minInput ? parseFloat(minInput.value) : numericColumnRanges[column].min;
                                        handleRangeFilterChange(column, min, max);
                                      }}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Categorical multi-select filter
                            <div className="categorical-filter">
                              <p style={{ margin: '5px 0' }}>Select Values:</p>
                              <div 
                                className="value-checkboxes"
                                style={{ 
                                  maxHeight: '200px', 
                                  overflowY: 'auto', 
                                  border: '1px solid #eee', 
                                  padding: '5px',
                                  marginBottom: '10px'
                                }}
                              >
                                {getColumnUniqueValues(column).map((value, idx) => {
                                  const currentValues = columnFilters[column] ? 
                                    columnFilters[column].split('|') : [];
                                  const isSelected = currentValues.includes(String(value));
                                  
                                  return (
                                    <div key={`${column}-${idx}`} className="checkbox-item" style={{ margin: '3px 0' }}>
                                      <label style={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          style={{ marginRight: '5px' }}
                                          onChange={(e) => {
                                            let newValues;
                                            if (e.target.checked) {
                                              newValues = [...currentValues, String(value)];
                                            } else {
                                              newValues = currentValues.filter(v => v !== String(value));
                                            }
                                            
                                            handleMultipleSelection(column, newValues);
                                          }}
                                        />
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {value === null || value === undefined ? '(Blank)' : String(value)}
                                        </span>
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          <div className="filter-actions" style={{ marginTop: '10px', textAlign: 'right' }}>
                            <button 
                              onClick={() => toggleColumnFilter(column)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#4a4a4a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getVisibleRowsData().map(row => (
              <tr key={row.__row_id}>
                {columns.map(column => (
                  <td key={`${row.__row_id}-${column}`} className="data-cell">
                    {editingCell &&
                      editingCell.row === row.__row_id &&
                      editingCell.column === column ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellEditInternal(row.__row_id, column, editValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCellEditInternal(row.__row_id, column, editValue);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div
                        className="cell-content"
                        onClick={() => {
                          setEditingCell({ row: row.__row_id, column });
                          setEditValue(row[column]);
                        }}
                      >
                        {row[column]}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SimpleDataTable;