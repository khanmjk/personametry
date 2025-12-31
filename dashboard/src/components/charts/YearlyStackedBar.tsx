/**
 * Yearly Stacked Bar Chart
 * -------------------------
 * Shows total hours per year, stacked by persona.
 */

import React from 'react';
import { Column } from '@ant-design/charts';
import { Card } from 'antd';
import type { TimeEntry } from '@/models/personametry';
import { PERSONA_COLORS, PERSONA_SHORT_NAMES } from '@/models/personametry';

interface YearlyStackedBarProps {
  entries: TimeEntry[];
  title?: string;
  height?: number;
}

const YearlyStackedBar: React.FC<YearlyStackedBarProps> = ({
  entries,
  title = 'Hours by Year & Persona',
  height = 400,
}) => {
  // Aggregate data by year and persona
  const yearlyData = new Map<number, Map<string, number>>();

  for (const entry of entries) {
    const year = entry.year;
    const persona = PERSONA_SHORT_NAMES[entry.prioritisedPersona] || entry.prioritisedPersona;

    if (!yearlyData.has(year)) {
      yearlyData.set(year, new Map());
    }
    const personaMap = yearlyData.get(year)!;
    personaMap.set(persona, (personaMap.get(persona) || 0) + entry.hours);
  }

  // Convert to chart format
  const data: { year: string; persona: string; hours: number }[] = [];
  const sortedYears = Array.from(yearlyData.keys()).sort();

  for (const year of sortedYears) {
    const personaMap = yearlyData.get(year)!;
    for (const [persona, hours] of personaMap.entries()) {
      data.push({
        year: year.toString(),
        persona,
        hours: Math.round(hours),
      });
    }
  }

  // Sort personas in consistent order (by total hours)
  const personaTotals = new Map<string, number>();
  for (const d of data) {
    personaTotals.set(d.persona, (personaTotals.get(d.persona) || 0) + d.hours);
  }
  const sortedPersonas = Array.from(personaTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);

  const config = {
    data,
    xField: 'year',
    yField: 'hours',
    seriesField: 'persona',
    isStack: true,
    height: height - 50,
    color: (datum: { persona: string }) => {
      // Find the full persona name
      const fullName = Object.entries(PERSONA_SHORT_NAMES).find(
        ([_, short]) => short === datum.persona
      )?.[0];
      return fullName ? PERSONA_COLORS[fullName] : '#888888';
    },
    legend: {
      position: 'right' as const,
    },
    label: {
      position: 'middle' as const,
      style: {
        fill: '#fff',
        fontSize: 10,
      },
      formatter: (datum: { hours: number }) => {
        return datum.hours > 500 ? `${Math.round(datum.hours / 100) / 10}k` : '';
      },
    },
    xAxis: {
      title: { text: 'Year' },
    },
    yAxis: {
      title: { text: 'Total Hours' },
    },
    tooltip: {
      formatter: (datum: { year: string; persona: string; hours: number }) => ({
        name: datum.persona,
        value: `${datum.hours.toLocaleString()} hrs`,
      }),
    },
    interactions: [{ type: 'element-highlight-by-color' }],
  };

  return (
    <Card title={title} style={{ height }}>
      <Column {...config} />
    </Card>
  );
};

export default YearlyStackedBar;
