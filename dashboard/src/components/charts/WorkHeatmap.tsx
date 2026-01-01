import React from 'react';
import { Heatmap } from '@ant-design/charts';
import { Card } from 'antd';

interface WorkHeatmapProps {
  data: { year: number; month: number; hours: number }[];
  height?: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const WorkHeatmap: React.FC<WorkHeatmapProps> = ({ data, height = 400 }) => {
  // Transform for Heatmap: x=Year, y=Month (matching reference)
  const chartData = data.map((d) => ({
    year: `${d.year}`,
    month: MONTH_NAMES[d.month - 1] || `${d.month}`,
    hours: Math.round(d.hours),
  }));

  // Get unique years for x-axis ordering
  const years = [...new Set(data.map(d => d.year))].sort((a, b) => a - b).map(String);

  const config = {
    data: chartData,
    xField: 'year',      // Years on X-axis (columns)
    yField: 'month',     // Months on Y-axis (rows)
    colorField: 'hours',
    // Blue (low) to Red (high) diverging scale matching reference
    color: ['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#eff3ff', '#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#cb181d'],
    reflect: 'y', // Flip Y so Jan is at top
    label: {
      style: {
        fill: '#fff',
        fontSize: 11,
        fontWeight: 500,
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
      },
      formatter: (datum: any) => `${datum.hours}`,
    },
    meta: {
      year: {
        type: 'cat',
        values: years,
      },
      month: {
        type: 'cat',
        values: [...MONTH_NAMES].reverse(), // Reverse so Jan is at top
      },
    },
    xAxis: {
      title: { text: 'Year' },
      tickLine: null,
    },
    yAxis: {
      title: { text: 'Month' },
      tickLine: null,
    },
    heatmapStyle: {
      stroke: '#fff',
      lineWidth: 2,
    },
    tooltip: {
      showMarkers: false,
      formatter: (datum: any) => {
        return { name: `${datum.month} ${datum.year}`, value: `${datum.hours}h` };
      },
    },
    legend: {
      position: 'right' as const,
    },
    height: height - 60,
    autoFit: true,
  };

  return (
    <Card title="Work Hours Heatmap (2018-2024)" style={{ height }}>
      <Heatmap {...config} />
    </Card>
  );
};

export default WorkHeatmap;
