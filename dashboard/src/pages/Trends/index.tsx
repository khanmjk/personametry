/**
 * Trends Page - Executive Trend Analysis
 * ---------------------------------------
 * Multi-year trend analysis with premium visualizations.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Select, Space, Typography, Segmented } from 'antd';
import { Column, Pie } from '@ant-design/charts';
import YearlyStackedBar from '@/components/charts/YearlyStackedBar';
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

  // Create color palettes based on data order
  const yoyPalette = [
    YEAR_COLORS[comparisonYear - 1] || '#888',
    YEAR_COLORS[comparisonYear] || '#888'
  ];



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
            <Row gutter={16} align="middle" style={{ height: '100%' }}>
              <Col span={12}>
                <Pie
                  data={workLifeData}
                  angleField="value"
                  colorField="type"
                  radius={0.9}
                  innerRadius={0} // Full Pie as per Dashboard standard
                  height={280}
                  scale={{ color: { range: workLifeData.map(item => item.color) } }}
                  label={false}
                  legend={false}
                  statistic={false}
                  interactions={[{ type: 'element-active' }]}
                  tooltip={{
                    title: (datum: any) => datum.type,
                    items: [
                      (datum: any) => ({
                        name: datum.type,
                        value: `${formatHours(datum.value)} hrs`,
                      }),
                    ],
                  }}
                />
              </Col>
              <Col span={12}>
                <div style={{ paddingRight: 10 }}>
                  {workLifeData.map((item) => {
                    const percentage = totalHours > 0 ? Math.round((item.value / totalHours) * 100) : 0;
                    return (
                      <div 
                        key={item.type} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <Space size={8}>
                          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: item.color }} />
                          <Text style={{ fontSize: 13 }}>{item.type}</Text>
                        </Space>
                        <Space size={12}>
                          <Text strong style={{ fontSize: 13, minWidth: 40, textAlign: 'right' }}>{percentage}%</Text>
                          <Text type="secondary" style={{ fontSize: 12, minWidth: 50, textAlign: 'right' }}>{formatHours(item.value)}h</Text>
                        </Space>
                      </div>
                    );
                  })}
                </div>
              </Col>
            </Row>
          </ProCard>
        </Col>

        <Col xs={24} lg={16}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Year-over-Year Comparison ({comparisonYear - 1} vs {comparisonYear})</Title>}
            style={{ ...CARD_STYLE, height: 380 }}
          >
            <Column
              data={[
                ...groupByPersona(filterByYear(entries, comparisonYear - 1)).map(p => ({
                  persona: PERSONA_SHORT_NAMES[p.persona] || p.persona,
                  year: (comparisonYear - 1).toString(),
                  hours: Math.round(p.totalHours)
                })),
                ...groupByPersona(filterByYear(entries, comparisonYear)).map(p => ({
                  persona: PERSONA_SHORT_NAMES[p.persona] || p.persona,
                  year: comparisonYear.toString(),
                  hours: Math.round(p.totalHours)
                }))
              ].sort((a, b) => {
                 // Sort by year first (to ensure legend/series order is 2021, 2022)
                 if (a.year !== b.year) return parseInt(a.year) - parseInt(b.year);
                 // Then sort by persona
                 const pA = Object.keys(PERSONA_SHORT_NAMES).find(key => PERSONA_SHORT_NAMES[key] === a.persona) || a.persona;
                 const pB = Object.keys(PERSONA_SHORT_NAMES).find(key => PERSONA_SHORT_NAMES[key] === b.persona) || b.persona;
                 return pA.localeCompare(pB);
              })}
              xField="persona"
              yField="hours"
              seriesField="year"
              colorField="year"
              isGroup={true}
              height={290}
              color={yoyPalette}
              columnWidthRatio={0.6}
              marginRatio={0.1}
              label={{
                position: 'top',
                content: ({ hours }: { hours: number }) => hours > 100 ? `${(hours / 1000).toFixed(1)}k` : '',
                style: {
                    fill: '#666',
                    fontSize: 10,
                    fontWeight: 600
                },
              }}
              xAxis={{ 
                  label: { style: { fontSize: 11 } },
                  title: { text: null }
              }}
              yAxis={{
                title: { text: 'Total Hours', style: { fontSize: 11 } },
                grid: { line: { style: { stroke: '#f0f0f0' } } },
              }}
              legend={{
                  position: 'top-left'
              }}
            />
          </ProCard>
        </Col>
      </Row>

      {/* Row 2: Total Hours by Year & Persona */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
           {/* Reusing the robust component for consistency */}
           <YearlyStackedBar 
              entries={entries} 
              title="Total Hours by Year & Persona" 
              height={420} 
              variant="grouped" 
            />
        </Col>
      </Row>
    </PageContainer>
  );
};

export default TrendsPage;
