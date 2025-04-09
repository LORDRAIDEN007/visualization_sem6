/**
 * Utility functions for data filtering and analysis
 */

/**
 * Apply all active filters to the dataset
 * @param {Array} data - The full dataset
 * @param {Object} filters - Object containing filter criteria for each column
 * @param {Array} numericColumns - Array of column names that contain numeric data
 * @returns {Array} Filtered data
 */
export const applyFilters = (data, filters, numericColumns) => {
  // If no filters are active, return all data
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }

  // Apply each filter to the data
  return data.filter(row => {
    // Check if row passes all filters
    return Object.keys(filters).every(column => {
      const filterValue = filters[column];
      const cellValue = row[column];
      
      // Skip if cell value is undefined or null
      if (cellValue === null || cellValue === undefined) {
        return false;
      }

      // Use the matchesFilter helper function
      return matchesFilter(row, column, filterValue);
    });
  });
};

/**
 * Helper function to determine if a row matches a specific filter
 * @param {Object} row - Data row
 * @param {string} column - Column name
 * @param {string} filterValue - Filter value/criteria
 * @returns {boolean} Whether the row matches the filter
 */


/**
 * Check if a value is numeric
 * @param {any} value - Value to check
 * @returns {boolean} True if the value is numeric
 */
export const isNumeric = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Check if a value is a valid date
 * @param {any} value - Value to check
 * @returns {boolean} True if the value is a valid date string
 */
export const isValidDate = (value) => {
  if (!value || typeof value !== 'string') return false;
  
  // Check if it matches date format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  
  return false;
};

/**
 * Identify numeric columns in the dataset
 * @param {Array} data - The dataset
 * @returns {Array} Array of column names that contain numeric data
 */
export const identifyNumericColumns = (data) => {
  if (!data || data.length === 0) return [];
  
  const firstRow = data[0];
  const numericColumns = [];
  
  // Check each column in the first row
  Object.keys(firstRow).forEach(column => {
    // Skip if it's a date column
    if (isValidDate(firstRow[column])) {
      return;
    }
    
    // Check if the majority of values are numeric
    const numericCount = data.reduce((count, row) => {
      const value = row[column];
      return (isNumeric(value) && value !== null && value !== '') ? count + 1 : count;
    }, 0);
    
    // If more than 70% of values are numeric, consider it a numeric column
    if (numericCount / data.length > 0.7) {
      numericColumns.push(column);
    }
  });
  
  return numericColumns;
};

/**
 * Get minimum and maximum values for numeric columns
 * @param {Array} data - The dataset
 * @param {Array} numericColumns - Array of column names that contain numeric data
 * @returns {Object} Object with min/max values for each numeric column
 */
export const getNumericColumnRanges = (data, numericColumns) => {
  const ranges = {};
  
  numericColumns.forEach(column => {
    const values = data
      .map(row => parseFloat(row[column]))
      .filter(val => !isNaN(val));
    
    if (values.length) {
      ranges[column] = {
        min: Math.min(...values),
        max: Math.max(...values)
      };
    } else {
      ranges[column] = { min: 0, max: 0 };
    }
  });
  
  return ranges;
};

/**
 * Get unique values for a column
 * @param {Array} data - The dataset
 * @param {string} column - Column name
 * @returns {Array} Array of unique values in the column
 */
export const getUniqueColumnValues = (data, column) => {
  const values = new Set();
  
  data.forEach(row => {
    if (row[column] !== undefined && row[column] !== null) {
      values.add(row[column].toString());
    }
  });
  
  return Array.from(values).sort();
};

/**
 * Alternative implementation of getUniqueValues using map/filter
 * @param {Array} data - The dataset
 * @param {string} column - Column name
 * @returns {Array} Array of unique values in the column
 */
export const getUniqueValues = (data, column) => {
  return [...new Set(data.map(row => row[column]))].filter(Boolean);
};

/**
 * Get statistics for a selected column
 * @param {Array} data - The dataset
 * @param {string} column - Column name
 * @returns {Object|null} Statistics object or null if column is not numeric
 */
export const getColumnStatistics = (data, column) => {
  if (!column || !data.length || !isNumeric(data[0][column])) return null;
  
  const values = data
    .map(row => parseFloat(row[column]))
    .filter(val => !isNaN(val));
  
  if (values.length === 0) return null;
  
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  return {
    min: min.toFixed(2),
    max: max.toFixed(2),
    average: avg.toFixed(2),
    median: median.toFixed(2),
    sum: sum.toFixed(2)
  };
};

/**
 * Get row background color based on matching filters
 * @param {Object} row - Data row
 * @param {Object} columnFilters - Applied filters
 * @param {Object} filterColors - Colors for different filters
 * @returns {string} CSS background color
 */


/**
 * Returns the visible rows for table virtualization
 * @param {Object} params - Parameters object
 * @param {Array} params.displayData - Data to display
 * @param {Object} params.tableContainerRef - Reference to table container
 * @param {number} params.visibleStartIndex - Starting index for visible rows
 * @param {number} params.bufferSize - Number of buffer rows (default: 10)
 * @param {number} params.estimatedRowHeight - Estimated height of each row (default: 40)
 * @returns {Array} - Array of visible rows
 */
export const getVisibleRows = ({
  displayData,
  tableContainerRef,
  visibleStartIndex,
  bufferSize = 10,
  estimatedRowHeight = 40
}) => {
  if (!tableContainerRef.current || displayData.length === 0) return displayData;

  const visibleRowCount = Math.ceil(tableContainerRef.current.clientHeight / estimatedRowHeight) + bufferSize * 2;
  const startIdx = Math.max(0, visibleStartIndex);
  const endIdx = Math.min(displayData.length, startIdx + visibleRowCount);

  return displayData.slice(startIdx, endIdx);
};