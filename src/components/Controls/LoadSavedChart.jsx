import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Papa from 'papaparse';

function LoadSavedChart({ onChartLoad, user }) {
  const [savedCharts, setSavedCharts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentlyLoadingId, setCurrentlyLoadingId] = useState(null);

  // Fetch saved charts when component mounts
  useEffect(() => {
    fetchSavedCharts();
  }, [user]);

  const fetchSavedCharts = async () => {
    if (!user) {
      setError("You must be logged in to view saved charts");
      return;
    }
    
    setLoading(true);
    setError(null); // Clear previous errors
    
    try {
      const { data, error } = await supabase
        .from('charts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Log the raw chart data for debugging
      console.log('Fetched charts data:', data);
      
      setSavedCharts(data || []);
      
      if (data && data.length === 0) {
        setError('No saved charts found for your account');
      }
    } catch (err) {
      console.error('Error fetching saved charts:', err);
      setError(`Failed to load saved charts: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

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
    setError(null); // Clear previous errors
    setCurrentlyLoadingId(chart.id);
    
    try {
      // Validate chart data
      if (!chart.csv_file_url) {
        throw new Error('No CSV file associated with this chart');
      }
      
      console.log('Loading chart with ID:', chart.id);
      console.log('Chart data:', chart);
      
      // Parse filters properly before processing
      let parsedFilters = {};
      if (chart.filters) {
        console.log('Original filters:', chart.filters);
        console.log('Filters type:', typeof chart.filters);
        parsedFilters = parseFilters(chart.filters);
        console.log('Parsed filters:', parsedFilters);
      }
      
      console.log('Original CSV file URL:', chart.csv_file_url);
      
      // Get just the file name
      let fileName = chart.csv_file_url;
      
      // Handle different URL formats
      if (fileName.includes('/')) {
        fileName = fileName.split('/').pop();
      }
      
      console.log('Extracted fileName for download:', fileName);
      
      // First attempt: Try direct download with the filename
      let response = await supabase
        .storage
        .from('csv-files')
        .download(fileName);
        
      // If that fails, try with the full path
      if (response.error) {
        console.log('First download attempt failed, trying with full path');
        
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
        
        console.log('Attempting with cleaned path:', filePath);
        
        response = await supabase
          .storage
          .from('csv-files')
          .download(filePath);
      }
      
      // If both attempts fail, try a list operation to see what files are available
      if (response.error) {
        console.log('Both download attempts failed. Listing available files in bucket...');
        
        const { data: fileList, error: listError } = await supabase
          .storage
          .from('csv-files')
          .list();
          
        if (listError) {
          console.error('Error listing files in bucket:', listError);
        } else {
          console.log('Available files in bucket:', fileList);
          // Try to find a match or similar file
          const fileNames = fileList.map(f => f.name);
          console.log('Looking for closest match to:', fileName);
          
          // Look for an exact match
          const exactMatch = fileNames.find(f => f === fileName);
          if (exactMatch) {
            console.log('Found exact match:', exactMatch);
            response = await supabase
              .storage
              .from('csv-files')
              .download(exactMatch);
          }
        }
      }
      
      if (response.error) {
        // If all attempts fail, provide detailed error
        console.error('All download attempts failed:', response.error);
        throw new Error(`Failed to download the CSV file: ${response.error.message || JSON.stringify(response.error)}`);
      }
      
      if (!response.data) {
        throw new Error('No data received from storage');
      }
      
      // Convert the blob to text
      const csvText = await response.data.text();
      console.log("CSV loaded successfully, size:", csvText.length, "bytes");
      console.log("CSV preview:", csvText.substring(0, 200) + "...");
      
      if (csvText.length === 0) {
        throw new Error('The CSV file appears to be empty');
      }
      
      // Parse the CSV data with Papa Parse
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log("CSV parsing complete, rows:", results.data?.length);
          
          if (!results.data || results.data.length === 0) {
            setError('CSV file is empty or contains no valid data rows');
            setLoading(false);
            setCurrentlyLoadingId(null);
            return;
          }
          
          // Log column headers for debugging
          console.log("CSV columns:", results.meta.fields);
          
          // Add row IDs for tracking
          const dataWithIds = results.data.map((row, index) => ({
            ...row,
            __row_id: index
          }));
          
          // Ensure we have all required chart configuration
          if (!chart.x_axis || !chart.y_axis || !chart.chart_type) {
            console.error('Missing chart configuration:', { 
              x_axis: chart.x_axis, 
              y_axis: chart.y_axis, 
              chart_type: chart.chart_type 
            });
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
              filters: parsedFilters, // Use the properly parsed filters
              title: chart.title,
              savedChart: {
                id: chart.id,
                type: chart.chart_type,
                xAxis: chart.x_axis,
                yAxis: chart.y_axis,
                title: chart.title,
                filters: parsedFilters // Use the properly parsed filters here too
              }
            },
            fileName: fileName,
            csvFileUrl: chart.csv_file_url
          };
          
          console.log("Passing chart data to parent with filters:", chartData.chartConfig.filters);
          
          // Call the parent component's handler with all necessary data
          try {
            onChartLoad(chartData);
            console.log("Chart data successfully passed to parent");
          } catch (callbackError) {
            console.error("Error in parent component when loading chart:", callbackError);
            setError(`Error rendering chart: ${callbackError.message}`);
          }
          
          setLoading(false);
          setCurrentlyLoadingId(null);
        },
        error: (parseError) => {
          console.error('Error parsing CSV:', parseError);
          setError(`Failed to parse the CSV file: ${parseError.message}`);
          setLoading(false);
          setCurrentlyLoadingId(null);
        }
      });
    } catch (err) {
      console.error('Error loading chart:', err);
      setError(`Failed to load chart: ${err.message}`);
      setLoading(false);
      setCurrentlyLoadingId(null);
    }
  };

  return (
    <div className="load-saved-chart">
      <h3>Load Saved Chart</h3>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#fff0f0' }}>
          Error: {error}
        </div>
      )}
      
      {loading && !currentlyLoadingId && (
        <div className="loading-spinner">Loading charts list...</div>
      )}
      
      {savedCharts.length === 0 && !loading ? (
        <p>No saved charts found. Create and save a chart first.</p>
      ) : (
        <div className="chart-list">
          {savedCharts.map((chart) => (
            <div key={chart.id} className="saved-chart-item" 
                 style={{ 
                   display: 'flex', 
                   justifyContent: 'space-between', 
                   alignItems: 'center',
                   padding: '8px',
                   margin: '5px 0',
                   border: '1px solid #ddd',
                   borderRadius: '4px'
                 }}>
              <div className="chart-info">
                <strong>{chart.title || 'Untitled Chart'}</strong>
                <div className="chart-details" style={{ fontSize: '0.8rem', color: '#666' }}>
                  {chart.chart_type || 'Unknown type'} • Created: {new Date(chart.created_at).toLocaleDateString()}
                </div>
                <div className="file-info" style={{ fontSize: '0.7rem', color: '#888', wordBreak: 'break-all' }}>
                  File: {chart.csv_file_url ? chart.csv_file_url.split('/').pop() : 'No file'}
                </div>
                {chart.filters && (
                  <div className="filter-info" style={{ fontSize: '0.7rem', color: '#888', wordBreak: 'break-all' }}>
                    Filters: {typeof chart.filters === 'string' ? chart.filters : JSON.stringify(chart.filters)}
                  </div>
                )}
              </div>
              <button 
                onClick={() => loadChart(chart)}
                disabled={loading && currentlyLoadingId === chart.id}
                className="load-button"
                style={{ 
                  padding: '5px 10px',
                  backgroundColor: loading && currentlyLoadingId === chart.id ? '#cccccc' : '#4285f4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading && currentlyLoadingId === chart.id ? 'not-allowed' : 'pointer'
                }}
              >
                {loading && currentlyLoadingId === chart.id ? 'Loading...' : 'Load'}
              </button>
            </div>
          ))}
        </div>
      )}
      
      <button 
        onClick={fetchSavedCharts} 
        disabled={loading}
        className="refresh-button"
        style={{ 
          marginTop: '10px',
          padding: '5px 10px',
          backgroundColor: '#f1f1f1',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Refreshing...' : 'Refresh List'}
      </button>
    </div>
  );
}

export default LoadSavedChart;