import React from 'react';
import { Histogram } from '@ant-design/charts';
import { Card } from 'antd';

interface StreakHistogramProps {
  data: { value: number; type: string }[];
  height?: number;
}

const StreakHistogram: React.FC<StreakHistogramProps> = ({ data, height = 300 }) => {
  const config = {
    data,
    binField: 'value',
    binWidth: 1, // Bucket by 1 day
    stackField: 'type',
    color: ['#d46b08', '#ffc069'], // Dark Orange for High Workload, Light for Late End
    height: height - 50,
    autoFit: true,
    tooltip: {
       showMarkers: false,
    },
    interactions: [{ type: 'element-active' }],
    meta: {
        value: {
            alias: 'Streak Length (Days)',
            min: 0,
        },
        count: {
            alias: 'Frequency',
        }
    }
  };

  return (
    <Card title="Distribution of Streak Lengths (Burnout Risk)" style={{ height }}>
      <Histogram {...config} />
    </Card>
  );
};

export default StreakHistogram;
