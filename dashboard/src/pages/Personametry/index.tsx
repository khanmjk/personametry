/**
 * Personametry Dashboard - Executive Overview
 * --------------------------------------------
 * CEO-level dashboard excluding Sleep (see dedicated Sleep page).
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Statistic, Select, Spin, Alert, Typography, Divider, Tag, Space } from 'antd';
import { Column, Pie, Radar } from '@ant-design/charts';
import {
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  TrophyOutlined,
  GlobalOutlined,
  FireOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import isLeapYear from 'dayjs/plugin/isLeapYear';

dayjs.extend(dayOfYear);
dayjs.extend(isLeapYear);
import type { TimeEntry, DataMetadata } from '@/models/personametry';
import { PERSONA_COLORS, PERSONA_SHORT_NAMES, YEAR_COLORS, STATUS_COLORS } from '@/models/personametry';
import { useYear } from '@/contexts/YearContext';
import {
  loadTimeEntries,
  filterByYear,
  groupByPersona,
  groupByMonth,
  sumHours,
  getAvailableYears,
  calculateYoYComparison,
  formatHours,
  getDataSource,
  groupByDay,
  groupEntriesByPeriod,
  getLastNDays,
  getPersonaColor,
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
  
  // Use global year context
  const { selectedYear, setAvailableYears, availableYears, isAllTime } = useYear();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        setEntries(data.entries);
        setMetadata(data.metadata);
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

  // Calculate total days for All Time average calculation
  const allYears = getAvailableYears(entries);
  const totalDaysAllTime = allYears.length * 365;

  // Filter entries by selected year (or all if 'ALL')
  const yearEntries = isAllTime ? entries : filterByYear(entries, selectedYear as number);
  
  // EXCLUDE SLEEP from main dashboard metrics
  const entriesExcludingSleep = yearEntries.filter(e => e.prioritisedPersona !== SLEEP_PERSONA);
  
  // Calculate metrics (excluding sleep)
  const personaSummaries = groupByPersona(entriesExcludingSleep);
  const monthlyTrends = groupByMonth(entriesExcludingSleep);
  const totalHours = sumHours(entriesExcludingSleep);
  
  // Calculate total hours WITH sleep for comparison
  const totalHoursWithSleep = sumHours(yearEntries);

  // YoY comparison (excluding sleep) - only when specific year selected
  const yoyComparison = isAllTime ? [] : calculateYoYComparison(entries, selectedYear as number, (selectedYear as number) - 1)
    .filter(item => item.persona !== SLEEP_PERSONA);

  // ==========================================
  // CURRENT PULSE LOGIC (Last 30 Days)
  // ==========================================
  const currentYear = new Date().getFullYear();
  const isCurrentYear = !isAllTime && selectedYear === currentYear;
  
  // State for granularity control
  const [pulseGranularity, setPulseGranularity] = useState<'day' | 'week' | 'month'>('day');
  // State for persona filtering
  const [pulsePersona, setPulsePersona] = useState<string>('All');

  // get list of personas for dropdown
  const personaOptions = [
    { label: 'All Personas', value: 'All' },
    ...Object.keys(PERSONA_SHORT_NAMES)
      .filter(p => p !== SLEEP_PERSONA)
      .map(p => {
        const shortName = PERSONA_SHORT_NAMES[p] || p;
        return { label: shortName, value: shortName };
      })
  ];

  // Data for Pulse Chart
  // Daily: Last 30 Days
  // Weekly/Monthly: All entries for the current year
  const pulseEntries = isCurrentYear 
    ? (pulseGranularity === 'day' ? getLastNDays(entries, 30) : filterByYear(entries, currentYear))
    : [];

  const pulseSummaries = isCurrentYear ? groupEntriesByPeriod(pulseEntries, pulseGranularity) : [];
  
  // Transform for Ant Design Charts (Stacked Column)
  const pulseData: { date: string; persona: string; hours: number; rawDate: string }[] = [];
  if (isCurrentYear) {
    pulseSummaries.forEach((period: any) => {
      Object.entries(period.byPersona).forEach(([persona, hours]) => {
         // Exclude sleep
         if (persona !== 'Sleep' && persona !== SLEEP_PERSONA) {
             // Apply Persona Filter
             // persona is Short Name (from service), pulsePersona is Short Name (from select)
             if (pulsePersona !== 'All' && persona !== pulsePersona) {
                 return;
             }

             // Optimize label for Day view to save space (e.g. "Dec 4")
             const displayDate = pulseGranularity === 'day' 
                ? dayjs(period.date).format('MMM D') 
                : period.date;
                
             pulseData.push({
                 date: displayDate, 
                 rawDate: period.date,
                 persona,
                 hours: Math.round((hours as number) * 10) / 10
             });
         }
      });
    });
  }
  
  // Calculate Pulse Stats
  // Filter entries for stats calculation if a specific persona is selected
  const statsEntries = pulsePersona === 'All' 
     ? pulseEntries 
     : pulseEntries.filter(e => {
         const shortName = PERSONA_SHORT_NAMES[e.prioritisedPersona] || e.prioritisedPersona;
         return shortName === pulsePersona;
     });

  const pulseHours = statsEntries.reduce((sum, e) => (e.prioritisedPersona !== SLEEP_PERSONA ? sum + e.hours : sum), 0);
  const pulsePeriods = pulseSummaries.length || 1;
  const pulseAvg = pulseHours / pulsePeriods;

  // Pie chart data - with percentage, hours, and explicit color
  const pieData = personaSummaries.map((p) => ({
    type: PERSONA_SHORT_NAMES[p.persona] || p.persona,
    value: p.totalHours,  // Use raw value for accurate pie proportions
    percentage: p.percentageOfTotal,
    fullName: p.persona,
    color: PERSONA_COLORS[p.persona] || '#888',
  }));

  // Extract color palette for scale configuration
  const pieColorPalette = pieData.map(p => p.color);

  // Monthly bar chart data
  const monthlyBarData = monthlyTrends.map((m) => ({
    month: m.monthName,
    hours: Math.round(m.hours),
  }));

  // Top 3 personas (excluding sleep)
  const top3 = personaSummaries.slice(0, 3);
  const entryCount = entriesExcludingSleep.length;

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

  // Calculate divisor for average
  let averageDivisor = 365;
  if (isAllTime) {
    averageDivisor = totalDaysAllTime;
  } else if (isCurrentYear) {
    // For current year, use fractional days elapsed for accurate run rate
    // e.g. Jan 3rd 12pm = 2.5 days, not 3 days
    const hoursElapsed = dayjs().diff(dayjs().startOf('year'), 'hour', true);
    // Ensure we don't divide by zero at the very start of the year
    averageDivisor = Math.max(0.1, hoursElapsed / 24);
  } else {
     // For past years check for leap year
     averageDivisor = dayjs(`${selectedYear}-01-01`).isLeapYear() ? 366 : 365;
  }

  // Title shows year or "All Time"
  const titleSuffix = isAllTime ? 'All Time' : selectedYear.toString();

  return (
    <PageContainer
      header={{
        title: (
          <span style={{ fontSize: 24, fontWeight: 600, color: '#333' }}>
            Overview {isAllTime && <Tag color="#0D7377" icon={<GlobalOutlined />}>All Time</Tag>}
          </span>
        ),
      }}
    >
      {/* Sparse Data Indicator */}
      {totalHours > 0 && totalHours < 10 && (
        <Alert
          message="Limited data for this period"
          description={`Only ${formatHours(totalHours)} hrs logged so far. Charts will become more representative as more data is added.`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* KPI Summary Row */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={{ ...CARD_STYLE, height: 120 }}>
            <Statistic
              title={<Text strong>Total Hours</Text>}
              value={formatHours(totalHours)}
              suffix="hrs"
              valueStyle={{ color: '#0D7377', fontSize: 28, fontWeight: 600 }}
              prefix={<ClockCircleOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>(excl. sleep)</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={{ ...CARD_STYLE, height: 120 }}>
          <div style={{ marginBottom: 6 }}>
              <Text strong style={{ fontSize: 14, color: '#333' }}>Top 3 Personas</Text>
              <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>(excl. sleep)</Text>
            </div>
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              {top3.map((p, i) => (
                <div key={p.persona} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Space size={4}>
                    <TrophyOutlined style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32', fontSize: 12 }} />
                    <Tag color={PERSONA_COLORS[p.persona]} style={{ margin: 0, fontSize: 11, padding: '0 4px' }}>
                      {PERSONA_SHORT_NAMES[p.persona]}
                    </Tag>
                  </Space>
                  <Space size={8}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{formatHours(p.totalHours)}h</Text>
                    <Text strong style={{ fontSize: 11 }}>{p.percentageOfTotal}%</Text>
                  </Space>
                </div>
              ))}
            </Space>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={{ ...CARD_STYLE, height: 120 }}>
            <Statistic
              title={<Text strong>Time Entries</Text>}
              value={entryCount.toLocaleString()}
              valueStyle={{ color: '#333', fontSize: 28, fontWeight: 600 }}
              prefix={<CalendarOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>(excl. sleep)</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={{ ...CARD_STYLE, height: 120 }}>
            <Statistic
              title={<Text strong>Avg. Hours/Day</Text>}
              value={(totalHours / averageDivisor).toFixed(1)}
              suffix="hrs"
              valueStyle={{ color: '#333', fontSize: 28, fontWeight: 600 }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              (excl. sleep) • With sleep: {(totalHoursWithSleep / averageDivisor).toFixed(1)}h/day
            </Text>
          </ProCard>
        </Col>
      </Row>

      {/* CURRENT PULSE SECTION - Only for Current Year */}
      {isCurrentYear && (
        <React.Fragment>
          <Divider style={{ margin: '12px 0 8px 0' }}>
            <Space>
              <FireOutlined style={{ color: '#fa541c' }} />
              <Text strong style={{ fontSize: 16 }}>Current Pulse</Text>
              <Space split={<Divider type="vertical" />}>
                <Select
                  value={pulseGranularity}
                  onChange={(val) => setPulseGranularity(val)}
                  size="small"
                  style={{ width: 100 }}
                  options={[
                     { label: 'Daily', value: 'day' },
                     { label: 'Weekly', value: 'week' },
                     { label: 'Monthly', value: 'month' },
                  ]}
                />
                <Select
                  value={pulsePersona}
                  onChange={(val) => setPulsePersona(val)}
                  size="small"
                  style={{ width: 140 }}
                  options={personaOptions}
                />
              </Space>
            </Space>
          </Divider>
          
          <ProCard
            style={{ ...CARD_STYLE, marginBottom: 16, background: '#fff' }}
            title={
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {pulseGranularity === 'day' ? 'Last 30 Days' : 'Current Year Breakdown'}
                    {pulsePersona !== 'All' && ` • ${PERSONA_SHORT_NAMES[pulsePersona] || pulsePersona}`}
                </Text>
            }
            extra={<Text strong>{formatHours(pulseAvg)}h / {pulseGranularity} avg</Text>}
            bodyStyle={{ padding: '16px 24px 8px' }}
          >
            <Column
              data={pulseData}
              xField="date"
              yField="hours"
              seriesField="persona"
              isStack={true}
              height={180}
              colorField="persona" // CRITICAL: Required for correct coloring in grouped/stacked charts
              color={(datum: any) => {
                 // Inspect input (string or object)
                 let pName = '';
                 if (typeof datum === 'string') {
                   pName = datum;
                 } else if (datum && datum.persona) {
                   pName = datum.persona;
                 }
                 
                 const fullPersona = Object.keys(PERSONA_SHORT_NAMES).find(key => PERSONA_SHORT_NAMES[key] === pName) || pName;
                 return PERSONA_COLORS[fullPersona] || PERSONA_COLORS[pName] || '#888';
              }}
              columnWidthRatio={0.6}
              xAxis={{
                label: { autoRotate: false, style: { fontSize: 10 } },
              }}
              yAxis={{
                grid: { line: { style: { stroke: '#f0f0f0', lineDash: [2, 2] } } },
              }}
              legend={{
                position: 'top-left',
                itemName: { style: { fontSize: 11 } },
                marker: { symbol: 'circle' }
              }}
              tooltip={{
                // G2 v5 API Standard
                title: (datum: any) => datum.date,
                items: [
                  (datum: any) => ({
                    name: datum.persona,
                    value: `${datum.hours}h`,
                  })
                ]
              }}
            />
          </ProCard>
        </React.Fragment>
      )}

      {/* Charts Row */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        {/* Persona Pie Chart - SPIDER LABELS with % and hours visible */}
        <Col xs={24} lg={10}>
          <ProCard
            title={
              <span>
                <Title level={5} style={{ margin: 0, display: 'inline' }}>Time Distribution</Title>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>(excl. sleep)</Text>
              </span>
            }
            style={{ ...CARD_STYLE, height: 360 }}
          >
            <Row gutter={16}>
              {/* Pie Chart */}
              <Col span={12}>
                <Pie
                  data={pieData}
                  angleField="value"
                  colorField="type"
                  radius={0.9}
                  innerRadius={0}
                  height={260}
                  scale={{ color: { range: pieColorPalette } }}
                  label={false}
                  legend={false}
                  statistic={false}
                  interactions={[{ type: 'element-active' }]}
                  tooltip={{
                    title: (datum: any) => datum.type,
                    items: [
                      (datum: any) => ({
                        name: datum.type,
                        value: `${formatHours(datum.value)} hrs (${datum.percentage}%)`,
                      }),
                    ],
                  }}
                />
              </Col>
              {/* Custom Legend Table */}
              <Col span={12}>
                <div style={{ paddingTop: 10 }}>
                  {pieData.map((item) => {
                    return (
                      <div 
                        key={item.type} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '4px 0',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <Space size={8}>
                          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: item.color }} />
                          <Text style={{ fontSize: 12 }}>{item.type}</Text>
                        </Space>
                        <Space size={8}>
                          <Text strong style={{ fontSize: 12, minWidth: 36, textAlign: 'right' }}>{item.percentage}%</Text>
                          <Text type="secondary" style={{ fontSize: 11, minWidth: 40, textAlign: 'right' }}>{formatHours(item.value)}h</Text>
                        </Space>
                      </div>
                    );
                  })}
                </div>
              </Col>
            </Row>
          </ProCard>
        </Col>

        {/* Monthly Hours Bar Chart - IMPROVED FONT */}
        <Col xs={24} lg={14}>
          <ProCard
            title={
              <span>
                <Title level={5} style={{ margin: 0, display: 'inline' }}>Monthly Hours ({selectedYear})</Title>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>(excl. sleep)</Text>
              </span>
            }
            style={{ ...CARD_STYLE, height: 360 }}
          >
            <Column
              data={monthlyBarData}
              xField="month"
              yField="hours"
              height={260}
              color={isAllTime ? '#0D7377' : (YEAR_COLORS[selectedYear as number] || '#0D7377')}
              columnWidthRatio={0.6}
              label={isAllTime ? false : {
                position: 'top',
                content: ({ hours }: { hours: number }) => `${hours}`,
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
                formatter: (datum: { hours: number }) => ({ name: 'Hours', value: `${datum.hours} hrs` }),
              }}
            />
          </ProCard>
        </Col>
      </Row>

      {/* Wheel of Life + YoY Comparison Row */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        {/* Wheel of Life - Radar Chart - Always shown, adapts for All Time */}
        <Col xs={24} lg={isAllTime ? 24 : 12}>
          <ProCard
            title={
              <span>
                <Title level={5} style={{ margin: 0, display: 'inline' }}>
                  Wheel of Life {isAllTime ? '(Last 5 Years)' : ''}
                </Title>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>(excl. sleep)</Text>
              </span>
            }
            style={{ ...CARD_STYLE, height: 380 }}
          >
            {(() => {
              const radarData: { persona: string; score: number; year: string }[] = [];
              
              // Get all unique personas (excluding sleep) for complete radar circle
              const allPersonaNames = Object.keys(PERSONA_SHORT_NAMES).filter(p => p !== SLEEP_PERSONA);
              
              if (isAllTime) {
                // All Time: Show each year as a separate series
                allYears.slice(0, 5).forEach((year) => { // Limit to 5 most recent years
                  const yearEntriesForRadar = filterByYear(entries, year).filter(e => e.prioritisedPersona !== SLEEP_PERSONA);
                  const summaries = groupByPersona(yearEntriesForRadar);
                  const summaryMap = new Map(summaries.map(s => [s.persona, s.percentageOfTotal]));
                  
                  // Ensure all personas are represented for a complete circle
                  allPersonaNames.forEach((persona) => {
                    const shortName = PERSONA_SHORT_NAMES[persona] || persona;
                    radarData.push({
                      persona: shortName,
                      score: summaryMap.get(persona) || 0,
                      year: year.toString(),
                    });
                  });
                });
              } else {
                // Specific year: Show current vs previous year
                const prevYearEntries = filterByYear(entries, (selectedYear as number) - 1).filter(e => e.prioritisedPersona !== SLEEP_PERSONA);
                
                // Current year data with all personas
                const currentMap = new Map(personaSummaries.map(s => [s.persona, s.percentageOfTotal]));
                allPersonaNames.forEach((persona) => {
                  const shortName = PERSONA_SHORT_NAMES[persona] || persona;
                  radarData.push({
                    persona: shortName,
                    score: currentMap.get(persona) || 0,
                    year: (selectedYear as number).toString(),
                  });
                });
                
                // Previous year data with all personas
                const prevSummaries = groupByPersona(prevYearEntries);
                const prevMap = new Map(prevSummaries.map(s => [s.persona, s.percentageOfTotal]));
                allPersonaNames.forEach((persona) => {
                  const shortName = PERSONA_SHORT_NAMES[persona] || persona;
                  radarData.push({
                    persona: shortName,
                    score: prevMap.get(persona) || 0,
                    year: ((selectedYear as number) - 1).toString(),
                  });
                });
              }

              // Generate colors based on years in data
              const uniqueYears = [...new Set(radarData.map(d => d.year))].sort();
              const yearColorMap: Record<string, string> = {};
              const colorScale = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];
              uniqueYears.forEach((year, idx) => {
                yearColorMap[year] = YEAR_COLORS[parseInt(year)] || colorScale[idx % colorScale.length];
              });

              return (
                <Radar
                  key={`radar-${isAllTime ? 'all' : selectedYear}-${uniqueYears.join('-')}`}
                  data={radarData}
                  xField="persona"
                  yField="score"
                  seriesField="year"
                  colorField="year"
                  height={300}
                  meta={{
                    score: {
                      min: 0,
                      max: Math.max(...radarData.map(d => d.score)) + 10,
                    },
                  }}
                  xAxis={{
                    line: null,
                    tickLine: null,
                    label: { style: { fontSize: 11, fontWeight: 500 } },
                  }}
                  yAxis={{
                    label: false,
                    grid: { alternateColor: ['rgba(0, 0, 0, 0.02)', 'rgba(0, 0, 0, 0.04)'] },
                  }}
                  area={{
                    smooth: true,
                    style: { fillOpacity: 0.25 },
                  }}
                  line={{ size: 2 }}
                  point={{ size: 3 }}
                  color={({ year }: { year: string }) => yearColorMap[year] || '#888'}
                  legend={{
                    position: 'bottom',
                    itemName: { style: { fontSize: 11 } },
                  }}
                  tooltip={{
                    formatter: (datum: { persona: string; score: number; year: string }) => ({
                      name: datum.year,
                      value: `${datum.score.toFixed(1)}%`,
                    }),
                  }}
                />
              );
            })()}
          </ProCard>
        </Col>

        {/* YoY Comparison Grid - Only for specific year */}
        {!isAllTime && (
          <Col xs={24} lg={12}>
            <ProCard
              title={
                <span>
                  <Title level={5} style={{ margin: 0, display: 'inline' }}>
                    YoY Comparison ({selectedYear} vs {(selectedYear as number) - 1})
                  </Title>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>(excl. sleep)</Text>
                </span>
              }
              style={{ ...CARD_STYLE, height: 380 }}
              bodyStyle={{ overflow: 'auto' }}
            >
              <Row gutter={[12, 12]}>
                {yoyComparison.map((item) => (
                  <Col key={item.persona} xs={12} sm={8}>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 6,
                        background: '#fafafa',
                        borderLeft: `3px solid ${PERSONA_COLORS[item.persona]}`,
                      }}
                    >
                      <Text strong style={{ color: PERSONA_COLORS[item.persona], fontSize: 12 }}>
                        {PERSONA_SHORT_NAMES[item.persona]}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text style={{ fontSize: 16, fontWeight: 600 }}>
                          {formatHours(item.currentYearHours)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}> hrs</Text>
                      </div>
                      <div style={{ marginTop: 2 }}>
                        {item.deltaHours >= 0 ? (
                          <Text style={{ color: STATUS_COLORS.success, fontSize: 11 }}>
                            <RiseOutlined /> +{formatHours(item.deltaHours)} ({item.percentageChange > 0 ? '+' : ''}{item.percentageChange}%)
                          </Text>
                        ) : (
                          <Text style={{ color: STATUS_COLORS.error, fontSize: 11 }}>
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
        )}
      </Row>
    </PageContainer>
  );
};

export default PersonametryDashboard;
