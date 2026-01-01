import React from 'react';
import { Column } from '@ant-design/charts';
import { Card } from 'antd';
import { PERSONA_COLORS } from '@/models/personametry';

interface LateNightChartProps {
  data: { day: string; count: number }[];
  height?: number;
}

const LateNightChart: React.FC<LateNightChartProps> = ({ data, height = 300 }) => {
  const config = {
    data,
    xField: 'day',
    yField: 'count',
    color: PERSONA_COLORS['P3 Professional'],
    label: {
      position: 'middle' as const,
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    height: height - 50,
    autoFit: true,
  };

  return (
    <Card title="Late Days by Day of Week (> 7 PM)" style={{ height }}>
      <Column {...config} />
    </Card>
  );
};

export default LateNightChart;
