/**
 * All Time Page - Historical Overview
 * -------------------------------------
 * Multi-year analysis across all available data.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Statistic, Typography, Divider, Table, Space } from 'antd';
import { Column, Line } from '@ant-design/charts';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import type { TimeEntry } from '@/models/personametry';
import { PERSONA_COLORS, PERSONA_SHORT_NAMES, YEAR_COLORS, STATUS_COLORS } from '@/models/personametry';
import {
  loadTimeEntries,
  getAvailableYears,
  filterByYear,
  groupByPersona,
  sumHours,
  formatHours,
  getDataSource,
} from '@/services/personametryService';

const { Title, Text } = Typography;

const CARD_STYLE = {
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const SLEEP_PERSONA = 'P0 Life Constraints (Sleep)';

const AllTimePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        setEntries(data.entries);
        const years = getAvailableYears(data.entries);
        setAvailableYears(years);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Exclude sleep from all metrics
  const entriesExcludingSleep = entries.filter(e => e.prioritisedPersona !== SLEEP_PERSONA);
  
  // Total metrics
  const totalHours = sumHours(entriesExcludingSleep);
  const totalEntries = entriesExcludingSleep.length;
  const yearCount = availableYears.length;
  const avgPerYear = totalHours / yearCount;

  // Persona breakdown across all years
  const personaSummaries = groupByPersona(entriesExcludingSleep);

  // Yearly stacked data for chart
  const yearlyStackedData: { year: string; persona: string; hours: number }[] = [];
  for (const year of availableYears.slice().reverse()) {
    const yearData = filterByYear(entries, year).filter(e => e.prioritisedPersona !== SLEEP_PERSONA);
    const summaries = groupByPersona(yearData);
    for (const s of summaries) {
      yearlyStackedData.push({
        year: year.toString(),
        persona: PERSONA_SHORT_NAMES[s.persona] || s.persona,
        hours: Math.round(s.totalHours),
      });
    }
  }

  // Yearly totals for trend line
  const yearlyTotals = availableYears.map(year => {
    const yearData = filterByYear(entries, year).filter(e => e.prioritisedPersona !== SLEEP_PERSONA);
    return {
      year: year.toString(),
      hours: Math.round(sumHours(yearData)),
    };
  }).reverse();

  // YoY growth calculation
  const calculateGrowth = () => {
    if (yearlyTotals.length < 2) return { delta: 0, percent: 0 };
    const latest = yearlyTotals[yearlyTotals.length - 1].hours;
    const previous = yearlyTotals[yearlyTotals.length - 2].hours;
    const delta = latest - previous;
    const percent = previous > 0 ? Math.round((delta / previous) * 100) : 0;
    return { delta, percent };
  };
  const growth = calculateGrowth();

  // Table columns
  const columns = [
    {
      title: 'Persona',
      dataIndex: 'persona',
      key: 'persona',
      render: (persona: string) => (
        <Space>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: PERSONA_COLORS[persona] }} />
          <Text strong>{PERSONA_SHORT_NAMES[persona]}</Text>
        </Space>
      ),
    },
    {
      title: 'Total Hours',
      dataIndex: 'totalHours',
      key: 'totalHours',
      align: 'right' as const,
      render: (hours: number) => <Text strong>{formatHours(hours)} hrs</Text>,
    },
    {
      title: '% of Total',
      dataIndex: 'percentageOfTotal',
      key: 'percentageOfTotal',
      align: 'right' as const,
      render: (pct: number) => <Text>{pct}%</Text>,
    },
    {
      title: 'Avg/Year',
      dataIndex: 'totalHours',
      key: 'avgPerYear',
      align: 'right' as const,
      render: (hours: number) => <Text type="secondary">{formatHours(hours / yearCount)} hrs</Text>,
    },
  ];

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>Loading all-time data...</Text>
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
            <CalendarOutlined style={{ marginRight: 8 }} />
            All Time • {yearCount} Years
          </span>
        ),
        subTitle: `${availableYears[availableYears.length - 1]} - ${availableYears[0]}`,
      }}
    >
      {/* KPI Row */}
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
            <Statistic
              title={<Text strong>Time Entries</Text>}
              value={totalEntries.toLocaleString()}
              valueStyle={{ color: '#333', fontSize: 28, fontWeight: 600 }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">Across {yearCount} years</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Avg. Hours/Year</Text>}
              value={formatHours(avgPerYear)}
              suffix="hrs"
              valueStyle={{ color: '#333', fontSize: 28, fontWeight: 600 }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">Per year average</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Latest YoY Change</Text>}
              value={growth.delta >= 0 ? `+${formatHours(growth.delta)}` : formatHours(growth.delta)}
              suffix="hrs"
              valueStyle={{ 
                color: growth.delta >= 0 ? STATUS_COLORS.success : STATUS_COLORS.error, 
                fontSize: 28, 
                fontWeight: 600 
              }}
              prefix={growth.delta >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text style={{ color: growth.percent >= 0 ? STATUS_COLORS.success : STATUS_COLORS.error }}>
              {growth.percent >= 0 ? '+' : ''}{growth.percent}%
            </Text>
          </ProCard>
        </Col>
      </Row>

      {/* Yearly Trend Chart */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Annual Hours Trend (Excl. Sleep)</Title>}
            style={{ ...CARD_STYLE, height: 360 }}
          >
            <Line
              data={yearlyTotals}
              xField="year"
              yField="hours"
              height={280}
              color="#0D7377"
              point={{ size: 6, shape: 'circle', style: { fill: '#0D7377' } }}
              label={false}
              xAxis={{ label: { style: { fontSize: 12, fontWeight: 500 } } }}
              yAxis={{
                title: { text: 'Total Hours', style: { fontSize: 12 } },
                grid: { line: { style: { stroke: '#f0f0f0' } } },
              }}
              tooltip={{
                formatter: (datum: { year: string; hours: number }) => ({
                  name: datum.year,
                  value: `${(datum.hours / 1000).toFixed(1)}k hrs`,
                }),
              }}
            />
          </ProCard>
        </Col>
      </Row>

      {/* Stacked Bar + Table */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={14}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Hours by Year & Persona</Title>}
            style={{ ...CARD_STYLE, height: 420 }}
          >
            <Column
              data={yearlyStackedData}
              xField="year"
              yField="hours"
              seriesField="persona"
              isStack
              height={340}
              color={({ persona }: { persona: string }) => {
                const fullName = Object.entries(PERSONA_SHORT_NAMES).find(([, short]) => short === persona)?.[0];
                return fullName ? PERSONA_COLORS[fullName] : '#888';
              }}
              label={{
                position: 'middle',
                content: ({ hours }: { hours: number }) => (hours > 300 ? `${(hours / 1000).toFixed(1)}k` : ''),
                style: { fill: '#fff', fontSize: 10, fontWeight: 500 },
              }}
              legend={{
                position: 'right',
                itemName: { style: { fontSize: 12, fontWeight: 500 } },
              }}
              xAxis={{ label: { style: { fontSize: 11 } } }}
              yAxis={{
                title: { text: 'Hours', style: { fontSize: 12 } },
                grid: { line: { style: { stroke: '#f0f0f0' } } },
              }}
            />
          </ProCard>
        </Col>
        <Col xs={24} lg={10}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Persona Breakdown (All Time)</Title>}
            style={{ ...CARD_STYLE, height: 420 }}
          >
            <Table
              dataSource={personaSummaries}
              columns={columns}
              pagination={false}
              size="small"
              rowKey="persona"
            />
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default AllTimePage;
