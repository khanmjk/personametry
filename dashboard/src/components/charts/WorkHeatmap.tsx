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
    shape: 'square',
    color: ['#e6f7ff', '#1890ff', '#0050b3'], // Light blue to dark blue
    label: {
      style: {
        fill: '#fff',
        shadowBlur: 2,
        shadowColor: 'rgba(0, 0, 0, .45)',
      },
    },
    hover: {
        opacity: 0.8
    },
    meta: {
        month: {
            type: 'cat',
            values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        }
    },
    heatmapStyle: {
        stroke: '#fff',
        lineWidth: 1,
    },
    tooltip: {
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
