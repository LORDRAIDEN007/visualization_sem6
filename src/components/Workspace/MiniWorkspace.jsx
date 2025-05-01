import React from 'react';
import { ChartComponents, defaultChartOptions } from '../shared/constants';

// Import the same color palettes used in ChartDisplay
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

const MiniWorkspace = ({
  workspaceVisible,
  savedCharts,
  setWorkspaceVisible,
  removeChartFromWorkspace,
  loadChartFromWorkspace,
  setViewMode,
  csvFileUrl, // Add CSV file URL prop
  dataLastUpdated // Add timestamp for data updates
}) => {
  // If workspace is not visible, don't render anything
  if (!workspaceVisible) return null;

  // Function to check if a chart's data might be stale
  const isChartDataStale = (chart) => {
    return dataLastUpdated && chart.lastUpdated && new Date(dataLastUpdated) > new Date(chart.lastUpdated);
  };

  // Function to ensure chart data has proper colors
  const getEnhancedChartData = (chart) => {
    const chartData = {...chart.data};
    
    // Apply colors based on chart type
    switch (chart.type) {
      case 'bar':
      case 'horizontalBar':
        return {
          ...chartData,
          datasets: chartData.datasets.map(dataset => ({
            ...dataset,
            backgroundColor: chartData.labels.map((_, index) => 
              CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
            ),
            borderColor: chartData.labels.map((_, index) => 
              CATEGORICAL_BORDERS[index % CATEGORICAL_BORDERS.length]
            ),
            borderWidth: 1
          }))
        };
        
      case 'line':
        return {
          ...chartData,
          datasets: chartData.datasets.map((dataset, datasetIndex) => ({
            ...dataset,
            borderColor: CATEGORICAL_BORDERS[datasetIndex % CATEGORICAL_BORDERS.length],
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderWidth: 2,
            pointBackgroundColor: CATEGORICAL_BORDERS[datasetIndex % CATEGORICAL_BORDERS.length],
            pointRadius: 3
          }))
        };
        
      case 'pie':
      case 'doughnut':
        return {
          ...chartData,
          datasets: chartData.datasets.map(dataset => ({
            ...dataset,
            backgroundColor: chartData.labels.map((_, index) => 
              CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
            ),
            borderColor: chartData.labels.map((_, index) => 
              CATEGORICAL_BORDERS[index % CATEGORICAL_BORDERS.length]
            ),
            borderWidth: 1
          }))
        };
        
      case 'radar':
      case 'scatter':
      default:
        // For other chart types or if unsure, return the original data
        return chartData;
    }
  };

  return (
    <div className="mini-workspace">
      <div className="mini-workspace-header">
        <h3>Chart Workspace</h3>
        {csvFileUrl && (
          <small className="data-source">
            Data: {csvFileUrl.split('/').pop()}
          </small>
        )}
        <div className="workspace-actions">
          <button 
            onClick={() => setViewMode('workspace')}
            title="Go to full workspace view"
            className="expand-button"
          >
            Expand
          </button>
          <button 
            onClick={() => setWorkspaceVisible(false)}
            title="Close workspace"
            className="close-button"
          >
            Close
          </button>
        </div>
      </div>

      {savedCharts && savedCharts.length > 0 ? (
        <div className="workspace-charts mini-charts-container">
          {savedCharts.map(chart => {
            const ChartComp = ChartComponents[chart.type];
            if (!ChartComp) {
              console.error(`Chart type not found: ${chart.type}`);
              return null;
            }
            
            const isStale = isChartDataStale(chart);
            const enhancedChartData = getEnhancedChartData(chart);
            
            return (
              <div 
                key={chart.id} 
                className={`mini-chart-card ${isStale ? 'stale-data' : ''}`}
              >
                <div className="mini-chart-header">
                  <small>{chart.title}</small>
                  <div className="mini-chart-actions">
                    {isStale && (
                      <span className="stale-indicator" title="Data has been updated since this chart was created">⚠️</span>
                    )}
                    <button
                      className="remove-mini-chart"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the click event on the parent div
                        removeChartFromWorkspace(chart.id);
                      }}
                      title="Remove from workspace"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div 
                  className="mini-chart clickable-chart"
                  onClick={() => loadChartFromWorkspace(chart)}
                >
                  <ChartComp 
                    data={enhancedChartData} 
                    options={{ 
                      ...defaultChartOptions, 
                      maintainAspectRatio: true, 
                      plugins: { 
                        legend: { display: false },
                        tooltip: { enabled: true }
                      },
                      scales: {
                        x: { display: false },
                        y: { display: false }
                      }
                    }} 
                    height={150} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-charts-message">
          <p>No charts added yet. Use "Add to Workspace" button when viewing a chart.</p>
        </div>
      )}
    </div>
  );
};

export default MiniWorkspace;