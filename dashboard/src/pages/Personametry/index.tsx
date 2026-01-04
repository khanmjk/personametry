/**
 * Personametry Dashboard - Executive Overview
 * --------------------------------------------
 * Unified dashboard combining Overview and Trends logic.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Statistic, Select, Spin, Alert, Typography, Divider, Tag, Space, Switch } from 'antd';
import { Column, Pie, Radar } from '@ant-design/charts';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  TrophyOutlined,
  GlobalOutlined,
  FireOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import isLeapYear from 'dayjs/plugin/isLeapYear';

dayjs.extend(dayOfYear);
dayjs.extend(isLeapYear);
import type { TimeEntry, DataMetadata } from '@/models/personametry';
import { 
  PERSONA_COLORS, 
  PERSONA_SHORT_NAMES, 
  YEAR_COLORS, 
  STATUS_COLORS,
  META_WORK_LIFE_COLORS,
  MetaWorkLife
} from '@/models/personametry';
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
  filterByMetaWorkLife
} from '@/services/personametryService';
import YearlyStackedBar from '@/components/charts/YearlyStackedBar';

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
  const [showSleep, setShowSleep] = useState<boolean>(false);
  
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
  
  // Apply Sleep Toggle Filter
  const displayedEntries = showSleep 
    ? yearEntries 
    : yearEntries.filter(e => e.prioritisedPersona !== SLEEP_PERSONA);
  
  // Calculate metrics based on DISPLAYED entries
  const personaSummaries = groupByPersona(displayedEntries);
  const monthlyTrends = groupByMonth(displayedEntries);
  const totalHours = sumHours(displayedEntries);
  
  // Calculate total hours WITH sleep for comparison (always needed for some context)
  const totalHoursWithSleep = sumHours(yearEntries);

  // YoY comparison logic (respecting toggle)
  const yoyComparison = isAllTime ? [] : calculateYoYComparison(entries, selectedYear as number, (selectedYear as number) - 1)
    .filter(item => showSleep || item.persona !== SLEEP_PERSONA);

  // ==========================================
  // CURRENT PULSE LOGIC (Last 30 Days)
  // ==========================================
  const currentYear = new Date().getFullYear();
  const isCurrentYear = !isAllTime && selectedYear === currentYear;
  
  // Pulse configuration
  const [pulseGranularity, setPulseGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [pulsePersona, setPulsePersona] = useState<string>('All');
  
  // Update Pulse Options based on showSleep
  const personaOptions = [
    { label: 'All Personas', value: 'All' },
    ...Object.keys(PERSONA_SHORT_NAMES)
      .filter(p => showSleep || p !== SLEEP_PERSONA)
      .map(p => {
        const shortName = PERSONA_SHORT_NAMES[p] || p;
        return { label: shortName, value: shortName };
      })
  ];

  // Data for Pulse Chart
  const pulseEntries = isCurrentYear 
    ? (pulseGranularity === 'day' ? getLastNDays(entries, 30) : filterByYear(entries, currentYear))
    : [];

  const pulseSummaries = isCurrentYear ? groupEntriesByPeriod(pulseEntries, pulseGranularity) : [];
  
  const pulseData: { date: string; persona: string; hours: number; rawDate: string }[] = [];
  if (isCurrentYear) {
    pulseSummaries.forEach((period: any) => {
      Object.entries(period.byPersona).forEach(([persona, hours]) => {
         // Respect "Show Sleep" toggle
         if (!showSleep && (persona === 'Sleep' || persona === SLEEP_PERSONA)) return;

         // Apply Persona Filter
         if (pulsePersona !== 'All' && persona !== pulsePersona) return;

         const displayDate = pulseGranularity === 'day' 
            ? dayjs(period.date).format('MMM D') 
            : period.date;
            
         pulseData.push({
             date: displayDate, 
             rawDate: period.date,
             persona,
             hours: Math.round((hours as number) * 10) / 10
         });
      });
    });
  }
  
  // Pulse Stats
  const statsEntries = pulsePersona === 'All' 
     ? pulseEntries 
     : pulseEntries.filter(e => {
         const shortName = PERSONA_SHORT_NAMES[e.prioritisedPersona] || e.prioritisedPersona;
         return shortName === pulsePersona;
     });

  const pulseHours = statsEntries.reduce((sum, e) => {
      if (!showSleep && e.prioritisedPersona === SLEEP_PERSONA) return sum;
      return sum + e.hours;
  }, 0);
  
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

  // WORK-LIFE PIE DATA (Replacing Persona Pie)
  // Calculated from displayedEntries (so automatically handles sleep toggle)
  const workHours = sumHours(filterByMetaWorkLife(displayedEntries, MetaWorkLife.WORK));
  const lifeHours = sumHours(filterByMetaWorkLife(displayedEntries, MetaWorkLife.LIFE));
  const sleepHours = sumHours(filterByMetaWorkLife(displayedEntries, MetaWorkLife.SLEEP_LIFE));
  
  const workLifeData = [
    { type: 'Work', value: Math.round(workHours), color: META_WORK_LIFE_COLORS[MetaWorkLife.WORK] },
    { type: 'Life', value: Math.round(lifeHours), color: META_WORK_LIFE_COLORS[MetaWorkLife.LIFE] },
    ...(showSleep ? [{ type: 'Sleep', value: Math.round(sleepHours), color: META_WORK_LIFE_COLORS[MetaWorkLife.SLEEP_LIFE] }] : [])
  ];

  // Monthly Stacked Bar Data
  const monthlyStackedData: { month: string; persona: string; hours: number; monthNum: number }[] = [];
  const monthMap = new Map<string, Map<string, number>>();

  // Initialize map with all months to ensure correct sorting/display even if empty
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  months.forEach((m, idx) => {
    monthMap.set(m, new Map());
  });

  displayedEntries.forEach(entry => {
    const monthName = months[entry.month - 1]; // entry.month is 1-based
    if (monthName) {
      const pName = PERSONA_SHORT_NAMES[entry.prioritisedPersona] || entry.prioritisedPersona;
      const currentMap = monthMap.get(monthName)!;
      currentMap.set(pName, (currentMap.get(pName) || 0) + entry.hours);
    }
  });

  // Flatten map to array
  months.forEach((month, idx) => {
    const pMap = monthMap.get(month)!;
    if (pMap.size > 0) {
       pMap.forEach((hours, persona) => {
          monthlyStackedData.push({
            month,
            persona,
            hours: Math.round(hours),
            monthNum: idx + 1
          });
       });
    }
  });

  // Top 3 personas
  const top3 = personaSummaries.slice(0, 3);
  const entryCount = displayedEntries.length;

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
    const hoursElapsed = dayjs().diff(dayjs().startOf('year'), 'hour', true);
    averageDivisor = Math.max(0.1, hoursElapsed / 24);
  } else {
     averageDivisor = dayjs(`${selectedYear}-01-01`).isLeapYear() ? 366 : 365;
  }

  const sleepLabel = showSleep ? '(incl. sleep)' : '(excl. sleep)';

  return (
    <PageContainer
      header={{
        title: (
          <span style={{ fontSize: 24, fontWeight: 600, color: '#333' }}>
            Overview {isAllTime && <Tag color="#0D7377" icon={<GlobalOutlined />}>All Time</Tag>}
          </span>
        ),
        extra: [
           <Switch 
              key="sleep-toggle"
              checkedChildren="Sleep On" 
              unCheckedChildren="Sleep Off" 
              checked={showSleep}
              onChange={setShowSleep}
           />
        ]
      }}
    >
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
            <Text type="secondary" style={{ fontSize: 11 }}>{sleepLabel}</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={{ ...CARD_STYLE, height: 120 }}>
          <div style={{ marginBottom: 6 }}>
              <Text strong style={{ fontSize: 14, color: '#333' }}>Top 3 Personas</Text>
              <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>{sleepLabel}</Text>
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
            <Text type="secondary" style={{ fontSize: 11 }}>{sleepLabel}</Text>
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
              {sleepLabel}
            </Text>
          </ProCard>
        </Col>
      </Row>

      {/* CURRENT PULSE SECTION */}
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
              colorField="persona"
              color={(datum: any) => {
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
              xAxis={{ label: { autoRotate: false, style: { fontSize: 10 } } }}
              yAxis={{ grid: { line: { style: { stroke: '#f0f0f0', lineDash: [2, 2] } } } }}
              legend={{ position: 'top-left', itemName: { style: { fontSize: 11 } }, marker: { symbol: 'circle' } }}
              tooltip={{
                title: (datum: any) => datum.date,
                items: [ (datum: any) => ({ name: datum.persona, value: `${datum.hours}h` }) ]
              }}
            />
          </ProCard>
        </React.Fragment>
      )}

      {/* Row 3: Pie Charts (Work-Life + Time Distribution) */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        {/* Work-Life Balance Pie */}
        <Col xs={24} lg={12}>
          <ProCard
            title={
              <span>
                <Title level={5} style={{ margin: 0, display: 'inline' }}>Work-Life Balance</Title>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{sleepLabel}</Text>
              </span>
            }
            style={{ ...CARD_STYLE, height: 380 }}
          >
             <Row gutter={16} align="middle" style={{ height: '100%' }}>
              <Col span={12}>
                <Pie
                  data={workLifeData}
                  angleField="value"
                  colorField="type"
                  radius={0.9}
                  innerRadius={0}
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
                    const percentage = totalHours > 0 || (showSleep && totalHoursWithSleep > 0)
                        ? Math.round((item.value / sumHours(displayedEntries)) * 100) 
                        : 0;
                    return (
                      <div 
                        key={item.type} 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
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

        {/* Time Distribution Pie (Restored) */}
        <Col xs={24} lg={12}>
          <ProCard
            title={
              <span>
                <Title level={5} style={{ margin: 0, display: 'inline' }}>Time Distribution</Title>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{sleepLabel}</Text>
              </span>
            }
            style={{ ...CARD_STYLE, height: 380 }}
          >
            <Row gutter={16} align="middle" style={{ height: '100%' }}>
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
      </Row>

      {/* Row 4: Analysis (Wheel of Life + YoY Comparison) */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        {/* Wheel of Life - Radar Chart */}
        <Col xs={24} lg={isAllTime ? 24 : 12}>
          <ProCard
            title={
              <span>
                <Title level={5} style={{ margin: 0, display: 'inline' }}>
                  Wheel of Life {isAllTime ? '(Last 5 Years)' : ''}
                </Title>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>{sleepLabel}</Text>
              </span>
            }
            style={{ ...CARD_STYLE, height: 380 }}
          >
            {(() => {
              const radarData: { persona: string; score: number; year: string }[] = [];
              const allPersonaNames = Object.keys(PERSONA_SHORT_NAMES).filter(p => showSleep || p !== SLEEP_PERSONA);
              
              if (isAllTime) {
                allYears.slice(0, 5).forEach((year) => {
                  const yearEntriesForRadar = filterByYear(entries, year).filter(e => showSleep || e.prioritisedPersona !== SLEEP_PERSONA);
                  const summaries = groupByPersona(yearEntriesForRadar);
                  const summaryMap = new Map(summaries.map(s => [s.persona, s.percentageOfTotal]));
                  
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
                const prevYearEntries = filterByYear(entries, (selectedYear as number) - 1).filter(e => showSleep || e.prioritisedPersona !== SLEEP_PERSONA);
                
                const currentMap = new Map(personaSummaries.map(s => [s.persona, s.percentageOfTotal]));
                allPersonaNames.forEach((persona) => {
                  const shortName = PERSONA_SHORT_NAMES[persona] || persona;
                  radarData.push({
                    persona: shortName,
                    score: currentMap.get(persona) || 0,
                    year: (selectedYear as number).toString(),
                  });
                });
                
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

              const uniqueYears = [...new Set(radarData.map(d => d.year))].sort();
              const yearColorMap: Record<string, string> = {};
              const colorScale = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];
              uniqueYears.forEach((year, idx) => {
                yearColorMap[year] = YEAR_COLORS[parseInt(year)] || colorScale[idx % colorScale.length];
              });

              return (
                <Radar
                  key={`radar-${isAllTime ? 'all' : selectedYear}-${uniqueYears.join('-')}-${showSleep}`}
                  data={radarData}
                  xField="persona"
                  yField="score"
                  seriesField="year"
                  colorField="year"
                  height={300}
                  meta={{ score: { min: 0, max: Math.max(...radarData.map(d => d.score)) + 10 } }}
                  xAxis={{ line: null, tickLine: null, label: { style: { fontSize: 11, fontWeight: 500 } } }}
                  yAxis={{ label: false, grid: { alternateColor: ['rgba(0, 0, 0, 0.02)', 'rgba(0, 0, 0, 0.04)'] } }}
                  area={{ smooth: true, style: { fillOpacity: 0.25 } }}
                  line={{ size: 2 }}
                  point={{ size: 3 }}
                  color={({ year }: { year: string }) => yearColorMap[year] || '#888'}
                  legend={{ position: 'bottom', itemName: { style: { fontSize: 11 } } }}
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

        {/* YoY Comparison Grid (Restored) - Only for specific year */}
        {!isAllTime && (
          <Col xs={24} lg={12}>
            <ProCard
              title={
                <span>
                  <Title level={5} style={{ margin: 0, display: 'inline' }}>
                    YoY Comparison ({selectedYear} vs {(selectedYear as number) - 1})
                  </Title>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>{sleepLabel}</Text>
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

      {/* Row 5: Detailed Trends (Yearly or Monthly) */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          {isAllTime ? (
             <YearlyStackedBar 
                entries={displayedEntries} 
                title={`Total Hours by Year & Persona ${sleepLabel}`}
                height={420} 
                variant="grouped" 
              />
          ) : (
            <ProCard
              title={
                <span>
                  <Title level={5} style={{ margin: 0, display: 'inline' }}>Monthly Hours ({selectedYear})</Title>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>{sleepLabel}</Text>
                </span>
              }
              style={{ ...CARD_STYLE, height: 360 }}
            >
              {(() => {
                const config = {
                  data: monthlyStackedData,
                  xField: 'month',
                  yField: 'hours',
                  seriesField: 'persona',
                  isStack: true,
                  isGroup: false,
                  height: 260,
                  colorField: 'persona',
                  color: (datum: any) => {
                     // G2Plot v2: first arg is series value (string) if seriesField is set
                     const pName = typeof datum === 'string' ? datum : datum?.persona;
                     if (!pName) return '#888';
                     
                     // Reverse lookup Short Name -> Full Name -> Color
                     const fullPersona = Object.keys(PERSONA_SHORT_NAMES).find(key => PERSONA_SHORT_NAMES[key] === pName) || pName;
                     return PERSONA_COLORS[fullPersona] || PERSONA_COLORS[pName] || '#888';
                  },
                  columnWidthRatio: 0.6,
                  legend: { 
                    position: 'top-left' as const, 
                    itemSpacing: 4, 
                    itemName: { style: { fontSize: 11 } }, 
                    marker: { symbol: 'circle' } 
                  },
                  xAxis: { label: { style: { fontSize: 12, fontWeight: 500 } } },
                  yAxis: { title: { text: 'Hours', style: { fontSize: 12 } }, grid: { line: { style: { stroke: '#f0f0f0' } } } },
                  tooltip: {
                    title: (datum: any) => datum.month,
                    items: [ (datum: any) => ({ name: datum.persona, value: `${datum.hours} hrs` }) ]
                  }
                };
                return <Column {...config} />;
              })()}
            </ProCard>
          )}
        </Col>
      </Row>

    </PageContainer>
  );
};

export default PersonametryDashboard;
