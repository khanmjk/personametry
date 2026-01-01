/**
 * YoY Comparison Bar Chart
 * -------------------------
 * Diverging bar chart showing year-over-year changes.
 */

import React from 'react';
import { Column } from '@ant-design/charts';
import { Card } from 'antd';
import type { YearlyComparison } from '@/models/personametry';
import { PERSONA_SHORT_NAMES } from '@/models/personametry';

interface YoYComparisonBarProps {
  data: YearlyComparison[];
  currentYear: number;
  previousYear: number;
  title?: string;
  height?: number;
}

const YoYComparisonBar: React.FC<YoYComparisonBarProps> = ({
  data,
  currentYear,
  previousYear,
  title,
  height = 350,
}) => {
  // Transform data for diverging column chart
  const chartData = data.map((item) => ({
    persona: PERSONA_SHORT_NAMES[item.persona] || item.persona,
    delta: Math.round(item.deltaHours),
    percentChange: item.percentageChange,
    type: item.deltaHours >= 0 ? 'Gain' : 'Loss',
  }));

  // Sort by delta (largest positive to largest negative)
  chartData.sort((a, b) => b.delta - a.delta);

  const config = {
    data: chartData,
    xField: 'persona',
    yField: 'delta',
    seriesField: 'type',
    height: height - 50,
    autoFit: true,
    // 'Gain' (G) comes before 'Loss' (L), so: [Green, Red]
    color: ['#52c41a', '#ff4d4f'],
    label: {
      position: 'middle' as const, // Safer position
      content: (datum: { delta: number; percentChange: number }) => {
        const sign = datum.delta >= 0 ? '+' : '';
        return `${sign}${datum.delta}h`;
      },
      style: {
        fill: '#fff',
        fontSize: 10,
      },
    },
    xAxis: {
      label: {
        autoHide: false,
        autoRotate: true,
      },
    },
    yAxis: {
      title: { text: 'Hours Change' },
    },
    tooltip: {
      formatter: (datum: { persona: string; delta: number; percentChange: number }) => ({
        name: datum.persona,
        value: `${datum.delta >= 0 ? '+' : ''}${datum.delta} hours (${datum.percentChange}%)`,
      }),
    },
  };

  return (
    <Card
      title={title || `Year-over-Year Change (${previousYear} → ${currentYear})`}
      style={{ height }}
    >
      <Column {...config} />
    </Card>
  );
};

export default YoYComparisonBar;
