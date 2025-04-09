import React, { useState } from 'react';
import { ChartComponents, defaultChartOptions } from '../shared/constants';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';

const FullWorkspace = ({ 
  savedCharts, 
  removeChartFromWorkspace, 
  loadChartFromWorkspace,
  csvFileUrl // CSV file URL prop
}) => {
  const { user } = useAuth();
  const [savingChartId, setSavingChartId] = useState(null);
  
  // Function to save chart to Supabase
  const saveChartToSupabase = async (chart) => {
    if (!user) {
      alert('You must be logged in to save charts.');
      return;
    }
    
    // Check if we have a valid CSV file URL
    if (!csvFileUrl) {
      alert('No data source associated with this chart. Please upload a CSV file first.');
      return;
    }
    
    try {
      setSavingChartId(chart.id);
      
      console.log('Saving chart with file URL:', csvFileUrl);
      
      // Prepare the chart data for saving
      const chartRecord = {
        chart_id: chart.id,
        title: chart.title,
        chart_type: chart.type,
        x_axis: chart.xAxis,
        y_axis: chart.yAxis,
        chart_data: JSON.stringify(chart.data),
        filters: JSON.stringify(chart.filters || {}),
        csv_file_url: csvFileUrl, // Use the provided CSV file URL
        user_id: user.id,
        created_at: new Date().toISOString()
      };
      
      // Save chart data to charts table in Supabase
      const { data, error } = await supabase
        .from('charts')
        .insert([chartRecord]);
        
      if (error) {
        console.error('Error saving chart:', error);
        alert(`Failed to save chart: ${error.message}`);
      } else {
        alert('Chart saved successfully!');
      }
    } catch (err) {
      console.error('Exception when saving chart:', err);
      alert(`An error occurred: ${err.message}`);
    } finally {
      setSavingChartId(null);
    }
  };

  return (
    <div className="full-workspace-view">
      <h2>Chart Workspace</h2>
      {csvFileUrl && (
        <div className="file-url-info">
          <small>Using data source: {csvFileUrl.split('/').pop()}</small>
        </div>
      )}
      {savedCharts && savedCharts.length > 0 ? (
        <div className="workspace-charts workspace-fullview">
          {savedCharts.map(chart => {
            const ChartComp = ChartComponents[chart.type];
            const isSaving = savingChartId === chart.id;
            
            return (
              <div key={chart.id} className="workspace-chart-card">
                <div className="chart-card-header">
                  <h3>{chart.title}</h3>
                  <div className="chart-card-actions">
                    <button
                      className="save-chart-button"
                      onClick={() => saveChartToSupabase(chart)}
                      disabled={isSaving}
                      title="Save chart to database"
                    >
                      {isSaving ? '⏳' : '💾'}
                    </button>
                    <button
                      className="remove-chart-button"
                      onClick={() => removeChartFromWorkspace(chart.id)}
                      disabled={isSaving}
                      title="Remove from workspace"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div
                  className="workspace-chart clickable-chart"
                  onClick={() => loadChartFromWorkspace(chart)}
                >
                  {ChartComp ? (
                    <ChartComp 
                      data={chart.data} 
                      options={{ ...defaultChartOptions, maintainAspectRatio: true }} 
                      height={300} 
                    />
                  ) : (
                    <div className="chart-error">Chart type not available</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-charts-message">
          <p>No charts added to workspace yet. Create charts in Chart View and add them to workspace.</p>
        </div>
      )}
    </div>
  );
};

export default FullWorkspace;