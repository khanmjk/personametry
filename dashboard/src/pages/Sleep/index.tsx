/**
 * Sleep Page - Life Constraints Analysis
 * ----------------------------------------
 * Dedicated page for P0 Sleep/Life Constraints metrics.
 */

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';
dayjs.extend(dayOfYear);
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

import SleepHeatmap from '@/components/charts/SleepHeatmap';

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
  const currentYear = dayjs().year();
  const isCurrentYear = !isAllTime && selectedYear === currentYear;
  
  // For current year, use days elapsed so far. For past years, use full year (365/366).
  let totalDays = 365;
  if (isAllTime) {
    totalDays = availableYears.length * 365;
  } else if (isCurrentYear) {
    const startOfYear = dayjs().startOf('year');
    const now = dayjs();
    totalDays = now.diff(startOfYear, 'day', true); // Fractional days
  } else {
    // Handle leap years correctly for past years
    totalDays = dayjs(`${selectedYear}-12-31`).dayOfYear();
  }

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

  // Weekday vs Weekend Analysis
  const weekdayEntries = sleepEntries.filter(e => e.typeOfDay === 'Weekday');
  const weekendEntries = sleepEntries.filter(e => e.typeOfDay === 'Weekend');
  const weekdayHours = sumHours(weekdayEntries);
  const weekendHours = sumHours(weekendEntries);
  
  // Estimate days (approximation: 5/7 weekday, 2/7 weekend)
  const approxWeekdayDays = (totalDays * 5) / 7;
  const approxWeekendDays = (totalDays * 2) / 7;
  
  const avgWeekday = weekdayHours / approxWeekdayDays;
  const avgWeekend = weekendHours / approxWeekendDays;

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

  // Heatmap Data Preparation
  const heatmapData: { year: number; month: number; hours: number; days: number }[] = [];
  
  if (isAllTime) {
    availableYears.forEach(year => {
      const yEntries = filterByYear(entries, year);
      const ySleep = filterByPersona(yEntries, SLEEP_PERSONA);
      const mData = groupByMonth(ySleep);
      
      mData.forEach(m => {
        // Calculate days in this month
        const daysInMonth = dayjs(`${year}-${m.month}-01`).daysInMonth();
        heatmapData.push({
          year,
          month: m.month,
          hours: m.hours,
          days: daysInMonth
        });
      });
    });
  }

  // --- SLEEP SCHEDULE ANALYTICS ---

  // Helper: Parse time string "HH:mm" or "HH:mm:ss" to minutes from midnight
  const parseTime = (timeStr: string | undefined): number | null => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  // Helper: Circular Average for times (handles crossing midnight, e.g. 23:00 + 01:00 = 00:00)
  const getCircularAverageTime = (timesInMinutes: number[]): string | null => {
    if (timesInMinutes.length === 0) return null;
    
    // Convert to angles (0-360 degrees, where 0/360 = midnight/0 minutes)
    // 1440 minutes in a day
    const angles = timesInMinutes.map(t => (t / 1440) * 2 * Math.PI);
    
    let sinSum = 0;
    let cosSum = 0;
    
    angles.forEach(a => {
      sinSum += Math.sin(a);
      cosSum += Math.cos(a);
    });
    
    const avgSin = sinSum / angles.length;
    const avgCos = cosSum / angles.length;
    
    // Convert back to angle
    let avgAngle = Math.atan2(avgSin, avgCos);
    if (avgAngle < 0) avgAngle += 2 * Math.PI;
    
    // Convert back to minutes
    const avgMinutes = Math.round((avgAngle / (2 * Math.PI)) * 1440);
    
    const h = Math.floor(avgMinutes / 60);
    const m = avgMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  let avgBedtime = '-';
  let avgWakeup = '-';
  
  // Siesta Stats
  let siestaCount = 0;
  let avgSiestaDuration = 0;
  let siestaCountWeekday = 0;
  let siestaCountWeekend = 0;
  
  // Process sleep entries if we have detail data (startedAt/endedAt)
  // We only look at entries with explicit start/end times
  const detailedSleep = sleepEntries.filter(e => e.startedAt && e.endedAt);
  
  if (detailedSleep.length > 0) {
    const nightSleepStarts: number[] = [];
    const nightSleepEnds: number[] = [];
    const siestasAll: number[] = [];
    
    // We only need count for breakdown, but could do duration too if desired
    // Let's count them
    
    detailedSleep.forEach(e => {
      const start = parseTime(e.startedAt);
      const end = parseTime(e.endedAt);
      
      if (start !== null && end !== null) {
        // Heuristic: Night Sleep usually > 3 hours. Siestas usually < 3 hours.
        if (e.hours > 3.0) {
          nightSleepStarts.push(start);
          nightSleepEnds.push(end);
        } else {
          siestasAll.push(e.hours);
          siestaCount++;
          if (e.typeOfDay === 'Weekend') {
            siestaCountWeekend++;
          } else {
            siestaCountWeekday++;
          }
        }
      }
    });

    if (nightSleepStarts.length > 0) avgBedtime = getCircularAverageTime(nightSleepStarts) || '-';
    if (nightSleepEnds.length > 0) avgWakeup = getCircularAverageTime(nightSleepEnds) || '-';
    if (siestasAll.length > 0) {
      avgSiestaDuration = siestasAll.reduce((a, b) => a + b, 0) / siestasAll.length;
    }
  }
  // --------------------------------

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
        
        {/* Weekday vs Weekend Comparison */}
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
             <Row>
               <Col span={12}>
                 <Statistic
                    title={<Text strong style={{fontSize: 12}}>Weekday Avg</Text>}
                    value={avgWeekday.toFixed(1)}
                    suffix="h"
                    valueStyle={{ fontSize: 20, fontWeight: 600, color: '#666' }}
                 />
               </Col>
               <Col span={12}>
                 <Statistic
                    title={<Text strong style={{fontSize: 12}}>Weekend Avg</Text>}
                    value={avgWeekend.toFixed(1)}
                    suffix="h"
                    valueStyle={{ fontSize: 20, fontWeight: 600, color: PERSONA_COLORS[SLEEP_PERSONA] }}
                 />
               </Col>
             </Row>
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">
               {avgWeekend > avgWeekday ? `Catching up (+${(avgWeekend-avgWeekday).toFixed(1)}h)` : 'Consistent'}
            </Text>
          </ProCard>
        </Col>
        
        {/* Siesta / Nap Analytics */}
        <Col xs={24} sm={12} md={6}>
           <ProCard style={CARD_STYLE}>
             <Row>
               <Col span={12}>
                 <Statistic
                    title={<Text strong style={{fontSize: 12}}>Weekday Naps</Text>}
                    value={siestaCountWeekday}
                    valueStyle={{ fontSize: 20, fontWeight: 600, color: '#666' }}
                 />
               </Col>
               <Col span={12}>
                 <Statistic
                    title={<Text strong style={{fontSize: 12}}>Weekend Naps</Text>}
                    value={siestaCountWeekend}
                    valueStyle={{ fontSize: 20, fontWeight: 600, color: PERSONA_COLORS[SLEEP_PERSONA] }}
                 />
               </Col>
             </Row>
             <Divider style={{ margin: '12px 0' }} />
             <Text type="secondary">Avg Nap Duration: {avgSiestaDuration.toFixed(1)} hrs</Text>
           </ProCard>
        </Col>
      </Row>

      {/* Row 2: Sleep Schedule */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} md={12}>
           <ProCard style={{ ...CARD_STYLE, height: 140 }}>
             <Row align="middle" justify="space-between">
                <Col>
                  <Statistic
                    title="Average Bedtime"
                    value={avgBedtime}
                    prefix={<MoonOutlined />}
                    valueStyle={{ fontSize: 32, fontWeight: 700, color: '#1A237E' }}
                  />
                  <Text type="secondary">Typical time you fall asleep</Text>
                </Col>
                <Col>
                  <Statistic
                    title="Average Wake Up"
                    value={avgWakeup}
                    prefix={<RiseOutlined />}
                    valueStyle={{ fontSize: 32, fontWeight: 700, color: '#FFA000' }}
                  />
                  <Text type="secondary">Typical start of day</Text>
                </Col>
             </Row>
           </ProCard>
        </Col>
        
        {/* vs Previous Year (Moved here if not All Time, otherwise placeholder) */}
        {!isAllTime && (
          <Col xs={24} md={12}>
            <ProCard style={{ ...CARD_STYLE, height: 140 }}>
              <Statistic
                title={<Text strong>Year-over-Year Change</Text>}
                value={deltaHours >= 0 ? `+${formatHours(deltaHours)}` : formatHours(deltaHours)}
                suffix="hrs"
                valueStyle={{ 
                  color: deltaHours >= 0 ? STATUS_COLORS.success : STATUS_COLORS.error, 
                  fontSize: 32, 
                  fontWeight: 700 
                }}
                prefix={deltaHours >= 0 ? <RiseOutlined /> : <FallOutlined />}
              />
              <Text style={{ display: 'block', marginTop: 8 }} type="secondary">
                Compared to {(selectedYear as number) - 1} ({deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)
              </Text>
            </ProCard>
          </Col>
        )}
      </Row>

      {/* Charts Row */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        {/* Monthly chart - adapts for All Time */}
        <Col xs={24} lg={isAllTime ? 12 : 14}>
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
                tooltip={{
                  title: (datum: any) => datum.month,
                  items: [(datum: any) => ({ name: 'Avg Hours', value: `${datum.hours} hrs` })]
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
                tooltip={{
                  title: (datum: any) => datum.month,
                  items: [(datum: any) => ({ name: 'Total Hours', value: `${datum.hours} hrs` })]
                }}
              />
            )}
          </ProCard>
        </Col>
        
        <Col xs={24} lg={isAllTime ? 12 : 10}>
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

      {/* Heatmap Row - All Time Only */}
      {isAllTime && (
        <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
          <Col span={24}>
            <SleepHeatmap data={heatmapData} />
          </Col>
        </Row>
      )}
    </PageContainer>
  );
};

export default SleepPage;
