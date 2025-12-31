/**
 * YoY Comparison Bar Chart
 * -------------------------
 * Diverging bar chart showing year-over-year changes.
 */

import React from 'react';
import { Bar } from '@ant-design/charts';
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
  // Transform data for diverging bar chart
  const chartData = data.map((item) => ({
    persona: PERSONA_SHORT_NAMES[item.persona] || item.persona,
    delta: Math.round(item.deltaHours),
    percentChange: item.percentageChange,
    isPositive: item.deltaHours >= 0,
  }));

  // Sort by delta (largest positive to largest negative)
  chartData.sort((a, b) => b.delta - a.delta);

  const config = {
    data: chartData,
    xField: 'delta',
    yField: 'persona',
    height: height - 50,
    color: (datum: { isPositive: boolean }) => {
      return datum.isPositive ? '#52c41a' : '#ff4d4f';
    },
    label: {
      position: 'right' as const,
      formatter: (datum: { delta: number; percentChange: number }) => {
        const sign = datum.delta >= 0 ? '+' : '';
        return `${sign}${datum.delta}h (${sign}${datum.percentChange}%)`;
      },
      style: {
        fill: '#666',
        fontSize: 11,
      },
    },
    xAxis: {
      title: { text: 'Hours Change' },
      grid: {
        line: {
          style: {
            stroke: '#ddd',
            lineWidth: 1,
            lineDash: [4, 4],
          },
        },
      },
    },
    yAxis: {
      title: null,
    },
    barStyle: {
      radius: [4, 4, 4, 4],
    },
    tooltip: {
      formatter: (datum: { persona: string; delta: number; percentChange: number }) => ({
        name: datum.persona,
        value: `${datum.delta >= 0 ? '+' : ''}${datum.delta} hours (${datum.percentChange}%)`,
      }),
    },
    annotations: [
      {
        type: 'line',
        start: [0, 'min'],
        end: [0, 'max'],
        style: {
          stroke: '#888',
          lineWidth: 2,
          lineDash: [0],
        },
      },
    ],
  };

  return (
    <Card
      title={title || `Year-over-Year Change (${previousYear} → ${currentYear})`}
      style={{ height }}
    >
      <Bar {...config} />
    </Card>
  );
};

export default YoYComparisonBar;
