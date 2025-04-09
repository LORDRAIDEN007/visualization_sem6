import { useState } from 'react';
import { supabase } from '../../supabase';
import Papa from 'papaparse';

function RecentCharts({ charts, onLoadChart, showAll, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentlyLoadingId, setCurrentlyLoadingId] = useState(null);

  // Helper function to parse filters properly
  const parseFilters = (filtersData) => {
    // If filters is null or undefined, return empty object
    if (!filtersData) return {};
    
    try {
      // If it's already an object, just return it
      if (typeof filtersData === 'object' && !Array.isArray(filtersData)) {
        return filtersData;
      }
      
      // If it's a string, try to parse it as JSON
      if (typeof filtersData === 'string') {
        // Check if it's a valid JSON string
        if (filtersData.trim().startsWith('{') || filtersData.trim().startsWith('[')) {
          return JSON.parse(filtersData);
        }
        
        // If it's a simple string format like "field:value", convert to object
        if (filtersData.includes(':')) {
          const parts = filtersData.split(':');
          const key = parts[0].trim().replace(/"/g, '');
          const value = parts[1].trim().replace(/"/g, '');
          return { [key]: value };
        }
      }
      
      // If none of the above worked, return empty object
      return {};
    } catch (err) {
      console.error('Error parsing filters:', err, filtersData);
      return {};
    }
  };

  const loadChart = async (chart) => {
    setLoading(true);
    setError(null);
    setCurrentlyLoadingId(chart.id);
    
    try {
      // Validate chart data
      if (!chart.csv_file_url) {
        throw new Error('No CSV file associated with this chart');
      }
      
      // Parse filters properly before processing
      let parsedFilters = {};
      if (chart.filters) {
        parsedFilters = parseFilters(chart.filters);
      }
      
      // Get just the file name
      let fileName = chart.csv_file_url;
      
      // Handle different URL formats
      if (fileName.includes('/')) {
        fileName = fileName.split('/').pop();
      }
      
      // First attempt: Try direct download with the filename
      let response = await supabase
        .storage
        .from('csv-files')
        .download(fileName);
        
      // If that fails, try with the full path
      if (response.error) {
        // Try to clean the URL/path
        let filePath = chart.csv_file_url;
        
        // Remove any storage URL prefix if present
        if (filePath.includes('supabase')) {
          const parts = filePath.split('/');
          const bucketIndex = parts.findIndex(part => part === 'csv-files');
          if (bucketIndex >= 0 && bucketIndex < parts.length - 1) {
            filePath = parts.slice(bucketIndex + 1).join('/');
          }
        }
        
        response = await supabase
          .storage
          .from('csv-files')
          .download(filePath);
      }
      
      // If both attempts fail, try a list operation to see what files are available
      if (response.error) {
        const { data: fileList } = await supabase
          .storage
          .from('csv-files')
          .list();
          
        // Try to find a match or similar file
        const fileNames = fileList.map(f => f.name);
        
        // Look for an exact match
        const exactMatch = fileNames.find(f => f === fileName);
        if (exactMatch) {
          response = await supabase
            .storage
            .from('csv-files')
            .download(exactMatch);
        }
      }
      
      if (response.error) {
        throw new Error(`Failed to download the CSV file: ${response.error.message || JSON.stringify(response.error)}`);
      }
      
      if (!response.data) {
        throw new Error('No data received from storage');
      }
      
      // Convert the blob to text
      const csvText = await response.data.text();
      
      if (csvText.length === 0) {
        throw new Error('The CSV file appears to be empty');
      }
      
      // Parse the CSV data with Papa Parse
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            setError('CSV file is empty or contains no valid data rows');
            setLoading(false);
            setCurrentlyLoadingId(null);
            return;
          }
          
          // Add row IDs for tracking
          const dataWithIds = results.data.map((row, index) => ({
            ...row,
            __row_id: index
          }));
          
          // Ensure we have all required chart configuration
          if (!chart.x_axis || !chart.y_axis || !chart.chart_type) {
            setError('Chart configuration is incomplete. Please check x-axis, y-axis, and chart type.');
            setLoading(false);
            setCurrentlyLoadingId(null);
            return;
          }
          
          // Build chart data structure with properly parsed filters
          const chartData = {
            data: dataWithIds,
            columns: results.meta.fields || Object.keys(results.data[0] || {}).filter(col => col !== '__row_id'),
            chartConfig: {
              xAxis: chart.x_axis,
              yAxis: chart.y_axis,
              graphType: chart.chart_type,
              filters: parsedFilters,
              title: chart.title,
              savedChart: {
                id: chart.id,
                type: chart.chart_type,
                xAxis: chart.x_axis,
                yAxis: chart.y_axis,
                title: chart.title,
                filters: parsedFilters
              }
            },
            fileName: fileName,
            csvFileUrl: chart.csv_file_url
          };
          
          // Call the parent component's handler with all necessary data
          try {
            onLoadChart(chartData);
          } catch (callbackError) {
            setError(`Error rendering chart: ${callbackError.message}`);
          }
          
          setLoading(false);
          setCurrentlyLoadingId(null);
        },
        error: (parseError) => {
          setError(`Failed to parse the CSV file: ${parseError.message}`);
          setLoading(false);
          setCurrentlyLoadingId(null);
        }
      });
    } catch (err) {
      setError(`Failed to load chart: ${err.message}`);
      setLoading(false);
      setCurrentlyLoadingId(null);
    }
  };

  // Function to get chart type icon
  const getChartIcon = (chartType) => {
    switch(chartType?.toLowerCase()) {
      case 'bar':
        return '📊';
      case 'line':
        return '📈';
      case 'pie':
        return '🥧';
      case 'scatter':
        return '🔵';
      case 'radar':
        return '🕸️';
      default:
        return '📊';
    }
  };

  // Function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    }).format(date);
  };

  // Function to delete a chart
  const deleteChart = async (id, e) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    
    if (window.confirm('Are you sure you want to delete this chart?')) {
      try {
        const { error } = await supabase
          .from('charts')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Refresh the charts list
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Error deleting chart:', err);
        setError(`Failed to delete chart: ${err.message}`);
      }
    }
  };

  return (
    <div className="recent-charts">
      {error && (
        <div className="error-message" style={{ 
          color: 'white', 
          backgroundColor: '#f44336',
          marginBottom: '15px', 
          padding: '10px',
          borderRadius: '4px'
        }}>
          {error}
          <button 
            onClick={() => setError(null)} 
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="charts-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '15px'
      }}>
        {charts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#666' }}>
            No saved charts found. Create and save a chart to see it here.
          </div>
        ) : (
          charts.map(chart => (
            <div 
              key={chart.id}
              className="chart-card"
              onClick={() => loadChart(chart)}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                position: 'relative',
                opacity: currentlyLoadingId === chart.id ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '24px' }}>{getChartIcon(chart.chart_type)}</div>
                <button
                  onClick={(e) => deleteChart(chart.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#f44336'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#999'}
                >
                  🗑️
                </button>
              </div>
              
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333', fontWeight: '600' }}>
                {chart.title || `${chart.y_axis} vs ${chart.x_axis}`}
              </h3>
              
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500' }}>Type:</span> {chart.chart_type}
              </div>
              
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500' }}>X-axis:</span> {chart.x_axis}
              </div>
              
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                <span style={{ fontWeight: '500' }}>Y-axis:</span> {chart.y_axis}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
  <span style={{ fontWeight: '500' }}>Filters:</span>{' '}
  {chart.filters ? (
    typeof chart.filters === 'object' && !Array.isArray(chart.filters) 
      ? Object.entries(chart.filters).map(([key, value]) => `${key}: ${value}`).join(', ')
      : Array.isArray(chart.filters)
        ? chart.filters.join(', ')
        : String(chart.filters)
  ) : 'None'}
</div>
              
              {chart.created_at && (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                  Created: {formatDate(chart.created_at)}
                </div>
              )}
              
              {currentlyLoadingId === chart.id && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  borderRadius: '8px'
                }}>
                  <div className="loading-spinner">Loading...</div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default RecentCharts;