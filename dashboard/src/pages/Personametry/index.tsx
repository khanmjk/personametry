/**
 * Personametry Dashboard - Executive Overview
 * --------------------------------------------
 * CEO-level dashboard excluding Sleep (see dedicated Sleep page).
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Statistic, Select, Spin, Alert, Typography, Progress, Divider, Tag, Space } from 'antd';
import { Column, Pie } from '@ant-design/charts';
import {
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import type { TimeEntry, DataMetadata } from '@/models/personametry';
import { PERSONA_COLORS, PERSONA_SHORT_NAMES, YEAR_COLORS, STATUS_COLORS } from '@/models/personametry';
import {
  loadTimeEntries,
  filterByYear,
  groupByPersona,
  groupByMonth,
  sumHours,
  getAvailableYears,
  calculateYoYComparison,
  formatHours,
  setDataSource,
  getDataSource,
  type DataSource,
} from '@/services/personametryService';

const { Title, Text } = Typography;

const CARD_STYLE = {
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const SLEEP_PERSONA = 'P0 Life Constraints (Sleep)';

const PersonametryDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [metadata, setMetadata] = useState<DataMetadata | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(2022);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [dataSource, setDataSourceState] = useState<DataSource>(getDataSource());

  const fetchData = async (source: DataSource) => {
    setLoading(true);
    try {
      setDataSource(source);
      const data = await loadTimeEntries(source);
      setEntries(data.entries);
      setMetadata(data.metadata);
      const years = getAvailableYears(data.entries);
      setAvailableYears(years);
      setSelectedYear(years[0] || 2022);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(dataSource);
  }, []);

  const handleDataSourceChange = (source: DataSource) => {
    setDataSourceState(source);
    fetchData(source);
  };

  // Filter entries - if ALL YEARS, use all entries; otherwise filter by year
  const filteredEntries = selectedYear === 'ALL' 
    ? entries 
    : filterByYear(entries, selectedYear);
  
  // EXCLUDE SLEEP from main dashboard metrics
  const entriesExcludingSleep = filteredEntries.filter(e => e.prioritisedPersona !== SLEEP_PERSONA);
  
  // Calculate metrics (excluding sleep)
  const personaSummaries = groupByPersona(entriesExcludingSleep);
  const monthlyTrends = groupByMonth(entriesExcludingSleep);
  const totalHours = sumHours(entriesExcludingSleep);

  // YoY comparison (excluding sleep)
  const currentYear = selectedYear === 'ALL' ? availableYears[0] : selectedYear;
  const yoyComparison = calculateYoYComparison(entries, currentYear, currentYear - 1)
    .filter(item => item.persona !== SLEEP_PERSONA);

  // Pie chart data - with percentage and hours in labels
  const pieData = personaSummaries.map((p) => ({
    type: PERSONA_SHORT_NAMES[p.persona] || p.persona,
    value: Math.round(p.totalHours),
    percentage: p.percentageOfTotal,
    fullName: p.persona,
  }));

  // Monthly bar chart data
  const monthlyBarData = monthlyTrends.map((m) => ({
    month: m.monthName,
    hours: Math.round(m.hours),
  }));

  // Top 3 personas (excluding sleep)
  const top3 = personaSummaries.slice(0, 3);
  const entryCount = entriesExcludingSleep.length;
  const yearLabel = selectedYear === 'ALL' ? 'All Years' : selectedYear.toString();

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>Loading your data...</Text>
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

  // Year options including ALL YEARS
  const yearOptions = [
    { label: 'ALL YEARS', value: 'ALL' as const },
    ...availableYears.map((y) => ({ label: y.toString(), value: y })),
  ];

  return (
    <PageContainer
      header={{
        title: (
          <span style={{ fontSize: 24, fontWeight: 600, color: '#333' }}>
            Dashboard Overview
          </span>
        ),
        extra: [
          <Select
            key="datasource"
            value={dataSource}
            onChange={handleDataSourceChange}
            style={{ width: 120 }}
            options={[
              { label: 'Harvest ETL', value: 'harvest' },
              { label: 'QuickSight', value: 'quicksight' },
            ]}
          />,
          <Select
            key="year"
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 120 }}
            options={yearOptions}
          />,
        ],
      }}
    >
      {/* KPI Summary Row */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Total Hours</Text>}
              value={formatHours(totalHours)}
              suffix="hrs"
              valueStyle={{ color: '#0D7377', fontSize: 28, fontWeight: 600 }}
              prefix={<ClockCircleOutlined />}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">Excludes sleep</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>Top 3 Personas</Text>
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>(excl. sleep)</Text>
            </div>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {top3.map((p, i) => (
                <div key={p.persona} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Space size={4}>
                    <TrophyOutlined style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }} />
                    <Tag color={PERSONA_COLORS[p.persona]} style={{ margin: 0 }}>
                      {PERSONA_SHORT_NAMES[p.persona]}
                    </Tag>
                  </Space>
                  <Text strong style={{ fontSize: 12 }}>{p.percentageOfTotal}%</Text>
                </div>
              ))}
            </Space>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Time Entries</Text>}
              value={entryCount.toLocaleString()}
              valueStyle={{ color: '#333', fontSize: 28, fontWeight: 600 }}
              prefix={<CalendarOutlined />}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">{metadata?.source?.includes('harvest') ? 'Harvest' : 'QuickSight'} data</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Avg. Hours/Day</Text>}
              value={(totalHours / (selectedYear === 'ALL' ? availableYears.length * 365 : 365)).toFixed(1)}
              suffix="hrs"
              valueStyle={{ color: '#333', fontSize: 28, fontWeight: 600 }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">{yearLabel}</Text>
          </ProCard>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        {/* Persona Pie Chart - EXCLUDING SLEEP with % and hours */}
        <Col xs={24} lg={10}>
          <ProCard
            title={
              <span>
                <Title level={5} style={{ margin: 0, display: 'inline' }}>Time Distribution</Title>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>(excludes sleep)</Text>
              </span>
            }
            style={{ ...CARD_STYLE, height: 420 }}
          >
            <Pie
              data={pieData}
              angleField="value"
              colorField="type"
              radius={0.85}
              innerRadius={0.55}
              height={320}
              color={({ type }) => {
                const persona = Object.entries(PERSONA_SHORT_NAMES).find(([, short]) => short === type)?.[0];
                return persona ? PERSONA_COLORS[persona] : '#888';
              }}
              label={{
                type: 'outer',
                content: ({ type, value, percentage }) => `${type}\n${(percentage * 100).toFixed(0)}% | ${formatHours(value)}h`,
                style: { fontSize: 11, fontWeight: 500, lineHeight: 1.2 },
              }}
              legend={{
                position: 'right',
                itemName: { style: { fontSize: 12, fontWeight: 500 } },
              }}
              statistic={{
                title: {
                  content: yearLabel,
                  style: { fontSize: 14, fontWeight: 500 },
                },
                content: {
                  content: `${formatHours(totalHours)} hrs`,
                  style: { fontSize: 18, fontWeight: 600 },
                },
              }}
              interactions={[{ type: 'element-active' }]}
            />
          </ProCard>
        </Col>

        {/* Monthly Hours Bar Chart - IMPROVED FONT */}
        <Col xs={24} lg={14}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Monthly Hours ({yearLabel})</Title>}
            style={{ ...CARD_STYLE, height: 420 }}
          >
            <Column
              data={monthlyBarData}
              xField="month"
              yField="hours"
              height={320}
              color={selectedYear === 'ALL' ? '#0D7377' : (YEAR_COLORS[selectedYear as number] || '#0D7377')}
              columnWidthRatio={0.6}
              label={{
                position: 'top',
                content: ({ hours }) => `${hours}`,
                style: { 
                  fill: '#333', 
                  fontSize: 13, 
                  fontWeight: 700,
                  textShadow: '0 0 3px #fff, 0 0 3px #fff',
                },
              }}
              xAxis={{
                label: { style: { fontSize: 12, fontWeight: 500 } },
              }}
              yAxis={{
                title: { text: 'Hours', style: { fontSize: 12 } },
                grid: { line: { style: { stroke: '#f0f0f0' } } },
              }}
              tooltip={{
                formatter: (datum) => ({ name: 'Hours', value: `${datum.hours} hrs` }),
              }}
            />
          </ProCard>
        </Col>
      </Row>

      {/* YoY Comparison Grid - EXCLUDING SLEEP */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <ProCard
            title={
              <span>
                <Title level={5} style={{ margin: 0, display: 'inline' }}>
                  Year-over-Year Comparison ({currentYear} vs {currentYear - 1})
                </Title>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>(excludes sleep)</Text>
              </span>
            }
            style={CARD_STYLE}
          >
            <Row gutter={[16, 16]}>
              {yoyComparison.map((item) => (
                <Col key={item.persona} xs={24} sm={12} md={8} lg={6} xl={4}>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      background: '#fafafa',
                      borderLeft: `4px solid ${PERSONA_COLORS[item.persona]}`,
                    }}
                  >
                    <Text strong style={{ color: PERSONA_COLORS[item.persona] }}>
                      {PERSONA_SHORT_NAMES[item.persona]}
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 20, fontWeight: 600 }}>
                        {formatHours(item.currentYearHours)}
                      </Text>
                      <Text type="secondary"> hrs</Text>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {item.deltaHours >= 0 ? (
                        <Text style={{ color: STATUS_COLORS.success }}>
                          <RiseOutlined /> +{formatHours(item.deltaHours)} ({item.percentageChange > 0 ? '+' : ''}{item.percentageChange}%)
                        </Text>
                      ) : (
                        <Text style={{ color: STATUS_COLORS.error }}>
                          <FallOutlined /> {formatHours(item.deltaHours)} ({item.percentageChange}%)
                        </Text>
                      )}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default PersonametryDashboard;
