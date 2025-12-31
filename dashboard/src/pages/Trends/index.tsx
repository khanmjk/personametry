/**
 * Trends Page - Executive Trend Analysis
 * ---------------------------------------
 * Multi-year trend analysis with premium visualizations.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Select, Space, Typography, Segmented } from 'antd';
import { Column, Pie, Line } from '@ant-design/charts';
import type { TimeEntry, DataMetadata } from '@/models/personametry';
import {
  PERSONA_COLORS,
  PERSONA_SHORT_NAMES,
  YEAR_COLORS,
  META_WORK_LIFE_COLORS,
  MetaWorkLife,
  STATUS_COLORS,
} from '@/models/personametry';
import {
  loadTimeEntries,
  getAvailableYears,
  calculateYoYComparison,
  groupByPersona,
  filterByYear,
  sumHours,
  filterByMetaWorkLife,
  formatHours,
  getDataSource,
} from '@/services/personametryService';

const { Title, Text } = Typography;

const CARD_STYLE = {
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const TrendsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [metadata, setMetadata] = useState<DataMetadata | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [comparisonYear, setComparisonYear] = useState<number>(2022);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        setEntries(data.entries);
        setMetadata(data.metadata);
        const years = getAvailableYears(data.entries);
        setAvailableYears(years);
        setComparisonYear(years[0] || 2022);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const yoyData = calculateYoYComparison(entries, comparisonYear, comparisonYear - 1);

  // Work-Life Balance calculations
  const yearEntries = filterByYear(entries, comparisonYear);
  const workHours = sumHours(filterByMetaWorkLife(yearEntries, MetaWorkLife.WORK));
  const lifeHours = sumHours(filterByMetaWorkLife(yearEntries, MetaWorkLife.LIFE));
  const sleepHours = sumHours(filterByMetaWorkLife(yearEntries, MetaWorkLife.SLEEP_LIFE));
  const totalHours = workHours + lifeHours + sleepHours;

  const workLifeData = [
    { type: 'Work', value: Math.round(workHours), color: META_WORK_LIFE_COLORS[MetaWorkLife.WORK] },
    { type: 'Life', value: Math.round(lifeHours), color: META_WORK_LIFE_COLORS[MetaWorkLife.LIFE] },
    { type: 'Sleep', value: Math.round(sleepHours), color: META_WORK_LIFE_COLORS[MetaWorkLife.SLEEP_LIFE] },
  ];

  // Yearly stacked data
  const yearlyStackedData: { year: string; persona: string; hours: number }[] = [];
  for (const year of availableYears.slice().reverse()) {
    const yearData = filterByYear(entries, year);
    const summaries = groupByPersona(yearData);
    for (const s of summaries) {
      yearlyStackedData.push({
        year: year.toString(),
        persona: PERSONA_SHORT_NAMES[s.persona] || s.persona,
        hours: Math.round(s.totalHours),
      });
    }
  }

  // YoY Diverging bar data
  const yoyBarData = yoyData.map((item) => ({
    persona: PERSONA_SHORT_NAMES[item.persona],
    delta: Math.round(item.deltaHours),
    isPositive: item.deltaHours >= 0,
  })).sort((a, b) => b.delta - a.delta);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>Loading trend data...</Text>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert type="error" message="Unable to Load Data" description={error} showIcon />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{
        title: <span style={{ fontSize: 24, fontWeight: 600 }}>Trend Analysis</span>,
        extra: [
          <Space key="controls" align="center">
            <Text>Compare:</Text>
            <Select
              value={comparisonYear}
              onChange={setComparisonYear}
              style={{ width: 90 }}
              options={availableYears.map((y) => ({ label: y.toString(), value: y }))}
            />
            <Text>vs {comparisonYear - 1}</Text>
          </Space>,
        ],
      }}
    >
      {/* Row 1: Work-Life Balance + YoY Change */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={8}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Work-Life Balance</Title>}
            style={{ ...CARD_STYLE, height: 380 }}
          >
            <Pie
              data={workLifeData}
              angleField="value"
              colorField="type"
              radius={0.85}
              innerRadius={0.6}
              height={280}
              color={({ type }) => {
                const item = workLifeData.find((d) => d.type === type);
                return item?.color || '#888';
              }}
              label={{
                type: 'outer',
                content: ({ type, percent }) => `${type}\n${(percent * 100).toFixed(0)}%`,
                style: { fontSize: 11, fontWeight: 500 },
              }}
              legend={{
                position: 'bottom',
                itemName: { style: { fontSize: 12 } },
              }}
              statistic={{
                title: { content: comparisonYear.toString(), style: { fontSize: 14 } },
                content: { content: `${formatHours(totalHours)} hrs`, style: { fontSize: 18, fontWeight: 600 } },
              }}
            />
          </ProCard>
        </Col>

        <Col xs={24} lg={16}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Year-over-Year Change ({comparisonYear - 1} → {comparisonYear})</Title>}
            style={{ ...CARD_STYLE, height: 380 }}
          >
            <Column
              data={yoyBarData}
              xField="persona"
              yField="delta"
              height={290}
              color={({ isPositive }) => (isPositive ? STATUS_COLORS.success : STATUS_COLORS.error)}
              columnWidthRatio={0.5}
              label={{
                position: 'top',
                content: ({ delta }) => `${delta >= 0 ? '+' : ''}${delta}`,
                style: ({ isPositive }) => ({
                  fill: isPositive ? STATUS_COLORS.success : STATUS_COLORS.error,
                  fontSize: 11,
                  fontWeight: 600,
                }),
              }}
              xAxis={{ label: { style: { fontSize: 10 } } }}
              yAxis={{
                title: { text: 'Hours Change', style: { fontSize: 11 } },
                grid: { line: { style: { stroke: '#f0f0f0' } } },
              }}
              annotations={[
                {
                  type: 'line',
                  start: ['min', 0],
                  end: ['max', 0],
                  style: { stroke: '#888', lineWidth: 1, lineDash: [4, 4] },
                },
              ]}
            />
          </ProCard>
        </Col>
      </Row>

      {/* Row 2: Yearly Stacked Bar */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Total Hours by Year & Persona</Title>}
            style={{ ...CARD_STYLE, height: 420 }}
          >
            <Column
              data={yearlyStackedData}
              xField="year"
              yField="hours"
              seriesField="persona"
              isStack
              height={340}
              color={({ persona }) => {
                const fullName = Object.entries(PERSONA_SHORT_NAMES).find(([, short]) => short === persona)?.[0];
                return fullName ? PERSONA_COLORS[fullName] : '#888';
              }}
              label={{
                position: 'middle',
                content: ({ hours }) => (hours > 400 ? `${(hours / 1000).toFixed(1)}k` : ''),
                style: { fill: '#fff', fontSize: 10, fontWeight: 500 },
              }}
              legend={{
                position: 'right',
                itemName: { style: { fontSize: 12, fontWeight: 500 } },
              }}
              xAxis={{
                title: { text: 'Year', style: { fontSize: 12 } },
                label: { style: { fontSize: 12 } },
              }}
              yAxis={{
                title: { text: 'Total Hours', style: { fontSize: 12 } },
                grid: { line: { style: { stroke: '#f0f0f0' } } },
              }}
              tooltip={{
                formatter: (datum) => ({ name: datum.persona, value: `${datum.hours.toLocaleString()} hrs` }),
              }}
            />
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default TrendsPage;
