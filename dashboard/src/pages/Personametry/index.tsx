/**
 * Personametry Dashboard - Executive Overview
 * --------------------------------------------
 * CEO-level dashboard with clean, premium visualizations.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Statistic, Select, Spin, Alert, Typography, Progress, Divider } from 'antd';
import { Column, Pie } from '@ant-design/charts';
import {
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  PieChartOutlined,
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

// Style constants for executive look
const CARD_STYLE = {
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const PersonametryDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [metadata, setMetadata] = useState<DataMetadata | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2022);
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

  // Calculate metrics
  const yearEntries = filterByYear(entries, selectedYear);
  const personaSummaries = groupByPersona(yearEntries);
  const monthlyTrends = groupByMonth(yearEntries);
  const totalHours = sumHours(yearEntries);
  const yoyComparison = calculateYoYComparison(entries, selectedYear, selectedYear - 1);

  // Pie chart data with proper labeling
  const pieData = personaSummaries.map((p) => ({
    type: PERSONA_SHORT_NAMES[p.persona] || p.persona,
    value: Math.round(p.totalHours),
  }));

  // Monthly bar chart data
  const monthlyBarData = monthlyTrends.map((m) => ({
    month: m.monthName,
    hours: Math.round(m.hours),
  }));

  // Top performer
  const topPersona = personaSummaries[0];
  const totalDays = Math.round(totalHours / 24);

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
            style={{ width: 140 }}
            options={[
              { label: 'Harvest ETL', value: 'harvest' },
              { label: 'QuickSight', value: 'quicksight' },
            ]}
          />,
          <Select
            key="year"
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 90 }}
            options={availableYears.map((y) => ({ label: y.toString(), value: y }))}
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
            <Text type="secondary">{totalDays} days tracked</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Top Persona</Text>}
              value={PERSONA_SHORT_NAMES[topPersona?.persona] || 'N/A'}
              valueStyle={{ color: PERSONA_COLORS[topPersona?.persona] || '#333', fontSize: 28, fontWeight: 600 }}
              prefix={<PieChartOutlined />}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Progress
              percent={topPersona?.percentageOfTotal || 0}
              strokeColor={PERSONA_COLORS[topPersona?.persona]}
              size="small"
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Time Entries</Text>}
              value={yearEntries.length.toLocaleString()}
              valueStyle={{ color: '#333', fontSize: 28, fontWeight: 600 }}
              prefix={<CalendarOutlined />}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">
              {metadata?.source === 'harvest_time_report_from2015-07-06to2022-07-31.xlsx' ? 'Harvest' : 'QuickSight'} data
            </Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Avg. Hours/Day</Text>}
              value={(totalHours / 365).toFixed(1)}
              suffix="hrs"
              valueStyle={{ color: '#333', fontSize: 28, fontWeight: 600 }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">Based on full year</Text>
          </ProCard>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        {/* Persona Pie Chart */}
        <Col xs={24} lg={10}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Time Distribution by Persona</Title>}
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
                content: ({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`,
                style: { fontSize: 12, fontWeight: 500 },
              }}
              legend={{
                position: 'right',
                itemName: {
                  style: { fontSize: 12, fontWeight: 500 },
                },
              }}
              statistic={{
                title: {
                  content: selectedYear.toString(),
                  style: { fontSize: 16, fontWeight: 500 },
                },
                content: {
                  content: `${formatHours(totalHours)} hrs`,
                  style: { fontSize: 20, fontWeight: 600 },
                },
              }}
              interactions={[{ type: 'element-active' }]}
            />
          </ProCard>
        </Col>

        {/* Monthly Hours Bar Chart */}
        <Col xs={24} lg={14}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Monthly Hours ({selectedYear})</Title>}
            style={{ ...CARD_STYLE, height: 420 }}
          >
            <Column
              data={monthlyBarData}
              xField="month"
              yField="hours"
              height={320}
              color={YEAR_COLORS[selectedYear] || '#0D7377'}
              columnWidthRatio={0.6}
              label={{
                position: 'top',
                content: ({ hours }) => `${hours}`,
                style: { fill: '#666', fontSize: 11, fontWeight: 500 },
              }}
              xAxis={{
                label: { style: { fontSize: 11 } },
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

      {/* YoY Comparison Grid */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Year-over-Year Comparison ({selectedYear} vs {selectedYear - 1})</Title>}
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
