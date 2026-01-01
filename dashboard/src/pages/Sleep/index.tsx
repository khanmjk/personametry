/**
 * Sleep Page - Life Constraints Analysis
 * ----------------------------------------
 * Dedicated page for P0 Sleep/Life Constraints metrics.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Select, Statistic, Typography, Divider } from 'antd';
import { Column, Line } from '@ant-design/charts';
import { ClockCircleOutlined, RiseOutlined, FallOutlined, MoonOutlined } from '@ant-design/icons';
import type { TimeEntry } from '@/models/personametry';
import { PERSONA_COLORS, STATUS_COLORS } from '@/models/personametry';
import {
  loadTimeEntries,
  getAvailableYears,
  filterByYear,
  filterByPersona,
  groupByMonth,
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

const SleepPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2022);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        setEntries(data.entries);
        const years = getAvailableYears(data.entries);
        setAvailableYears(years);
        setSelectedYear(years[0] || 2022);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter for sleep only
  const yearEntries = filterByYear(entries, selectedYear);
  const sleepEntries = filterByPersona(yearEntries, SLEEP_PERSONA);
  const sleepHours = sumHours(sleepEntries);
  const monthlyData = groupByMonth(sleepEntries);

  // Previous year comparison
  const prevYearEntries = filterByYear(entries, selectedYear - 1);
  const prevSleepEntries = filterByPersona(prevYearEntries, SLEEP_PERSONA);
  const prevSleepHours = sumHours(prevSleepEntries);
  const deltaHours = sleepHours - prevSleepHours;
  const deltaPercent = prevSleepHours > 0 ? ((deltaHours / prevSleepHours) * 100) : 0;

  // Average per day
  const avgPerDay = sleepHours / 365;
  const targetPerDay = 8; // Target 8 hours sleep
  const isOnTarget = avgPerDay >= 7.5;

  // Monthly chart data
  const monthlyChartData = monthlyData.map((m) => ({
    month: m.monthName,
    hours: Math.round(m.hours),
    avgPerDay: Math.round((m.hours / 30) * 10) / 10,
  }));

  // Multi-year trend
  const yearlyTrend = availableYears.map((year) => {
    const yEntries = filterByYear(entries, year);
    const ySleepEntries = filterByPersona(yEntries, SLEEP_PERSONA);
    return {
      year: year.toString(),
      hours: Math.round(sumHours(ySleepEntries)),
    };
  }).reverse();

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>Loading sleep data...</Text>
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
          <span style={{ fontSize: 24, fontWeight: 600, color: PERSONA_COLORS[SLEEP_PERSONA] }}>
            <MoonOutlined style={{ marginRight: 8 }} />
            Sleep & Life Constraints
          </span>
        ),
        extra: [
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
      {/* KPI Row */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Total Sleep Hours</Text>}
              value={formatHours(sleepHours)}
              suffix="hrs"
              valueStyle={{ color: PERSONA_COLORS[SLEEP_PERSONA], fontSize: 28, fontWeight: 600 }}
              prefix={<ClockCircleOutlined />}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">{selectedYear} total</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Avg. Hours/Day</Text>}
              value={avgPerDay.toFixed(1)}
              suffix="hrs"
              valueStyle={{ 
                color: isOnTarget ? STATUS_COLORS.success : STATUS_COLORS.warning, 
                fontSize: 28, 
                fontWeight: 600 
              }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">Target: {targetPerDay} hrs/day</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>vs {selectedYear - 1}</Text>}
              value={deltaHours >= 0 ? `+${formatHours(deltaHours)}` : formatHours(deltaHours)}
              suffix="hrs"
              valueStyle={{ 
                color: deltaHours >= 0 ? STATUS_COLORS.success : STATUS_COLORS.error, 
                fontSize: 28, 
                fontWeight: 600 
              }}
              prefix={deltaHours >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text style={{ color: deltaPercent >= 0 ? STATUS_COLORS.success : STATUS_COLORS.error }}>
              {deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
            </Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Time Entries</Text>}
              value={sleepEntries.length.toLocaleString()}
              valueStyle={{ color: '#333', fontSize: 28, fontWeight: 600 }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">Sleep log entries</Text>
          </ProCard>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={14}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Monthly Sleep Hours ({selectedYear})</Title>}
            style={{ ...CARD_STYLE, height: 380 }}
          >
            <Column
              data={monthlyChartData}
              xField="month"
              yField="hours"
              height={290}
              color={PERSONA_COLORS[SLEEP_PERSONA]}
              columnWidthRatio={0.6}
              label={{
                position: 'top',
                content: ({ hours }: { hours: number }) => `${hours}`,
                style: { fill: '#333', fontSize: 12, fontWeight: 600 },
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
            title={<Title level={5} style={{ margin: 0 }}>Year-over-Year Trend</Title>}
            style={{ ...CARD_STYLE, height: 380 }}
          >
            <Line
              data={yearlyTrend}
              xField="year"
              yField="hours"
              height={290}
              color={PERSONA_COLORS[SLEEP_PERSONA]}
              point={{ size: 5, shape: 'circle' }}
              label={false}
              xAxis={{ label: { style: { fontSize: 11 } } }}
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
    </PageContainer>
  );
};

export default SleepPage;
