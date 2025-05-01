import React, { useState, useEffect, useRef } from 'react';
import { ChartComponents, getChartOptions } from '../shared/constants';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, RefreshCw, X, Edit, Copy, Download, Share2 } from 'lucide-react';
import './FullWorkspace.css';
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

const FullWorkspace = ({ 
  workspaceCharts, 
  removeChartFromWorkspace, 
  loadChartFromWorkspace,
  csvFileUrl, 
  dataLastUpdated, 
  refreshChartData,
  onBackToChartView,
  updateChartInWorkspace // Add this prop to handle updating charts
}) => {
  const { user } = useAuth();
  const [savingChartId, setSavingChartId] = useState(null);
  const [refreshingChartId, setRefreshingChartId] = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [chartCategories, setChartCategories] = useState({
    'Bar Charts': [],
    'Line Charts': [],
    'Pie Charts': [],
    'Other': []
  });
  // New state for tracking which chart title is being edited
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [tempTitle, setTempTitle] = useState('');
  const titleInputRef = useRef(null);
  // Add these state variables inside the FullWorkspace component
const [savingWorkspace, setSavingWorkspace] = useState(false);
const [workspaceTitle, setWorkspaceTitle] = useState('My Workspace');
  // Organize charts by type
  useEffect(() => {
    if (!workspaceCharts || workspaceCharts.length === 0) return;
    
    const categories = {
      'Bar Charts': [],
      'Line Charts': [],
      'Pie Charts': [],
      'Other': []
    };
    
    workspaceCharts.forEach(chart => {
      if (chart.type === 'bar' || chart.type === 'horizontalBar') {
        categories['Bar Charts'].push(chart);
      } else if (chart.type === 'line') {
        categories['Line Charts'].push(chart);
      } else if (chart.type === 'pie' || chart.type === 'doughnut') {
        categories['Pie Charts'].push(chart);
      } else {
        categories['Other'].push(chart);
      }
    });
    
    setChartCategories(categories);
  }, [workspaceCharts]);

  // Focus input when editing title starts
  useEffect(() => {
    if (editingTitleId && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [editingTitleId]);

  // Filter charts based on search term
  const filteredCharts = workspaceCharts.filter(chart => 
    chart.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chart.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chart.xAxis.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chart.yAxis.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Add this function to the FullWorkspace component
const saveWorkspaceToSupabase = async () => {
  if (!user) {
    alert('You must be logged in to save workspaces.');
    return;
  }
  
  if (workspaceCharts.length === 0) {
    alert('Cannot save an empty workspace. Please add charts first.');
    return;
  }
  
  try {
    setSavingWorkspace(true);
    
    // First save any unsaved charts
    const chartIds = [];
    
    for (const chart of workspaceCharts) {
      // If the chart doesn't exist in the database yet, save it first
      if (!chart.database_id) {
        const chartRecord = {
          chart_id: chart.id,
          title: chart.title,
          chart_type: chart.type,
          x_axis: chart.xAxis,
          y_axis: chart.yAxis,
          chart_data: JSON.stringify(chart.data),
          filters: JSON.stringify(chart.filters || {}),
          csv_file_url: csvFileUrl,
          user_id: user.id,
          created_at: new Date().toISOString()
        };
        
        const { data: chartData, error: chartError } = await supabase
          .from('charts')
          .insert([chartRecord])
          .select();
          
        if (chartError) {
          throw new Error(`Failed to save chart: ${chartError.message}`);
        }
        
        // Use the database ID
        chartIds.push(chartData[0].id);
      } else {
        // If the chart already exists in the database, use its ID
        chartIds.push(chart.database_id);
      }
    }
    
    // Now save the workspace
    const chartTypes = [...new Set(workspaceCharts.map(chart => chart.type))];
    const formattedChartTypes = chartTypes.map(type => 
      type.charAt(0).toUpperCase() + type.slice(1) + (chartTypes.length > 1 ? 's' : '')
    ).join(', ');
    
    // Create a summary of data sources if possible
    const dataDescription = csvFileUrl ? 
      ` analyzing data from ${csvFileUrl.split('/').pop()}` : 
      '';
    
    // Build a comprehensive description
    const description = `${workspaceTitle}: A collection of ${workspaceCharts.length} ${formattedChartTypes}${dataDescription}. Created ${new Date().toLocaleDateString()}.`;
    
    const workspaceRecord = {
      user_id: user.id,
      title: workspaceTitle,
      description: description,
      chart_ids: chartIds,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('workspaces')
      .insert([workspaceRecord]);
      
    if (error) {
      throw new Error(`Failed to save workspace: ${error.message}`);
    }
    
    alert('Workspace saved successfully!');
  } catch (err) {
    console.error('Exception when saving workspace:', err);
    alert(`An error occurred: ${err.message}`);
  } finally {
    setSavingWorkspace(false);
  }
};
  // Save chart to Supabase
  const saveChartToSupabase = async (chart) => {
    if (!user) {
      alert('You must be logged in to save charts.');
      return;
    }
    
    if (!csvFileUrl) {
      alert('No data source associated with this chart. Please upload a CSV file first.');
      return;
    }
    
    try {
      setSavingChartId(chart.id);
      
      const chartRecord = {
        chart_id: chart.id,
        title: chart.title,
        chart_type: chart.type,
        x_axis: chart.xAxis,
        y_axis: chart.yAxis,
        chart_data: JSON.stringify(chart.data),
        filters: JSON.stringify(chart.filters || {}),
        csv_file_url: csvFileUrl,
        user_id: user.id,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('charts')
        .insert([chartRecord]);
        
      if (error) {
        console.error('Error saving chart:', error);
        alert(`Failed to save chart: ${error.message}`);
      } else {
        alert('Chart saved successfully!');

        if (data && data[0]) {
          const updatedChart = { ...chart, database_id: data[0].id };
          updateChartInWorkspace(updatedChart);
          return data[0].id; // Return the database ID
        }
      }
    } catch (err) {
      console.error('Exception when saving chart:', err);
      alert(`An error occurred: ${err.message}`);
    } finally {
      setSavingChartId(null);
    }
  };

  // Check if chart data might be stale
  const isChartDataStale = (chart) => {
    return dataLastUpdated && chart.lastUpdated && new Date(dataLastUpdated) > new Date(chart.lastUpdated);
  };

  // Refresh chart with new data
  const handleRefreshChart = async (chart) => {
    if (!refreshChartData) return;
    
    try {
      setRefreshingChartId(chart.id);
      await refreshChartData(chart);
    } catch (err) {
      console.error('Error refreshing chart:', err);
    } finally {
      setRefreshingChartId(null);
    }
  };

  // Start editing chart title
  const startEditingTitle = (chart, e) => {
    e.stopPropagation();
    if (!editMode) return;

    setEditingTitleId(chart.id);
    setTempTitle(chart.title);
  };

  // Save edited chart title
  const saveChartTitle = (chart, e) => {
    e.stopPropagation();
    
    if (tempTitle.trim() === '') {
      // Don't allow empty titles
      setTempTitle(chart.title);
      setEditingTitleId(null);
      return;
    }

    // Create an updated chart object
    const updatedChart = {
      ...chart,
      title: tempTitle.trim()
    };

    // Update the chart in the parent component
    if (updateChartInWorkspace) {
      updateChartInWorkspace(updatedChart);
    }

    // If this is also the selected chart, update that as well
    if (selectedChart && selectedChart.id === chart.id) {
      setSelectedChart(updatedChart);
    }

    setEditingTitleId(null);
  };

  // Handle title input key press (for Enter and Escape)
  const handleTitleKeyPress = (chart, e) => {
    if (e.key === 'Enter') {
      saveChartTitle(chart, e);
    } else if (e.key === 'Escape') {
      setEditingTitleId(null);
      setTempTitle(chart.title);
    }
  };

  // Handle click outside the title input to save
  const handleClickOutside = (chart, e) => {
    if (editingTitleId === chart.id) {
      saveChartTitle(chart, e);
    }
  };

  // Ensure chart data has proper colors
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
            pointRadius: 4
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
        return {
          ...chartData,
          datasets: chartData.datasets.map((dataset, datasetIndex) => ({
            ...dataset,
            backgroundColor: CATEGORICAL_COLORS[datasetIndex % CATEGORICAL_COLORS.length],
            borderColor: CATEGORICAL_BORDERS[datasetIndex % CATEGORICAL_BORDERS.length],
            borderWidth: 2,
            pointBackgroundColor: CATEGORICAL_BORDERS[datasetIndex % CATEGORICAL_BORDERS.length]
          }))
        };
        
      case 'scatter':
        return {
          ...chartData,
          datasets: chartData.datasets.map((dataset, datasetIndex) => ({
            ...dataset,
            backgroundColor: CATEGORICAL_COLORS[datasetIndex % CATEGORICAL_COLORS.length],
            borderColor: CATEGORICAL_BORDERS[datasetIndex % CATEGORICAL_BORDERS.length],
            borderWidth: 1,
            pointRadius: 6
          }))
        };
        
      default:
        return chartData;
    }
  };

  return (
    <div className="chart-workspace">
      {/* Header */}
      <div className="workspace-header">
        <div className="header-left">
          <h2>Chart Workspace</h2>
        </div>
      
        <div className="workspace-title-container">
          <input
            type="text"
            className="workspace-title-input"
            value={workspaceTitle}
            onChange={(e) => setWorkspaceTitle(e.target.value)}
            placeholder="Workspace Title"
            title="Edit workspace title"
          />
        </div>
        <div className="header-right">
  <button 
    className={`edit-toggle ${editMode ? 'active' : ''}`}
    onClick={() => {
      // If exiting edit mode, make sure no title is being edited
      if (editMode && editingTitleId) {
        const chart = workspaceCharts.find(c => c.id === editingTitleId);
        if (chart) {
          saveChartTitle(chart, { stopPropagation: () => {} });
        }
      }
      setEditMode(!editMode);
    }}
    title={editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
  >
    <Edit size={16} />
    {editMode ? "Exit Edit" : "Edit"}
  </button>
  
  {/* Add Save Workspace button */}
  <button
    className="save-workspace-button"
    onClick={saveWorkspaceToSupabase}
    disabled={savingWorkspace}
    title="Save entire workspace to your account"
  >
    {savingWorkspace ? <RefreshCw size={16} className="spinner" /> : <Save size={16} />}
    Save Workspace
  </button>
</div>
      </div>

      {/* Sidebar and Main Content */}
      <div className="workspace-main-container">
        {/* Sidebar with visualization options */}
        <div className="workspace-sidebar">
          <div className="sidebar-search">
            <input
              type="text"
              placeholder="Search charts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="visualization-categories">
            <h3>Charts ({workspaceCharts.length})</h3>
            
            {/* Display charts grouped by type */}
            {Object.entries(chartCategories).map(([category, charts]) => (
              charts.length > 0 && (
                <div key={category} className="chart-category">
                  <h4>{category} ({charts.length})</h4>
                  <ul className="category-charts">
                    {charts.map(chart => (
                      <li 
                        key={chart.id}
                        className={`category-chart ${selectedChart?.id === chart.id ? 'selected' : ''}`}
                        onClick={() => setSelectedChart(chart)}
                      >
                        {chart.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
          
          {/* Chart details panel */}
          {selectedChart && (
            <div className="chart-details-panel">
              <h3>Chart Details</h3>
              <div className="chart-details">
                <p><strong>Title:</strong> {selectedChart.title}</p>
                <p><strong>Type:</strong> {selectedChart.type}</p>
                <p><strong>X Axis:</strong> {selectedChart.xAxis}</p>
                <p><strong>Y Axis:</strong> {selectedChart.yAxis}</p>
                {selectedChart.lastUpdated && (
                  <p><strong>Created:</strong> {new Date(selectedChart.lastUpdated).toLocaleString()}</p>
                )}
              </div>
              
              <div className="chart-actions">
                <button 
                  onClick={() => loadChartFromWorkspace(selectedChart)} 
                  className="edit-chart-button"
                >
                  Edit Chart
                </button>
                <button 
                  onClick={() => removeChartFromWorkspace(selectedChart.id)} 
                  className="remove-chart-button"
                >
                  Remove Chart
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Main content area with charts */}
        <div className="workspace-content grid">
          {workspaceCharts && workspaceCharts.length > 0 ? (
            <div className="workspace-charts grid">
              {filteredCharts.map(chart => {
                const ChartComp = ChartComponents[chart.type];
                const isSaving = savingChartId === chart.id;
                const isRefreshing = refreshingChartId === chart.id;
                const isStale = isChartDataStale(chart);
                const enhancedChartData = getEnhancedChartData(chart);
                const chartOptions = getChartOptions(chart.type);
                const isEditingThisTitle = editingTitleId === chart.id;
                
                return (
                  <div 
                    key={chart.id} 
                    className={`workspace-chart-card ${isStale ? 'stale-data' : ''} medium ${selectedChart?.id === chart.id ? 'selected' : ''}`}
                    onClick={() => setSelectedChart(chart)}
                  >
                    <div className="chart-card-header">
                      <div className="chart-title-container">
                        {editMode && isEditingThisTitle ? (
                          <input
                            ref={titleInputRef}
                            type="text"
                            className="chart-title-input"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={(e) => handleClickOutside(chart, e)}
                            onKeyDown={(e) => handleTitleKeyPress(chart, e)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3 
                            className={editMode ? "editable-title" : ""}
                            onClick={(e) => editMode && startEditingTitle(chart, e)}
                            title={editMode ? "Click to edit title" : ""}
                          >
                            {chart.title}
                            {editMode && <span className="edit-title-icon">✎</span>}
                          </h3>
                        )}
                        <div className="chart-metadata">
                          <span className="chart-type">{chart.type}</span>
                          {isStale && (
                            <span className="stale-badge" title="Data has been updated since this chart was created">
                              ⚠️ Stale data
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {editMode && (
                        <div className="chart-card-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadChartFromWorkspace(chart);
                            }}
                            className="edit-chart-button"
                            title="Edit chart"
                          >
                            <Edit size={14} />
                          </button>
                          
                          <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveChartToSupabase(chart);
                          }}
                          disabled={isSaving}
                          className="action-button"
                          title="Save"
                        >
                          {isSaving ? <RefreshCw size={14} className="spinner" /> : <Save size={14} />}
                        </button>
                          
                          {isStale && refreshChartData && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRefreshChart(chart);
                              }}
                              disabled={isRefreshing}
                              className="refresh-chart-button"
                              title="Refresh chart with latest data"
                            >
                              {isRefreshing ? 
                                <RefreshCw size={14} className="spinner" /> : 
                                <RefreshCw size={14} />
                              }
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeChartFromWorkspace(chart.id);
                            }}
                            disabled={isSaving || isRefreshing}
                            className="remove-chart-button"
                            title="Remove from workspace"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="workspace-chart">
                      {ChartComp ? (
                        <ChartComp 
                          data={enhancedChartData} 
                          options={{ 
                            ...chartOptions,
                            maintainAspectRatio: true,
                            responsive: true,
                            plugins: {
                              ...chartOptions.plugins,
                              title: {
                                display: chart.filters && Object.keys(chart.filters).length > 0,
                                text: chart.filters ? 'Filtered Data' : '',
                                position: 'bottom',
                                font: { size: 12, style: 'italic' },
                                padding: { top: 10, bottom: 0 },
                                color: '#666'
                              }
                            }
                          }} 
                        />
                      ) : (
                        <div className="chart-error">Chart type not available</div>
                      )}
                    </div>
                    
                    {!editMode && (
                      <div className="chart-actions-footer">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveChartToSupabase(chart);
                          }}
                          disabled={isSaving}
                          className="action-button"
                          title="Save"
                        >
                          {isSaving ? <RefreshCw size={14} className="spinner" /> : <Save size={14} />}
                        </button>
                        
                        {isStale && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefreshChart(chart);
                            }}
                            disabled={isRefreshing}
                            className="action-button"
                            title="Refresh"
                          >
                            {isRefreshing ? 
                              <RefreshCw size={14} className="spinner" /> : 
                              <RefreshCw size={14} />
                            }
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadChartFromWorkspace(chart);
                          }}
                          className="action-button"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        
                        <button
                          className="action-button"
                          title="Export"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-charts-message">
              <h3>No charts added to workspace yet</h3>
              <p>Create charts in Chart View and add them to workspace to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullWorkspace;