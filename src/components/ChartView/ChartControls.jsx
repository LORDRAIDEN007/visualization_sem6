import React, { useState, useRef, useEffect } from 'react';
import { isNumeric } from '../shared/utils';
import { ChartComponents } from '../shared/constants';
import './ChartControls.css';

const ChartControls = ({ 
  xAxis, 
  setXAxis, 
  yAxis, 
  setYAxis, 
  graphType, 
  setGraphType, 
  columns, 
  data, 
  numericColumns, 
  addChartToWorkspace,
  workspaceVisible,
  setWorkspaceVisible
}) => {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  // Store parsed recommendations separately without applying them
  const [parsedRecommendations, setParsedRecommendations] = useState(null);
  // Track ALL previous recommendations to ensure we don't repeat
  const previousRecommendationsRef = useRef([]);
  // Add a state to control popup visibility with proper transitions
  const [popupVisible, setPopupVisible] = useState(false);
  // Track recommendation attempts to detect when we've exhausted options
  const [recommendationAttempts, setRecommendationAttempts] = useState(0);
  // Track available chart types based on selected axes
  const [availableChartTypes, setAvailableChartTypes] = useState(Object.keys(ChartComponents));

  // Update available chart types whenever axis selections change
  useEffect(() => {
    let newAvailableTypes = [...Object.keys(ChartComponents)];
    
    // If both X and Y are numeric, remove pie and doughnut charts from options
    if (xAxis && yAxis && isNumeric(data[0]?.[xAxis]) && isNumeric(data[0]?.[yAxis])) {
      newAvailableTypes = newAvailableTypes.filter(type => 
        type !== 'pie' && type !== 'doughnut'
      );
    }
    
    setAvailableChartTypes(newAvailableTypes);
    
    // If current graph type is not in available types, reset it
    if (graphType && !newAvailableTypes.includes(graphType)) {
      setGraphType('bar'); // Default to bar chart as fallback
    }
  }, [xAxis, yAxis, data, graphType, setGraphType]);

  const handleXAxisChange = (e) => {
    const value = e.target.value;
    setXAxis(value);
    if (value && !isNumeric(data[0]?.[value]) && !numericColumns.includes(yAxis)) {
      setYAxis('');
    }
  };

  // Helper function to create a recommendation key for comparison
  const getRecommendationKey = (rec) => {
    if (!rec) return '';
    return `${rec.xAxis || ''}-${rec.yAxis || ''}-${rec.chartType || ''}`;
  };

  // Check if a recommendation is unique compared to previous ones
  const isUniqueRecommendation = (rec) => {
    if (!rec) return false;
    const recKey = getRecommendationKey(rec);
    return !previousRecommendationsRef.current.some(prevRec => 
      getRecommendationKey(prevRec) === recKey
    );
  };

  const getGraphRecommendation = async (forceAlternative = false) => {
    setLoading(true);
    
    try {
      // Sample data for the API
      const sampleData = data.slice(0, 5);
      
      // Extract column data types for better recommendations
      const columnTypes = {};
      if (data.length > 0) {
        columns.forEach(col => {
          const sample = data[0][col];
          if (isNumeric(sample)) {
            columnTypes[col] = 'numeric';
          } else if (typeof sample === 'string') {
            if (Date.parse(sample)) {
              columnTypes[col] = 'date';
            } else {
              columnTypes[col] = 'categorical';
            }
          } else {
            columnTypes[col] = 'unknown';
          }
        });
      }
      
      // Enhanced instructions to prevent repeating recommendations
      let alternativeInstruction = '';
      if (forceAlternative && previousRecommendationsRef.current.length > 0) {
        alternativeInstruction = `
        IMPORTANT: Give me a DIFFERENT recommendation than ANY of these previous ones:
        ${previousRecommendationsRef.current.map((prevRec, index) => `
        RECOMMENDATION ${index + 1}:
        X-AXIS: ${prevRec.xAxis || 'none'}
        Y-AXIS: ${prevRec.yAxis || 'none'}
        CHART-TYPE: ${prevRec.chartType || 'none'}
        `).join('\n')}
        
        Choose different columns or a different chart type that would also work well.
        Be creative and consider less obvious but still valid visualization options.`;
      }
      
      // Track attempts to detect exhausted options
      if (forceAlternative) {
        setRecommendationAttempts(prev => prev + 1);
      } else {
        setRecommendationAttempts(0);
      }
      
      // Add constraint information about pie/doughnut charts
      const chartConstraints = `
      IMPORTANT CONSTRAINTS:
      - For pie or doughnut charts, the X-axis MUST be categorical (non-numeric).
      - If both X and Y axes are numeric, DO NOT recommend pie or doughnut charts.`;
      
      // Prepare data about current selections for the API
      const apiPayload = {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: "You are a data visualization expert. Recommend the best X-axis column, Y-axis column, and chart type for visualizing this dataset. Keep your response structured and specific."
          },
          {
            role: "user",
            content: `I have a dataset with these columns: ${columns.join(', ')}. 
            Column types: ${JSON.stringify(columnTypes)}
            Sample data: ${JSON.stringify(sampleData)}. 
            
            ${chartConstraints}
            
            Please recommend: 
            1. The best X-axis column
            2. The best Y-axis column (must be numeric if X is categorical)
            3. The optimal chart type from these options: ${Object.keys(ChartComponents).join(', ')}
            ${alternativeInstruction}
            
            Format your response like this:
            X-AXIS: [column name]
            Y-AXIS: [column name]
            CHART-TYPE: [chart type]
            EXPLANATION: [brief explanation of why this combination works well]`
          }
        ],
        temperature: forceAlternative ? 0.7 + (recommendationAttempts * 0.1) : 0.5, // Incrementally increase temperature
        max_tokens: 400
      };

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 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'
        },
        body: JSON.stringify(apiPayload)
      });

      const result = await response.json();
      
      if (result.choices && result.choices[0]?.message?.content) {
        const recommendationText = result.choices[0].message.content;
        
        // Extract values from structured response but don't apply them yet
        const xAxisMatch = recommendationText.match(/X-AXIS:\s*([^\n]+)/i);
        const yAxisMatch = recommendationText.match(/Y-AXIS:\s*([^\n]+)/i);
        const chartTypeMatch = recommendationText.match(/CHART-TYPE:\s*([^\n]+)/i);
        
        // Store parsed recommendations
        const newRecommendation = {
          xAxis: xAxisMatch && xAxisMatch[1].trim(),
          yAxis: yAxisMatch && yAxisMatch[1].trim(),
          chartType: chartTypeMatch && chartTypeMatch[1].trim().toLowerCase()
        };
        
        // Validate recommendations
        if (newRecommendation.xAxis && !columns.includes(newRecommendation.xAxis)) {
          newRecommendation.xAxis = null;
        }
        if (newRecommendation.yAxis && !columns.includes(newRecommendation.yAxis)) {
          newRecommendation.yAxis = null;
        }
        if (newRecommendation.chartType && !Object.keys(ChartComponents).includes(newRecommendation.chartType)) {
          newRecommendation.chartType = null;
        }
        
        // Additional validation for pie/doughnut charts
        if ((newRecommendation.chartType === 'pie' || newRecommendation.chartType === 'doughnut') && 
            newRecommendation.xAxis && isNumeric(data[0]?.[newRecommendation.xAxis])) {
          // Invalid recommendation - pie/doughnut with numeric X-axis
          // Try again or fallback to a different chart type
          newRecommendation.chartType = 'bar';
        }
        
        // Check if this is a repeated recommendation
        const isUnique = isUniqueRecommendation(newRecommendation);
        
        if (!isUnique && forceAlternative && recommendationAttempts < 5) {
          // Try again with higher temperature if we got a duplicate
          setLoading(false);
          getGraphRecommendation(true);
          return;
        } else if (!isUnique && forceAlternative) {
          // We've tried 5 times and still got repeats, show exhausted message
          const exhaustedMessage = `
X-AXIS: ${newRecommendation.xAxis || ''}
Y-AXIS: ${newRecommendation.yAxis || ''}
CHART-TYPE: ${newRecommendation.chartType || ''}
EXPLANATION: I've exhausted all meaningful chart recommendations for your dataset. This suggestion may be similar to previous ones. Consider manually exploring different combinations or enhancing your dataset with more columns for greater visualization variety.`;
          
          setRecommendation(exhaustedMessage);
          setParsedRecommendations(newRecommendation);
          setPopupVisible(true);
          return;
        }
        
        // Store validated recommendations for later application
        setParsedRecommendations(newRecommendation);
        
        // Add to our history of recommendations
        previousRecommendationsRef.current = [...previousRecommendationsRef.current, newRecommendation];
        
        // First set the content, then show the popup with proper animation
        setRecommendation(recommendationText);
        // Use a small timeout to ensure the DOM has updated
        setTimeout(() => {
          setPopupVisible(true);
        }, 50);
      } else {
        setRecommendation("Failed to get a recommendation. Please try again.");
        setParsedRecommendations(null);
        setPopupVisible(true);
      }
    } catch (error) {
      console.error("Error fetching recommendation:", error);
      setRecommendation("Error: Could not connect to Groq API");
      setParsedRecommendations(null);
      setPopupVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Function to generate an alternative recommendation
  const getAlternativeRecommendation = () => {
    getGraphRecommendation(true);
  };

  // Function to close the recommendation popup
  const closeRecommendation = () => {
    // First hide the popup with animation
    setPopupVisible(false);
    // Then clear the recommendation data after animation completes
    setTimeout(() => {
      setRecommendation(null);
      setParsedRecommendations(null);
    }, 300); // Match this to your CSS transition time
  };

  // Function to reset recommendations history
  const resetRecommendations = () => {
    previousRecommendationsRef.current = [];
    setRecommendationAttempts(0);
    getGraphRecommendation(false);
  };

  // Function to apply all recommendations with one click
  const applyAllRecommendations = () => {
    if (parsedRecommendations) {
      if (parsedRecommendations.xAxis) {
        setXAxis(parsedRecommendations.xAxis);
      }
      
      if (parsedRecommendations.yAxis) {
        setYAxis(parsedRecommendations.yAxis);
      }
      
      if (parsedRecommendations.chartType) {
        setGraphType(parsedRecommendations.chartType);
      }
    }
    
    closeRecommendation();
  };

  return (
    <div className="chart-controls">
      <div className="axis-selectors">
        <div>
          <label>X-Axis:</label>
          <select value={xAxis} onChange={handleXAxisChange}>
            <option value="">Select X-Axis</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label>Y-Axis:</label>
          <select value={yAxis} onChange={(e) => setYAxis(e.target.value)}>
            <option value="">Select Y-Axis</option>
            {(!xAxis || isNumeric(data[0]?.[xAxis]) ? columns : numericColumns).map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Graph Type:</label>
          <select 
            value={graphType} 
            onChange={(e) => setGraphType(e.target.value)}
          >
            {/* Only show chart types that are appropriate for the selected data */}
            {availableChartTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)} Chart
              </option>
            ))}
          </select>
        </div>
        
        {/* Smart recommendation button that works without pre-selecting values */}
        <button 
          className={`recommend-button ${loading ? 'loading' : ''}`}
          onClick={() => getGraphRecommendation(false)}
          disabled={loading}
        >
          {loading ? '' : 'Smart Chart Recommendations'}
        </button>
        
      
        
        {/* Add to Workspace button */}
        {xAxis && yAxis && (
          <button 
            className="add-to-workspace-button"
            onClick={addChartToWorkspace}
          >
            Add Chart to Workspace
          </button>
        )}
      </div>

      {/* Enhanced recommendation popup with proper animation control */}
      {recommendation && (
        <div className={`recommendation-popup ${popupVisible ? 'visible' : 'hidden'}`}>
          <div className="recommendation-content">
            <h3>Chart Recommendation</h3>
            <div className="formatted-recommendation">
              {recommendation.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            <div className="recommendation-actions">
              <button 
                onClick={applyAllRecommendations} 
                className="apply-button"
                disabled={!parsedRecommendations}
              >
                Apply Recommendations
              </button>
              <button 
                onClick={getAlternativeRecommendation} 
                className="alternative-button"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Try Alternative'}
              </button>
              {previousRecommendationsRef.current.length >= 3 && (
                <button 
                  onClick={resetRecommendations}
                  className="reset-button"
                  disabled={loading}
                >
                  Reset Recommendations
                </button>
              )}
              <button onClick={closeRecommendation} className="close-button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default ChartControls;