import React from 'react';
import { ChartComponents, defaultChartOptions } from '../shared/constants';
// Import the extracted getChartData function
import { getChartData } from '../shared/chartUtils';

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
  const ChartComponent = ChartComponents[graphType];
  
  const chartOptions = {
    ...defaultChartOptions,
    maintainAspectRatio: false
  };

  return (
    <div className="chart-wrapper">
      {xAxis && yAxis ? (
        <ChartComponent 
          data={getChartData({
            xAxis,
            yAxis,
            graphType,
            data,
            filteredAndSortedData,
            columnFilters,
            filterColors
          })} 
          options={chartOptions}
          height={viewMode === 'split' ? 300 : 500}
        />
      ) : (
        <div className="no-chart-message">
          Select X and Y axes to generate chart
        </div>
      )}
    </div>
  );
};

export default ChartDisplay;