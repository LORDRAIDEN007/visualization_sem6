import { useState, useMemo, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom' // Import the zoom plugin
import '../../App.css' // Update path as needed
import { supabase } from '../../supabase' // Import the Supabase client
import FilterLegend from '../Controls/FilterLegend';
import FullWorkspace from '../Workspace/FullWorkspace';
// Add import to Dashboard.jsx
import RecentWorkspaces from '../Controls/RecentWorkspaces';
import { ChartComponents, COLOR_PALETTE, HIGHLIGHT_PALETTE, defaultChartOptions } from '../shared/constants';
import {
  isNumeric,
  getUniqueValues,
  getNumericColumnRanges,
  getColumnStatistics,
  getVisibleRows
} from '../shared/utils';
import ChartControls from '../ChartView/ChartControls';
import ChartDisplay from '../ChartView/ChartDisplay';
import { getChartData } from '../shared/chartUtils';
import ViewToggle from '../Controls/ViewToggle';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SimpleDataTable from '../TableView/SimpleDataTable';
import RecentCharts from '../Controls/RecentCharts';

// Register the zoom plugin with Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  zoomPlugin // Register the zoom plugin
)

function Dashboard() {
  const [data, setData] = useState([])
  const [displayData, setDisplayData] = useState([]) // For pagination
  const [columns, setColumns] = useState([])
  const [xAxis, setXAxis] = useState('')
  const [yAxis, setYAxis] = useState('')
  const [graphType, setGraphType] = useState('bar')
  const [viewMode, setViewMode] = useState('chart') // 'chart', 'table', 'split', or 'workspace'
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [columnFilters, setColumnFilters] = useState({}) // For table column filtering
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' })
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)
  const [workspaceCharts, setWorkspaceCharts] = useState([]) // Charts added to workspace during session
  const [savedCharts, setSavedCharts] = useState([]) // Charts loaded from database
  const [workspaceVisible, setWorkspaceVisible] = useState(false)
  const [filterColors, setFilterColors] = useState({});
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [csvFileUrl, setCsvFileUrl] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  const [recentCharts, setRecentCharts] = useState([]); // Store recent charts
  const [showAllCharts, setShowAllCharts] = useState(false); // Toggle between recent and all charts
  const [chartLoaded, setChartLoaded] = useState(false); // Track if a chart is loaded
  const [dataLastUpdated, setDataLastUpdated] = useState(null); // Track when data was last updated
  // Add this state to Dashboard component
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [showAllWorkspaces, setShowAllWorkspaces] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  // Add this function to Dashboard component
  const fetchWorkspaces = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setRecentWorkspaces(data || []);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    }
  };
  // Function to fetch saved charts
  const fetchSavedCharts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('charts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Set all charts and recent charts (last 4)
      setSavedCharts(data || []);
      setRecentCharts(data?.slice(0, 4) || []);
    } catch (err) {
      console.error('Error fetching saved charts:', err);
    }
  };

  // Fetch saved charts on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchSavedCharts();
      fetchWorkspaces();
    }
  }, [user]);

  // Function to upload CSV file to Supabase storage
  const uploadFileToStorage = async (file) => {
    try {
      // Create unique file name
      const fileName = `${Date.now()}-${file.name}`;
      setCurrentFileName(fileName);
      
      // Upload file to Supabase storage bucket
      const { data, error } = await supabase
        .storage
        .from('csv-files') // Replace with your bucket name
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
  
      if (error) {
        console.error('Error uploading file:', error);
        return null;
      }
  
      // Get the public URL
      const { data: urlData } = supabase
        .storage
        .from('csv-files')
        .getPublicUrl(fileName);
  
      if (!urlData || !urlData.publicUrl) {
        console.error('Error getting public URL');
        return null;
      }
  
      // Return the URL
      return urlData.publicUrl;
    } catch (err) {
      console.error('Exception during file upload:', err);
      return null;
    }
  };
  // Add this function to Dashboard component
// Update this function in your Dashboard.jsx component
const loadWorkspaceFromSupabase = async (workspace) => {
  try {
    setLoading(true);
    
    // Fetch all charts for this workspace
    const { data: chartsData, error: chartsError } = await supabase
      .from('charts')
      .select('*')
      .in('id', workspace.chart_ids);
      
    if (chartsError) throw chartsError;
    
    if (!chartsData || chartsData.length === 0) {
      throw new Error('No charts found for this workspace');
    }
    
    // Fetch the CSV file for the first chart (assuming all charts use the same CSV)
    const firstChart = chartsData[0];
    setCsvFileUrl(firstChart.csv_file_url);
    
    // Parse the CSV data from the URL to actually load the data
    try {
      const response = await fetch(firstChart.csv_file_url);
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Insert row IDs for tracking
          const dataWithIds = results.data.map((row, index) => ({
            ...row,
            __row_id: index
          }));

          // Set the data and columns
          setData(dataWithIds);
          if (results.data.length > 0) {
            setColumns(Object.keys(results.data[0] || {}).filter(col => col !== '__row_id'));
          }
          
          // Now load the workspace charts after data is ready
          const loadedWorkspaceCharts = chartsData.map(chart => ({
            id: chart.chart_id,
            database_id: chart.id, // Save the database ID for later use
            type: chart.chart_type,
            xAxis: chart.x_axis,
            yAxis: chart.y_axis,
            data: JSON.parse(chart.chart_data),
            title: chart.title,
            filters: JSON.parse(chart.filters || '{}'),
            lastUpdated: chart.created_at
          }));
          
          setWorkspaceCharts(loadedWorkspaceCharts);
          setWorkspaceVisible(true);
          
          // Switch to workspace view
          setViewMode('workspace');
          setChartLoaded(true);
          setLoading(false);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setLoading(false);
          throw new Error(`Failed to parse CSV file: ${error.message}`);
        }
      });
    } catch (csvError) {
      console.error('Error fetching or parsing CSV:', csvError);
      throw new Error(`Failed to load CSV data: ${csvError.message}`);
    }
  } catch (err) {
    console.error('Error loading workspace:', err);
    alert(`Failed to load workspace: ${err.message}`);
    setLoading(false);
  }
};
  // For chart workspace functionality
  const loadChartFromWorkspace = (chart) => {
    // Set the view mode to chart if it's not already
    if (viewMode !== 'chart') {
      setViewMode('chart');
    }
  
    // Set chart parameters
    setXAxis(chart.xAxis);
    setYAxis(chart.yAxis);
    setGraphType(chart.type);
  
    // Set the filters from the saved chart
    if (chart.filters) {
      setColumnFilters(chart.filters);
    }
  };
  
  const addChartToWorkspace = () => {
    if (!xAxis || !yAxis) {
      alert("Please select both X and Y axis before adding to workspace");
      return;
    }
  
    // Create a unique ID for the chart
    const chartId = `chart-${Date.now()}`;
  
    // Get chart data using the extracted getChartData function
    const chartData = getChartData({
      xAxis,
      yAxis,
      graphType,
      data,
      filteredAndSortedData,
      columnFilters,
      filterColors
    });
  
    // Add to workspaceCharts instead of savedCharts
    setWorkspaceCharts(prev => [...prev, {
      id: chartId,
      type: graphType,
      xAxis,
      yAxis,
      data: chartData,
      title: `${yAxis} vs ${xAxis} (${graphType})`,
      filters: { ...columnFilters },
      lastUpdated: new Date().toISOString()
    }]);
  
    // Show mini workspace if it's not already visible
    if (!workspaceVisible) {
      setWorkspaceVisible(true);
    }
  
    // Show a brief confirmation
    alert('Chart added to workspace!');
  };

  // Handler for loading saved charts
  const handleChartLoad = ({ data: loadedData, columns: loadedColumns, chartConfig, fileName, csvFileUrl: loadedCsvUrl }) => {
    // Set the loaded data
    setData(loadedData);
    setColumns(loadedColumns);
    
    // Set chart configuration
    setXAxis(chartConfig.xAxis);
    setYAxis(chartConfig.yAxis);
    setGraphType(chartConfig.graphType);
    setColumnFilters(chartConfig.filters || {});
    
    // Set CSV file info
    setCsvFileUrl(loadedCsvUrl);
    setCurrentFileName(fileName);
    
    // We don't automatically add the loaded chart to the workspace
    // User needs to explicitly add it using addChartToWorkspace
    
    // Switch to chart view
    setViewMode('chart');
    
    // Hide recent charts section
    setChartLoaded(true);
  };

  const removeChartFromWorkspace = (chartId) => {
    setWorkspaceCharts(prev => prev.filter(chart => chart.id !== chartId));

    // Hide workspace if it's empty
    if (workspaceCharts.length <= 1) {
      setWorkspaceVisible(false);
    }
  };

  // Function to refresh chart data with the latest data
  const refreshChartData = async (chart) => {
    // Recalculate chart data using current dataset and settings
    const updatedChartData = getChartData({
      xAxis: chart.xAxis,
      yAxis: chart.yAxis,
      graphType: chart.type,
      data,
      filteredAndSortedData,
      columnFilters: chart.filters || {},
      filterColors
    });

    // Update the chart with new data
    setWorkspaceCharts(prev => prev.map(c => 
      c.id === chart.id 
        ? {
            ...c,
            data: updatedChartData,
            lastUpdated: new Date().toISOString()
          }
        : c
    ));

    return true;
  };
  const updateChartInWorkspace = (updatedChart) => {
    // Create a new array with the updated chart
    const updatedCharts = workspaceCharts.map(chart => 
      chart.id === updatedChart.id ? updatedChart : chart
    );
    
    // Update the state with the new array
    setWorkspaceCharts(updatedCharts);
    
    // If you're saving charts to localStorage, update that too
    saveChartsToLocalStorage(updatedCharts);
  };
  // Function to clear workspace and reload the page
  const handleExit = () => {
    // Clear all states before reloading
    setWorkspaceCharts([]);
    setSavedCharts([]);
    setWorkspaceVisible(false);
    setData([]);
    setColumns([]);
    setCsvFileUrl('');
    
    // Then reload the page
    window.location.reload();
  };

  // Calculate columns
  const numericColumns = useMemo(() => {
    if (!data.length) return []
    return columns.filter(col => isNumeric(data[0][col]))
  }, [data, columns])

  // Calculate min and max for numeric columns
  const numericColumnRanges = useMemo(() => {
    return getNumericColumnRanges(data, numericColumns);
  }, [data, numericColumns]);

  // Assign colors to filters
  useEffect(() => {
    const newFilterColors = {};
    let colorIndex = 0;

    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (filterValue && !filterColors[column]) {
        newFilterColors[column] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
        colorIndex++;
      } else if (filterValue && filterColors[column]) {
        // Keep existing color
        newFilterColors[column] = filterColors[column];
      }
    });

    // Only update if something changed
    if (Object.keys(newFilterColors).length > 0) {
      setFilterColors(prevColors => ({
        ...prevColors,
        ...newFilterColors
      }));
    }
  }, [columnFilters, filterColors]);

  // Apply filters and sorting
  const filteredAndSortedData = useMemo(() => {
    setLoading(true)

    // Apply column filters for table view
    let filtered = data.filter(row => {
      return Object.entries(columnFilters).every(([column, filterValue]) => {
        if (!filterValue) return true

        // Handle numeric range filters (format: ">=min & <=max")
        if (filterValue.includes('>=') && filterValue.includes('<=')) {
          const parts = filterValue.split('&');
          const minValue = parseFloat(parts[0].replace('>=', '').trim());
          const maxValue = parseFloat(parts[1].replace('<=', '').trim());
          const cellValue = parseFloat(row[column]);
          return cellValue >= minValue && cellValue <= maxValue;
        }

        // Handle multiple value selection (format: "value1|value2|value3")
        if (filterValue.includes('|')) {
          const allowedValues = filterValue.split('|');
          return allowedValues.includes(String(row[column]));
        }

        // Regular text filter
        const cellValue = String(row[column] || '').toLowerCase();
        return cellValue.includes(filterValue.toLowerCase());
      });
    });

    // Apply global search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(term)
        )
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valueA = a[sortConfig.key];
        let valueB = b[sortConfig.key];

        // Convert to numbers if they're numeric
        if (isNumeric(valueA) && isNumeric(valueB)) {
          valueA = parseFloat(valueA);
          valueB = parseFloat(valueB);
        } else {
          valueA = String(valueA || '').toLowerCase();
          valueB = String(valueB || '').toLowerCase();
        }

        if (valueA < valueB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    setLoading(false);
    return filtered;
  }, [data, columnFilters, searchTerm, sortConfig]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)

    try {
      // First upload the file to Supabase storage
      const fileUrl = await uploadFileToStorage(file);
      
      // Store the file URL for later use
      if (fileUrl) {
        setCsvFileUrl(fileUrl);
      }

      // Now parse the CSV file for use in the app
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Insert row IDs for tracking
          const dataWithIds = results.data.map((row, index) => ({
            ...row,
            __row_id: index
          }))

          setData(dataWithIds)
          setColumns(Object.keys(results.data[0] || {}).filter(col => col !== '__row_id'))
          setColumnFilters({})
          setSortConfig({ key: null, direction: 'ascending' })
          setCurrentPage(1)
          setLoading(false)
          setFilterColors({})
          setChartLoaded(true) // Hide recent charts section
          
          // Update data timestamp
          setDataLastUpdated(new Date().toISOString())
          
          // Clear workspace when loading new data
          setWorkspaceCharts([])
          setWorkspaceVisible(false)
        },
        error: (error) => {
          console.error('Error parsing CSV:', error)
          setLoading(false)
        }
      })
    } catch (error) {
      console.error('Error in file upload process:', error);
      setLoading(false);
    }
  }

  const resetFilters = () => {
    setColumnFilters({})
    setSearchTerm('')
    setFilterColors({})
  }

  // Cell editing handling
  const handleCellEdit = (rowId, column, value) => {
    setData(prev =>
      prev.map(row =>
        row.__row_id === rowId
          ? { ...row, [column]: value }
          : row
      )
    )
    
    // Mark data as updated
    setDataLastUpdated(new Date().toISOString())
  }

  const handleSaveCSV = () => {
    const csv = Papa.unparse(data.map(row => {
      const { __row_id, ...rest } = row
      return rest
    }))

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'modified_data.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  return (
    <div className="dashboard-container">
      <header className="app-header">
        <h1>Advanced CSV Data Visualization</h1>
        <div className="user-info">
          <span>Welcome, {user?.user_metadata?.display_name || user?.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      
      <div className="file-actions">
        <div className="file-upload">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
          />
        </div>
        
        {data.length > 0 && (
          <div className="file-actions-right">
            <button
              onClick={handleSaveCSV}
              className="save-button"
            >
              Save Modified Data
            </button>
            <button
              onClick={handleExit}
              className="exit-button"
            >
              Exit
            </button>
            {currentFileName && (
              <div className="file-info">
                <span>Current file: {currentFileName}</span>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Add this section above the Recent Charts section in Dashboard.jsx */}
{!chartLoaded && recentWorkspaces.length > 0 && (
  <div className="recent-workspaces-section" style={{
    margin: '20px 0',
    padding: '15px',
    backgroundColor: '#f5f8ff', // Slightly different shade from charts
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
      <h2 style={{ margin: '0', fontSize: '1.5rem', color: '#333' }}>
        {showAllWorkspaces ? 'All Saved Workspaces' : 'Recent Workspaces'}
      </h2>
      <button
        onClick={() => setShowAllWorkspaces(!showAllWorkspaces)}
        style={{
          backgroundColor: '#5c6bc0', // Different color from charts toggle
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}
      >
        {showAllWorkspaces ? 'Show Recent Only' : 'View All'}
      </button>
    </div>
    
    <RecentWorkspaces
      workspaces={showAllWorkspaces ? recentWorkspaces : recentWorkspaces.slice(0, 4)}
      onLoadWorkspace={loadWorkspaceFromSupabase}
      showAll={showAllWorkspaces}
      onRefresh={fetchWorkspaces}
    />
  </div>
)}
      {/* Recent Charts Section - visible only when no chart is loaded */}
      {!chartLoaded && recentCharts.length > 0 && (
        <div className="recent-charts-section" style={{
          margin: '20px 0',
          padding: '15px',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: '0', fontSize: '1.5rem', color: '#333' }}>
              {showAllCharts ? 'All Saved Charts' : 'Recent Charts'}
            </h2>
            <button
              onClick={() => setShowAllCharts(!showAllCharts)}
              style={{
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {showAllCharts ? 'Show Recent Only' : 'View All'}
            </button>
          </div>
          
          <RecentCharts
            charts={showAllCharts ? savedCharts : recentCharts}
            onLoadChart={handleChartLoad}
            showAll={showAllCharts}
            onRefresh={fetchSavedCharts}
          />
        </div>
      )}

      {loading && <div className="loading-spinner">Loading data...</div>}

      {data.length > 0 && (
        <>
          <div className="view-controls">
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />

            <div className="global-search">
              <input
                type="text"
                placeholder="Search across all columns..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button
                onClick={resetFilters}
                className="reset-button"
              >
                Reset All Filters
              </button>
            </div>
          </div>

          <FilterLegend
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
            filterColors={filterColors}
            COLOR_PALETTE={COLOR_PALETTE}
          />

          {(viewMode === 'chart' || viewMode === 'split') && (
            <ChartControls
              xAxis={xAxis}
              setXAxis={setXAxis}
              yAxis={yAxis}
              setYAxis={setYAxis}
              graphType={graphType}
              setGraphType={setGraphType}
              columns={columns}
              data={data}
              numericColumns={numericColumns}
              addChartToWorkspace={addChartToWorkspace}
              workspaceVisible={workspaceVisible}
              setWorkspaceVisible={setWorkspaceVisible}
            />
          )}

          <div className={`main-content ${viewMode === 'split' ? 'split-view' : ''}`}>
            {/* Chart View */}
            {(viewMode === 'chart' || viewMode === 'split') && (
              <div className="chart-container">
                <ChartDisplay
                  xAxis={xAxis}
                  yAxis={yAxis}
                  graphType={graphType}
                  data={data}
                  filteredAndSortedData={filteredAndSortedData}
                  columnFilters={columnFilters}
                  filterColors={filterColors}
                  viewMode={viewMode}
                />

                <div className="chart-stats">
                  <h3>Data Statistics</h3>
                  <div>Total Rows: {data.length}</div>
                  {yAxis && (
                    <div className="stats-details">
                      {(() => {
                        const stats = getColumnStatistics(data, yAxis);
                        if (!stats) return 'No numeric data to analyze';

                        return (
                          <>
                            <div>Min: {stats.min}</div>
                            <div>Max: {stats.max}</div>
                            <div>Average: {stats.average}</div>
                            <div>Median: {stats.median}</div>
                            <div>Sum: {stats.sum}</div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Table View */}
            {(viewMode === 'table' || viewMode === 'split') && (
              <SimpleDataTable
                columns={columns}
                data={data}
                displayData={displayData}
                setDisplayData={setDisplayData}
                filteredAndSortedData={filteredAndSortedData}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                sortConfig={sortConfig}
                setSortConfig={setSortConfig}
                handleCellEdit={handleCellEdit}
                filterColors={filterColors}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                numericColumnRanges={numericColumnRanges}
              />
            )}
          </div>

          {/* Full Workspace View component */}
          {viewMode === 'workspace' && (
            <FullWorkspace
              workspaceCharts={workspaceCharts} // Pass workspaceCharts instead of savedCharts
              removeChartFromWorkspace={removeChartFromWorkspace}
              loadChartFromWorkspace={loadChartFromWorkspace}
              csvFileUrl={csvFileUrl}
              dataLastUpdated={dataLastUpdated}
              refreshChartData={refreshChartData}
              updateChartInWorkspace={updateChartInWorkspace}
            />
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;