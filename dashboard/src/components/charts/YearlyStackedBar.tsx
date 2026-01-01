/**
 * Yearly Stacked/Grouped Bar Chart
 * --------------------------------
 * Shows total hours.
 * Modes:
 * 1. Stacked: X=Year, Stack=Persona, Color=Persona
 * 2. Grouped: X=Persona, Group=Year, Color=Year
 */

import React from 'react';
import { Column } from '@ant-design/charts';
import { Card } from 'antd';
import type { TimeEntry } from '@/models/personametry';
import { PERSONA_COLORS, PERSONA_SHORT_NAMES, YEAR_COLORS } from '@/models/personametry';

interface YearlyStackedBarProps {
  entries: TimeEntry[];
  title?: string;
  height?: number;
  variant?: 'stacked' | 'grouped';
}

const YearlyStackedBar: React.FC<YearlyStackedBarProps> = ({
  entries,
  title = 'Hours by Year & Persona',
  height = 400,
  variant = 'stacked',
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

  // Sorting logic based on variant
  if (variant === 'grouped') {
      // For grouped view, sort by year to ensure correct legend order (2016 -> 2022)
      data.sort((a,b) => parseInt(a.year) - parseInt(b.year));
  } else {
      // For stacked view (default legacy behavior), explicit sorting might be less critical 
      // but G2Plot handles it.
  }

  // Configuration for Stacked vs Grouped
  const isStacked = variant === 'stacked';

  // Palette for Grouped view (Year Colors)
  const uniqueYears = Array.from(new Set(data.map(d => parseInt(d.year)))).sort((a,b) => a - b);
  const yearPalette = uniqueYears.map(y => YEAR_COLORS[y] || '#888');

  // Callback for Stacked view (Persona Colors)
  const getPersonaColor = (datum: { persona: string }) => {
      const fullName = Object.entries(PERSONA_SHORT_NAMES).find(
        ([_, short]) => short === datum.persona
      )?.[0];
      return fullName ? PERSONA_COLORS[fullName] : '#888888';
  };

  const config = {
    data,
    // Swap X/Series based on variant
    xField: isStacked ? 'year' : 'persona',
    yField: 'hours',
    seriesField: isStacked ? 'persona' : 'year',
    // Key fix: For grouped bars to be colorful, colorField MUST be set to the grouping field
    colorField: isStacked ? undefined : 'year', 
    
    isStack: isStacked,
    isGroup: !isStacked,
    
    height: height - 50,
    
    // Apply different color logic
    color: isStacked ? getPersonaColor : yearPalette,

    legend: {
      position: isStacked ? 'right' : 'top-left' as const,
    },
    label: {
      position: isStacked ? 'middle' : 'top' as const,
      style: {
        fill: isStacked ? '#fff' : '#666',
        fontSize: 10,
        fontWeight: isStacked ? 400 : 500,
      },
      layout: [
          { type: 'hide-overlap' }
      ],
      formatter: (datum: { hours: number }) => {
        // Only show label if bar is significant enough
        const threshold = isStacked ? 500 : 200;
        return datum.hours > threshold ? `${(datum.hours / 1000).toFixed(1)}k` : '';
      },
    },
    xAxis: {
      title: { text: isStacked ? 'Year' : null },
      label: { autoRotate: false },
    },
    yAxis: {
      title: { text: isStacked ? 'Total Hours' : 'Hours Logged' },
    },
    tooltip: {
      formatter: (datum: { year: string; persona: string; hours: number }) => ({
        name: isStacked ? datum.persona : datum.year,
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
