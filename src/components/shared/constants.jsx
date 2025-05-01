// src/components/shared/constants.js

import { Bar, Line, Pie, Doughnut, Radar, Scatter } from 'react-chartjs-2';

// Components for different chart types
export const ChartComponents = {
  bar: Bar,
  line: Line,
  pie: Pie,
  doughnut: Doughnut,
  radar: Radar,
  scatter: Scatter,
};

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
];

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

// Base chart options to be applied to all chart types
const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 500,
  },
  elements: {
    point: {
      radius: 3,
      hoverRadius: 5,
    },
    line: {
      tension: 0.1, // A slight curve for line charts
    },
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        boxWidth: 15,
        padding: 15,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      cornerRadius: 6,
      padding: 10,
      displayColors: true,
      usePointStyle: true,
    },
    // Define default zoom plugin options that can be overridden
    zoom: {
      pan: {
        enabled: false, // Enabled on a per-chart basis
        mode: 'xy',
        threshold: 10,
        modifierKey: 'shift', // Hold shift key to pan
      },
      zoom: {
        wheel: {
          enabled: false, // Enabled on a per-chart basis
          speed: 0.1,
        },
        pinch: {
          enabled: false, // Enabled on a per-chart basis
        },
        mode: 'xy',
        onZoomComplete: function({ chart }) {
          // This function fires when zooming is complete
          // You can use this to update any state if needed
        }
      },
      limits: {
        x: {min: 'original', max: 'original'},
        y: {min: 'original', max: 'original'}
      }
    }
  },
  interaction: {
    intersect: false,
    mode: 'nearest',
  },
  layout: {
    padding: {
      top: 5,
      bottom: 5,
      left: 5,
      right: 5,
    },
  },
};

// Scales configuration (only needed for certain chart types)
const scalesConfig = {
  scales: {
    x: {
      ticks: {
        maxRotation: 45,
        minRotation: 0,
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
  },
};

// Helper function to get chart options based on chart type
export const getChartOptions = (chartType) => {
  // Chart types that don't need scales
  const noScalesCharts = ['pie', 'doughnut', 'radar'];
  
  if (noScalesCharts.includes(chartType)) {
    return baseChartOptions;
  } else {
    // For charts that need scales (bar, line, scatter, etc.)
    return {
      ...baseChartOptions,
      ...scalesConfig
    };
  }
};

// Default chart options - maintaining backward compatibility
export const defaultChartOptions = {
  ...baseChartOptions,
  ...scalesConfig
};