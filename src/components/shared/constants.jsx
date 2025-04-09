// src/components/shared/constants.js

import { Bar, Line, Pie, Doughnut, Radar, Scatter } from 'react-chartjs-2'

// Mapping of chart types to their respective components
export const ChartComponents = {
  bar: Bar,
  line: Line,
  pie: Pie,
  doughnut: Doughnut,
  radar: Radar,
  scatter: Scatter
}

// Color palette with distinct colors
export const COLOR_PALETTE = [
  'rgba(75, 192, 192, 0.6)',   // Teal
  'rgba(255, 99, 132, 0.6)',   // Pink
  'rgba(54, 162, 235, 0.6)',   // Blue
  'rgba(255, 206, 86, 0.6)',   // Yellow
  'rgba(153, 102, 255, 0.6)',  // Purple
  'rgba(255, 159, 64, 0.6)',   // Orange
  'rgba(199, 199, 199, 0.6)',  // Gray
  'rgba(83, 102, 255, 0.6)',   // Indigo
  'rgba(40, 159, 64, 0.6)',    // Green
  'rgba(210, 99, 132, 0.6)'    // Coral
]

// Create a darker version of the COLOR_PALETTE for highlights
export const HIGHLIGHT_PALETTE = COLOR_PALETTE.map(color => {
  // Convert "rgba(r, g, b, a)" to darker and more opaque version
  const rgba = color.match(/\d+(\.\d+)?/g);
  if (rgba && rgba.length >= 4) {
    const [r, g, b] = rgba.slice(0, 3).map(Number);
    // Make color darker (multiply by 0.8) and more opaque (0.9)
    return `rgba(${Math.floor(r * 0.8)}, ${Math.floor(g * 0.8)}, ${Math.floor(b * 0.8)}, 0.9)`;
  }
  return color;
});

// Chart options
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'right'
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== undefined) {
            label += context.parsed.y;
          } else if (context.parsed !== undefined) {
            label += context.parsed;
          }
          return label;
        }
      }
    }
  }
};