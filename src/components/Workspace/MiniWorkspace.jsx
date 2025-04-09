import React from 'react';
import { ChartComponents, defaultChartOptions } from '../shared/constants';

const MiniWorkspace = ({
  workspaceVisible,
  savedCharts,
  setWorkspaceVisible,
  removeChartFromWorkspace,
  loadChartFromWorkspace,
  setViewMode
}) => {
  // If workspace is not visible, don't render anything
  if (!workspaceVisible) return null;

  return (
    <div className="mini-workspace">
      <div className="mini-workspace-header">
        <h3>Chart Workspace</h3>
        <div className="workspace-actions">
          <button 
            onClick={() => setViewMode('workspace')}
            title="Go to full workspace view"
          >
            Expand
          </button>
          <button 
            onClick={() => setWorkspaceVisible(false)}
            title="Close workspace"
          >
            Close
          </button>
        </div>
      </div>

      {savedCharts && savedCharts.length > 0 ? (
        <div className="workspace-charts">
          {savedCharts.map(chart => {
            const ChartComp = ChartComponents[chart.type];
            if (!ChartComp) {
              console.error(`Chart type not found: ${chart.type}`);
              return null;
            }
            
            return (
              <div key={chart.id} className="mini-chart-card">
                <div className="mini-chart-header">
                  <small>{chart.title}</small>
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
                <div 
                  className="mini-chart clickable-chart"
                  onClick={() => loadChartFromWorkspace(chart)}
                >
                  <ChartComp 
                    data={chart.data} 
                    options={{ 
                      ...defaultChartOptions, 
                      maintainAspectRatio: true, 
                      plugins: { legend: { display: false } } 
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