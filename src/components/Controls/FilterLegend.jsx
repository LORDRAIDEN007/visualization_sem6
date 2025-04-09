import React from 'react';
import PropTypes from 'prop-types';
import '../../App.css';

const FilterLegend = ({ 
  columnFilters = {}, 
  setColumnFilters,
  filterColors = {}, 
  COLOR_PALETTE = [
    'rgba(75, 192, 192, 0.6)',   // Teal
    'rgba(255, 99, 132, 0.6)',   // Pink
    'rgba(54, 162, 235, 0.6)',   // Blue
    'rgba(255, 206, 86, 0.6)',   // Yellow
    'rgba(153, 102, 255, 0.6)',  // Purple
    'rgba(255, 159, 64, 0.6)',   // Orange
    'rgba(199, 199, 199, 0.6)',  // Gray
    'rgba(83, 102, 255, 0.6)',   // Indigo
    'rgba(40, 159, 64, 0.6)',    // Green
    'rgba(210, 99, 132, 0.6)'    // Coral
  ]
}) => {
  if (Object.keys(columnFilters).length === 0) return null;
  
  return (
    <div className="filter-legend">
      <h4>Active Filters</h4>
      <div className="legend-items">
        {Object.entries(columnFilters).map(([column, filterValue], index) => {
          if (!filterValue) return null;
          
          let filterDescription = '';
          // Create a friendly filter description
          if (filterValue.includes('>=') && filterValue.includes('<=')) {
            const parts = filterValue.split('&');
            const min = parts[0].replace('>=', '').trim();
            const max = parts[1].replace('<=', '').trim();
            filterDescription = `${min} to ${max}`;
          } else if (filterValue.includes('|')) {
            const values = filterValue.split('|');
            if (values.length <= 3) {
              filterDescription = values.join(', ');
            } else {
              filterDescription = `${values.length} selected values`;
            }
          } else {
            filterDescription = filterValue;
          }
          
          const color = filterColors[column] || COLOR_PALETTE[index % COLOR_PALETTE.length];
          
          return (
            <div key={column} className="legend-item">
              <div 
                className="color-box" 
                style={{ backgroundColor: color }}
              ></div>
              <div className="legend-text">
                <strong>{column}:</strong> {filterDescription}
              </div>
              <button 
                className="remove-filter" 
                onClick={() => {
                  setColumnFilters(prev => {
                    const newFilters = {...prev};
                    delete newFilters[column];
                    return newFilters;
                  });
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

FilterLegend.propTypes = {
  columnFilters: PropTypes.object,
  setColumnFilters: PropTypes.func.isRequired,
  filterColors: PropTypes.object,
  COLOR_PALETTE: PropTypes.array
};

export default FilterLegend;