/**
 * Sleep Page - Life Constraints Analysis
 * ----------------------------------------
 * Dedicated page for P0 Sleep/Life Constraints metrics.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Statistic, Typography, Divider, Tag } from 'antd';
import { Column, Line } from '@ant-design/charts';
import { ClockCircleOutlined, RiseOutlined, FallOutlined, MoonOutlined, GlobalOutlined } from '@ant-design/icons';
import type { TimeEntry } from '@/models/personametry';
import { PERSONA_COLORS, STATUS_COLORS } from '@/models/personametry';
import { useYear } from '@/contexts/YearContext';
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
  
  // Use global year context
  const { selectedYear, setAvailableYears, availableYears, isAllTime } = useYear();

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
  }, [setAvailableYears]);

  // Filter for sleep only - handle All Time mode
  const allSleepEntries = filterByPersona(entries, SLEEP_PERSONA);
  const yearEntries = isAllTime ? entries : filterByYear(entries, selectedYear as number);
  const sleepEntries = filterByPersona(yearEntries, SLEEP_PERSONA);
  const sleepHours = sumHours(sleepEntries);
  const monthlyData = groupByMonth(sleepEntries);

  // Calculate total days for averaging
  const totalDays = isAllTime ? availableYears.length * 365 : 365;

  // Previous year comparison - only for specific year
  const prevSleepHours = !isAllTime 
    ? sumHours(filterByPersona(filterByYear(entries, (selectedYear as number) - 1), SLEEP_PERSONA))
    : 0;
  const deltaHours = sleepHours - prevSleepHours;
  const deltaPercent = prevSleepHours > 0 ? ((deltaHours / prevSleepHours) * 100) : 0;

  // Average per day
  const avgPerDay = sleepHours / totalDays;
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

  // Title suffix
  const titleSuffix = isAllTime ? 'All Time' : selectedYear.toString();

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
            {isAllTime && <Tag color="#0D7377" icon={<GlobalOutlined />} style={{ marginLeft: 12 }}>All Time</Tag>}
          </span>
        ),
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
            <Text type="secondary">{titleSuffix} total</Text>
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
        
        {/* vs Previous Year - only show for specific year */}
        {!isAllTime && (
          <Col xs={24} sm={12} md={6}>
            <ProCard style={CARD_STYLE}>
              <Statistic
                title={<Text strong>vs {(selectedYear as number) - 1}</Text>}
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
        )}
        
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
        {/* Monthly chart - adapts for All Time */}
        <Col xs={24} lg={isAllTime ? 24 : 14}>
          <ProCard
            title={
              <Title level={5} style={{ margin: 0 }}>
                {isAllTime ? 'Average Monthly Sleep (All Years)' : `Monthly Sleep Hours (${selectedYear})`}
              </Title>
            }
            style={{ ...CARD_STYLE, height: 380 }}
          >
            {isAllTime ? (
              // All Time: Average monthly sleep across all years
              <Column
                data={(() => {
                  // Calculate average hours per month across ALL years
                  const monthlyTotals: Record<string, { total: number; count: number }> = {};
                  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  
                  // Initialize all months
                  monthOrder.forEach(m => {
                    monthlyTotals[m] = { total: 0, count: 0 };
                  });
                  
                  // Aggregate all years' data
                  availableYears.forEach((year) => {
                    const yearEntriesForChart = filterByYear(entries, year);
                    const sleepForYear = filterByPersona(yearEntriesForChart, SLEEP_PERSONA);
                    const monthlyForYear = groupByMonth(sleepForYear);
                    monthlyForYear.forEach((m) => {
                      const shortMonth = m.monthName.substring(0, 3);
                      if (monthlyTotals[shortMonth]) {
                        monthlyTotals[shortMonth].total += m.hours;
                        monthlyTotals[shortMonth].count += 1;
                      }
                    });
                  });
                  
                  // Calculate averages
                  return monthOrder.map(month => ({
                    month,
                    hours: monthlyTotals[month].count > 0 
                      ? Math.round(monthlyTotals[month].total / monthlyTotals[month].count) 
                      : 0,
                  }));
                })()}
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
                  title: { text: 'Avg Hours', style: { fontSize: 12 } },
                  grid: { line: { style: { stroke: '#f0f0f0' } } },
                }}
              />
            ) : (
              // Specific year: Regular column chart
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
            )}
          </ProCard>
        </Col>
        
        <Col xs={24} lg={isAllTime ? 24 : 10}>
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
                title: (datum: { year: string }) => datum.year,
                items: [(datum: { year: string; hours: number }) => ({
                  name: 'Sleep Hours',
                  value: `${(datum.hours / 1000).toFixed(1)}k hrs`,
                })],
              }}
            />
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default SleepPage;
