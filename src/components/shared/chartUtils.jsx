import { COLOR_PALETTE } from './constants';

// Simplified getChartData function without multiple filter handling and color-coding
export const getChartData = (params) => {
  const { xAxis, yAxis, graphType, filteredAndSortedData } = params;
  const type = graphType; // alias for clarity

  // Simple chart data with a single dataset
  return {
    labels: filteredAndSortedData.map(item => item[xAxis]),
    datasets: [
      {
        label: yAxis,
        data: ['pie', 'doughnut'].includes(type)
          ? filteredAndSortedData.map(item => parseFloat(item[yAxis]))
          : type === 'scatter'
          ? filteredAndSortedData.map(item => ({ 
              x: parseFloat(item[xAxis]), 
              y: parseFloat(item[yAxis]) 
            }))
          : filteredAndSortedData.map(item => parseFloat(item[yAxis])),
        backgroundColor: COLOR_PALETTE[0],
        borderColor: type === 'line' ? 'rgba(75, 192, 192, 1)' : undefined,
        borderWidth: 1,
        pointRadius: ['scatter', 'line'].includes(type) ? 5 : undefined
      }
    ]
  };
};