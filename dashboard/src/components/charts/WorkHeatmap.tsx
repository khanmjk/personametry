import React from 'react';
import { Heatmap } from '@ant-design/charts';
import { Card } from 'antd';

interface WorkHeatmapProps {
  data: { year: number; month: number; hours: number }[];
  height?: number;
}

const WorkHeatmap: React.FC<WorkHeatmapProps> = ({ data, height = 300 }) => {
  // Transform for Heatmap: x=Month, y=Year, color=Hours
  const chartData = data.map((d) => ({
    month: `${d.month}`,
    year: `${d.year}`,
    hours: Math.round(d.hours),
  }));

  const config = {
    data: chartData,
    xField: 'month',
    yField: 'year',
    colorField: 'hours',
    // shape: 'square', // Removing to allow filling the cell
    color: ['#fff7e6', '#ffe7ba', '#ffc069', '#fa8c16', '#d46b08'], // P3 Orange Scale
    label: {
      offset: -2,
      style: {
        fill: '#555',
        shadowBlur: 2,
        shadowColor: 'rgba(255, 255, 255, .65)',
      },
    },
    hover: {
        opacity: 0.8
    },
    coordinate: {
        type: 'cartesian' as const, 
        reflect: 'y', // Ensure years go top-down or bottom-up as preferred? Standard is usually bottom-up for charts, but calendar often top-down. Let's try standard.
    },
    meta: {
        month: {
            type: 'cat',
            values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        },
        year: {
            type: 'cat',
        }
    },
    heatmapStyle: {
        stroke: '#fff',
        lineWidth: 1,
    },
    tooltip: {
        showMarkers: false,
        formatter: (datum: any) => {
            return { name: 'Hours', value: datum.hours + 'h' };
        }
    },
    height: height - 50,
  };

  return (
    <Card title="Work Intensity Heatmap (Monthly Hours)" style={{ height }}>
      <Heatmap {...config} />
    </Card>
  );
};

export default WorkHeatmap;
