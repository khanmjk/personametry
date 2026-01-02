/**
 * Persona Trend Line Chart
 * -------------------------
 * Multi-series line chart showing monthly trends by persona.
 */

import React from 'react';
import { Line } from '@ant-design/charts';
import { Card } from 'antd';
import type { TimeEntry } from '@/models/personametry';
import { PERSONA_COLORS, PERSONA_SHORT_NAMES } from '@/models/personametry';

interface PersonaTrendLineProps {
  entries: TimeEntry[];
  title?: string;
  height?: number;
  showAllPersonas?: boolean;
}

const PersonaTrendLine: React.FC<PersonaTrendLineProps> = ({
  entries,
  title = 'Monthly Persona Trends',
  height = 400,
  showAllPersonas = true,
}) => {
  // Aggregate data by month and persona
  const monthlyData = new Map<string, Map<string, number>>();

  for (const entry of entries) {
    const monthKey = `${entry.year}-${entry.month.toString().padStart(2, '0')}`;
    const persona = PERSONA_SHORT_NAMES[entry.prioritisedPersona] || entry.prioritisedPersona;

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, new Map());
    }
    const personaMap = monthlyData.get(monthKey)!;
    personaMap.set(persona, (personaMap.get(persona) || 0) + entry.hours);
  }

  // Convert to chart format
  const data: { month: string; persona: string; hours: number }[] = [];
  const sortedMonths = Array.from(monthlyData.keys()).sort();

  for (const month of sortedMonths) {
    const personaMap = monthlyData.get(month)!;
    for (const [persona, hours] of personaMap.entries()) {
      data.push({
        month: formatMonthLabel(month),
        persona,
        hours: Math.round(hours * 10) / 10,
      });
    }
  }

  const config = {
    data,
    xField: 'month',
    yField: 'hours',
    seriesField: 'persona',
    height: height - 50,
    smooth: true,
    color: (datum: { persona: string }) => {
      // Find the full persona name
      const fullName = Object.entries(PERSONA_SHORT_NAMES).find(
        ([_, short]) => short === datum.persona
      )?.[0];
      return fullName ? PERSONA_COLORS[fullName] : '#888888';
    },
    point: {
      size: 3,
      shape: 'circle',
    },
    legend: {
      position: 'top' as const,
    },
    xAxis: {
      label: {
        autoRotate: true,
        style: { fontSize: 10 },
      },
    },
    yAxis: {
      title: { text: 'Hours' },
    },
    tooltip: {
      title: (datum: { month: string }) => datum.month,
      items: [(datum: { month: string; persona: string; hours: number }) => ({
        name: datum.persona,
        value: `${datum.hours.toFixed(1)} hrs`,
      })],
    },
    interactions: [{ type: 'element-highlight' }],
  };

  return (
    <Card title={title} style={{ height }}>
      <Line {...config} />
    </Card>
  );
};

// Helper to format month label (e.g., "2024-01" -> "Jan '24")
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} '${year.slice(2)}`;
}

export default PersonaTrendLine;
