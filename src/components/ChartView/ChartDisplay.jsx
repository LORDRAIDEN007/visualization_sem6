import React, { useMemo, useRef, useEffect, useState } from 'react';
import { ChartComponents, getChartOptions } from '../shared/constants';
import { getChartData } from '../shared/chartUtils';
import { isNumeric } from '../shared/utils';
import 'chartjs-plugin-zoom'; // Import the zoom plugin

// Color palette for categorical data
const CATEGORICAL_COLORS = [
  'rgba(255, 99, 132, 0.7)',   // Red
  'rgba(54, 162, 235, 0.7)',   // Blue
  'rgba(255, 206, 86, 0.7)',   // Yellow
  'rgba(75, 192, 192, 0.7)',   // Green
  'rgba(153, 102, 255, 0.7)',  // Purple
  'rgba(255, 159, 64, 0.7)',   // Orange
  'rgba(199, 199, 199, 0.7)',  // Grey
  'rgba(83, 102, 255, 0.7)',   // Indigo
  'rgba(255, 99, 255, 0.7)',   // Pink
  'rgba(0, 128, 128, 0.7)',    // Teal
];

// Border colors (darker version of the fill colors)
const CATEGORICAL_BORDERS = [
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 206, 86)',
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
  'rgb(255, 159, 64)',
  'rgb(199, 199, 199)',
  'rgb(83, 102, 255)',
  'rgb(255, 99, 255)',
  'rgb(0, 128, 128)',
];

const ChartDisplay = ({ 
  xAxis, 
  yAxis, 
  graphType, 
  data, 
  filteredAndSortedData, 
  columnFilters, 
  filterColors, 
  viewMode 
}) => {
  // Create a key to force chart re-rendering
  const [chartKey, setChartKey] = useState(0);
  const chartRef = useRef(null);
  
  // Flag to check if filters are applied
  const hasActiveFilters = useMemo(() => {
    if (!columnFilters) return false;
    return Object.values(columnFilters).some(filter => 
      filter && (
        (Array.isArray(filter) && filter.length > 0) || 
        (typeof filter === 'object' && (filter.min !== undefined || filter.max !== undefined)) ||
        (typeof filter === 'string' && filter.trim() !== '')
      )
    );
  }, [columnFilters]);
  
  const ChartComponent = ChartComponents[graphType];
  
  // Hard reset function - completely re-renders the chart
  const resetZoom = () => {
    // Force a complete re-render of the chart by changing its key
    setChartKey(prevKey => prevKey + 1);
  };
  
  // Use useMemo to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    if (!xAxis || !yAxis || !data.length) return null;
    
    // Get basic chart data from the utility function
    const basicChartData = getChartData({
      xAxis,
      yAxis,
      graphType,
      data,
      filteredAndSortedData,
      columnFilters,
      filterColors
    });
    
    // If X-axis is non-numeric, enhance with colors
    const isXAxisCategorical = !isNumeric(data[0]?.[xAxis]);
    
    if (isXAxisCategorical) {
      // Different chart types need different color application strategies
      switch (graphType) {
        case 'bar':
        case 'horizontalBar':
          return {
            ...basicChartData,
            datasets: basicChartData.datasets.map(dataset => ({
              ...dataset,
              backgroundColor: basicChartData.labels.map((_, index) => 
                CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
              ),
              borderColor: basicChartData.labels.map((_, index) => 
                CATEGORICAL_BORDERS[index % CATEGORICAL_BORDERS.length]
              ),
              borderWidth: 1
            }))
          };
          
        case 'line':
          // For line charts, we keep a single color per line but make it more vibrant
          return {
            ...basicChartData,
            datasets: basicChartData.datasets.map((dataset, datasetIndex) => ({
              ...dataset,
              borderColor: CATEGORICAL_BORDERS[datasetIndex % CATEGORICAL_BORDERS.length],
              backgroundColor: 'rgba(0, 0, 0, 0.05)', // Light background for the area under the line
              borderWidth: 2,
              pointBackgroundColor: CATEGORICAL_BORDERS[datasetIndex % CATEGORICAL_BORDERS.length],
              pointRadius: 4
            }))
          };
          
        case 'pie':
        case 'doughnut':
          // Pie and doughnut charts already have automatic coloring
          // But we can make it consistent with our palette
          return {
            ...basicChartData,
            datasets: basicChartData.datasets.map(dataset => ({
              ...dataset,
              backgroundColor: basicChartData.labels.map((_, index) => 
                CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
              ),
              borderColor: basicChartData.labels.map((_, index) => 
                CATEGORICAL_BORDERS[index % CATEGORICAL_BORDERS.length]
              ),
              borderWidth: 1
            }))
          };
          
        case 'radar':
          // For radar charts, we want both area coloring and border 
          return {
            ...basicChartData,
            datasets: basicChartData.datasets.map((dataset, datasetIndex) => ({
              ...dataset,
              backgroundColor: CATEGORICAL_COLORS[datasetIndex % CATEGORICAL_COLORS.length],
              borderColor: CATEGORICAL_BORDERS[datasetIndex % CATEGORICAL_BORDERS.length],
              borderWidth: 2,
              pointBackgroundColor: CATEGORICAL_BORDERS[datasetIndex % CATEGORICAL_BORDERS.length]
            }))
          };
          
        case 'scatter':
          // For scatter plots, we color by dataset
          return {
            ...basicChartData,
            datasets: basicChartData.datasets.map((dataset, datasetIndex) => ({
              ...dataset,
              backgroundColor: CATEGORICAL_COLORS[datasetIndex % CATEGORICAL_COLORS.length],
              borderColor: CATEGORICAL_BORDERS[datasetIndex % CATEGORICAL_BORDERS.length],
              borderWidth: 1,
              pointRadius: 6
            }))
          };
          
        default:
          return basicChartData;
      }
    }
    
    return basicChartData;
  }, [xAxis, yAxis, graphType, data, filteredAndSortedData, columnFilters, filterColors]);

  // Generate filter text to display on chart
  const filterText = useMemo(() => {
    if (!columnFilters || Object.keys(columnFilters).length === 0) {
      return '';
    }

    const activeFilters = Object.entries(columnFilters)
      .filter(([_, filterValue]) => filterValue && filterValue.length > 0)
      .map(([column, filterValue]) => {
        if (Array.isArray(filterValue)) {
          return `${column}: ${filterValue.join(', ')}`;
        } else if (typeof filterValue === 'object') {
          // Handle range filters
          const parts = [];
          if (filterValue.min !== undefined) parts.push(`≥ ${filterValue.min}`);
          if (filterValue.max !== undefined) parts.push(`≤ ${filterValue.max}`);
          return `${column} ${parts.join(' and ')}`;
        }
        return `${column}: ${filterValue}`;
      });

    if (activeFilters.length === 0) return '';
    return `Filters: ${activeFilters.join(' | ')}`;
  }, [columnFilters]);

  // Format value for display in tooltip
  const formatValue = (value) => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'number') {
      // Format numbers with comma separators and up to 2 decimals if needed
      return value % 1 === 0 
        ? value.toLocaleString() 
        : value.toLocaleString(undefined, { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
          });
    }
    return String(value);
  };

  // Determine if the current chart type supports zooming
  const supportsZoom = useMemo(() => {
    // These chart types support zooming
    const zoomableCharts = ['bar', 'line', 'scatter', 'horizontalBar'];
    return zoomableCharts.includes(graphType);
  }, [graphType]);

  // Enhance chart options with any needed customizations, including zoom
  const enhancedOptions = useMemo(() => {
    // Get base options for this chart type (with or without scales)
    const baseOptions = getChartOptions(graphType);
    
    const customOptions = {
      ...baseOptions,
      maintainAspectRatio: false,
      responsive: true,
      animation: {
        duration: 300 // Fast animations
      },
      plugins: {
        ...baseOptions.plugins,
        title: {
          display: !!filterText,
          text: filterText,
          position: 'bottom',
          font: {
            size: 12,
            style: 'italic'
          },
          padding: {
            top: 10,
            bottom: 0
          },
          color: '#666'
        },
        tooltip: {
          ...baseOptions.plugins?.tooltip,
          callbacks: {
            // Override the title to show primary identification info
            title: function(tooltipItems) {
              // Show which data point we're looking at
              const dataIndex = tooltipItems[0].dataIndex;
              return `Data Point #${dataIndex + 1}`;
            },
            // Custom label formatting to show all columns
            label: function(context) {
              const dataIndex = context.dataIndex;
              
              // Get the actual data item for this point
              const dataItem = filteredAndSortedData[dataIndex];
              if (!dataItem) return null;
              
              // Return an empty string as we'll use afterBody to show all data
              return '';
            },
            // Use afterBody to show complete row data
            afterBody: function(tooltipItems) {
              const dataIndex = tooltipItems[0].dataIndex;
              const dataItem = filteredAndSortedData[dataIndex];
              
              if (!dataItem) return ['No data available'];
              
              // Format to show all columns in the data row
              const lines = [
                '═════ Data Row ═════'
              ];
              
              // Add all columns and their values
              Object.entries(dataItem).forEach(([key, value]) => {
                // Highlight the X and Y axis columns
                const isAxis = key === xAxis || key === yAxis;
                const prefix = isAxis ? '➤ ' : '  ';
                const formattedValue = formatValue(value);
                
                lines.push(`${prefix}${key}: ${formattedValue}`);
              });
              
              return lines;
            },
            footer: function(tooltipItems) {
              // Add information about active filters if any
              if (!hasActiveFilters) return [];
              
              const activeFilters = Object.entries(columnFilters)
                .filter(([_, filterValue]) => {
                  return filterValue && (
                    (Array.isArray(filterValue) && filterValue.length > 0) || 
                    (typeof filterValue === 'object' && (filterValue.min !== undefined || filterValue.max !== undefined)) ||
                    (typeof filterValue === 'string' && filterValue.trim() !== '')
                  );
                })
                .map(([column, filterValue]) => {
                  if (Array.isArray(filterValue)) {
                    return `${column}: ${filterValue.join(', ')}`;
                  } else if (typeof filterValue === 'object') {
                    const parts = [];
                    if (filterValue.min !== undefined) parts.push(`≥ ${filterValue.min}`);
                    if (filterValue.max !== undefined) parts.push(`≤ ${filterValue.max}`);
                    return `${column} ${parts.join(' and ')}`;
                  }
                  return `${column}: ${filterValue}`;
                });
              
              if (activeFilters.length === 0) return [];
              
              return [
                '═════ Active Filters ═════',
                ...activeFilters
              ];
            }
          },
          // Make the tooltip wider to accommodate all the data
          displayColors: false,
          padding: 12,
          bodySpacing: 6,
          footerSpacing: 10,
          footerFont: {
            style: 'italic'
          },
          bodyFont: {
            size: 13
          },
          titleFont: {
            weight: 'bold',
            size: 14
          },
          boxPadding: 5
        }
      }
    };
    
    // Add zoom plugin options if the chart type supports zooming
    if (supportsZoom) {
      customOptions.plugins = {
        ...customOptions.plugins,
        zoom: {
          pan: {
            enabled: true,
            mode: 'xy'
          },
          zoom: {
            wheel: {
              enabled: true
            },
            pinch: {
              enabled: true
            },
            mode: 'xy'
          }
        }
      };
    }
    
    return customOptions;
  }, [xAxis, yAxis, graphType, filteredAndSortedData, columnFilters, hasActiveFilters, filterText, supportsZoom]);

  return (
    <div className="chart-wrapper" style={{ position: 'relative', height: viewMode === 'split' ? '300px' : '500px' }}>
      {xAxis && yAxis && chartData ? (
        <>
          <ChartComponent 
            key={chartKey} // Use the key to force re-render
            ref={chartRef}
            data={chartData} 
            options={enhancedOptions}
          />
          
          {/* Reset zoom button - Fixed positioning to avoid overlap */}
          {supportsZoom && (
            <div style={{ 
              position: 'absolute',
              top: '10px',  // Position at the top instead of bottom
              right: '10px', // Position at the right
              zIndex: 10
            }}>
              <button 
                onClick={resetZoom}
                style={{
                  padding: '7px 14px',
                  background: 'linear-gradient(to bottom, #4e8cff, #3b78de)',
                  color: 'white',
                  border: '1px solid #2c5bb8',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.3px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textTransform: 'uppercase',
                  userSelect: 'none',
                  outline: 'none',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #5a98ff, #4285f4)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #4e8cff, #3b78de)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.2)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(1px)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.2)';
                }}
              >
                <span style={{ display: 'inline-block', marginRight: '4px' }}>↺</span> Reset Zoom
              </button>
            </div>
          )}
          
          {/* Active filter indicator - visible alongside the chart title */}
          {hasActiveFilters && !filterText && (
            <div className="filter-indicator" style={{
              position: 'absolute',
              top: '10px',
              left: '10px', // Changed to left to avoid conflict with reset button
              padding: '4px 8px',
              backgroundColor: 'rgba(255,255,0,0.2)',
              border: '1px solid rgba(255,165,0,0.5)',
              borderRadius: '4px',
              fontSize: '0.8rem'
            }}>
              <span className="filter-badge">Filtered Data</span>
            </div>
          )}
        </>
      ) : (
        <div className="no-chart-message" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: '#666'
        }}>
          Select X and Y axes to generate chart
        </div>
      )}
    </div>
  );
};

export default ChartDisplay;