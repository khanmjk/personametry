/**
 * Persona Detail Charts
 * ---------------------
 * Detailed breakdown of persona performance mimicking legacy QuickSight dashboard.
 * 
 * Logic:
 * - Standard View: 2-Year Comparison (Monthly + Annual)
 * - Professional View: 3-Year Comparison (Weekly + Monthly + Annual)
 */

import React from 'react';
import { Column } from '@ant-design/charts';
import { Row, Col, Typography, Card, Empty } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { 
  YEAR_COLORS, 
  PERSONA_SHORT_NAMES, 
  type TimeEntry 
} from '@/models/personametry';
import { 
  filterByPersona, 
  filterByYear, 
  groupByMonth, 
  groupByYear, 
  groupByWeek,
  formatHours 
} from '@/services/personametryService';

const { Title, Text } = Typography;

interface PersonaDetailChartsProps {
  entries: TimeEntry[];
  persona: string;
  currentYear: number;
}

const CARD_STYLE = {
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  marginBottom: 20
};

const PersonaDetailCharts: React.FC<PersonaDetailChartsProps> = ({
  entries,
  persona,
  currentYear
}) => {
  if (!persona) return <Empty description="Select a persona to view details" />;

  const isProfessional = persona === 'P3 Professional';
  const shortName = PERSONA_SHORT_NAMES[persona] || persona;

  // Filter for THIS persona only
  const personaEntries = filterByPersona(entries, persona);

  // Define year range
  // "Professional" gets 3 years (Current, Prev, Prev-1)
  // "Standard" gets 2 years (Current, Prev)
  const yearsToShow = isProfessional 
    ? [currentYear, currentYear - 1, currentYear - 2]
    : [currentYear, currentYear - 1];

  const relevantEntries = personaEntries.filter(e => yearsToShow.includes(e.year));

  // 1. Weekly Data (Only for Professional)
  const weeklyData = isProfessional ? groupByWeek(relevantEntries).map(w => ({
    week: w.week.toString(),
    year: w.year.toString(),
    hours: Math.round(w.hours),
    iso: w.startDate, // for sorting if needed
  })).sort((a,b) => {
     if (a.year !== b.year) return parseInt(a.year) - parseInt(b.year);
     return parseInt(a.week) - parseInt(b.week);
  }) : [];

  // 2. Monthly Data (For All)
  const monthlyData = groupByMonth(relevantEntries).map(m => ({
    month: m.monthName.substring(0, 3), // "Jan", "Feb"
    monthNum: m.month,
    year: m.year.toString(),
    hours: Math.round(m.hours)
  })).sort((a,b) => {
      // Sort logic: We want Month X-axis, Grouped by Year. 
      // Actually G2Plot needs raw data. For X-axis sorting, we might need to rely on monthNum if 'month' is string.
      if (a.year !== b.year) return parseInt(a.year) - parseInt(b.year);
      return a.monthNum - b.monthNum;
  });

  // 3. Annual Summary (For All)
  const yearlyMap = groupByYear(relevantEntries);
  const annualData = yearsToShow.map(y => ({
    year: y.toString(),
    hours: Math.round(yearlyMap.get(y) || 0)
  })).sort((a,b) => parseInt(a.year) - parseInt(b.year));

  // Palette construction
  // We need colors for the specific years shown
  const yearPalette = yearsToShow.sort().map(y => YEAR_COLORS[y] || '#888');

  // Common Configurations
  const commonConfig = {
    isGroup: true,
    seriesField: 'year',
    colorField: 'year', // CRITICAL RULE 5.3
    color: yearPalette,
    marginRatio: 0.1,
    label: {
      position: 'top',
      style: { fill: '#666', fontSize: 10, fontWeight: 500 },
      layout: [{ type: 'hide-overlap' }],
    } as any, // TS coercion for G2Plot loose types
    legend: { position: 'top-left' } as any,
  };

  return (
    <div style={{ marginTop: 24 }}>
      <Title level={4} style={{ marginBottom: 16 }}>{shortName} Analysis</Title>
      
      {/* 1. WEEKLY CHART (Professional Only) */}
      {isProfessional && (
        <ProCard 
          title="Weekly Comparison (3 Years)" 
          style={CARD_STYLE}
          tooltip="Comparison of work intensity by week number across 3 years"
        >
          <Column 
            {...commonConfig}
            data={weeklyData}
            xField="week"
            yField="hours"
            height={280}
            scrollbar={{ type: 'horizontal' }} // Enable scroll for 52 weeks
            xAxis={{ 
               title: { text: 'Week Number' },
               label: { autoHide: true }
            }}
            tooltip={{
               formatter: (datum: any) => ({ name: datum.year, value: `${datum.hours} hrs` })
            }}
          />
        </ProCard>
      )}

      <Row gutter={[20, 20]}>
        {/* 2. MONTHLY CHART */}
        <Col xs={24} lg={16}>
          <ProCard 
            title={isProfessional ? "Monthly Comparison (3 Years)" : "Monthly Comparison (2 Years)"}
            style={{ ...CARD_STYLE, height: 400 }}
          >
             <Column 
                {...commonConfig}
                data={monthlyData}
                xField="month"
                yField="hours"
                height={300}
                yAxis={{ title: { text: 'Hours' } }}
                // Explicitly set meta to sort months if needed, but array sort usually suffices
             />
          </ProCard>
        </Col>

        {/* 3. ANNUAL SUMMARY */}
        <Col xs={24} lg={8}>
          <ProCard 
            title="Full Year Summary" 
            style={{ ...CARD_STYLE, height: 400 }}
          >
             <Column 
                {...commonConfig}
                isGroup={false} // Summary is just one bar per year, side-by-side conceptually is just a bar chart
                seriesField="year" // Still color by year
                data={annualData}
                xField="year"
                yField="hours"
                height={300}
                label={{
                    position: 'middle',
                    style: { fill: '#fff', fontSize: 12, fontWeight: 600 },
                    content: (d: any) => formatHours(d.hours)
                }}
                legend={false} // No legend needed, label is x-axis
             />
          </ProCard>
        </Col>
      </Row>
    </div>
  );
};

export default PersonaDetailCharts;
