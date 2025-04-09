// src/components/ChartView/ChartStats.js
import React from 'react';
import { getColumnStatistics } from '../shared/utils';

const ChartStats = ({ data, yAxis }) => {
  const stats = getColumnStatistics(data, yAxis);

  return (
    <div className="chart-stats">
      <h3>Data Statistics</h3>
      <div>Total Rows: {data.length}</div>
      {yAxis && stats && (
        <div className="stats-details">
          <div>Min: {stats.min}</div>
          <div>Max: {stats.max}</div>
          <div>Average: {stats.average}</div>
          <div>Median: {stats.median}</div>
          <div>Sum: {stats.sum}</div>
        </div>
      )}
    </div>
  );
};

export default ChartStats;