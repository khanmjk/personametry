/**
 * Data Nerds Playground
 * ---------------------
 * Interactive data exploration with Key Stats, Chart Builder, and ProTable.
 * Enhanced with QueryFilter, Compare Mode, and ProTable Summary.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { PageContainer, ProCard, ProTable, QueryFilter, ProFormSelect, ProFormDateRangePicker } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Statistic, Typography, Switch, Select, Radio, Space, Divider, Tag, Tooltip } from 'antd';
import { Column, Line, Pie } from '@ant-design/charts';
import {
  ExperimentOutlined,
  DatabaseOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  SwapOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { TimeEntry } from '@/models/personametry';
import { PERSONA_SHORT_NAMES, PERSONA_COLORS, YEAR_COLORS } from '@/models/personametry';
import {
  loadTimeEntries,
  getAvailableYears,
  getDataSource,
  sumHours,
  filterByYear,
  groupByPersona,
  groupByMonth,
  formatHours,
} from '@/services/personametryService';
import type { ProColumns } from '@ant-design/pro-components';

const { Title, Text } = Typography;

const CARD_STYLE = {
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

// ============================================
// TYPES
// ============================================

interface PlaygroundStats {
  totalEntries: number;
  totalHours: number;
  dateRange: { start: string; end: string };
  uniqueDays: number;
  longestDay: { date: string; hours: number };
  longestStreak: number;
  busiestMonth: { month: string; hours: number };
  mostSleepMonth: { month: string; hours: number };
}

type ChartType = 'bar' | 'line' | 'pie';
type GroupByOption = 'year' | 'month' | 'persona' | 'dayOfWeek';

// ============================================
// STATS CALCULATION
// ============================================

function calculatePlaygroundStats(entries: TimeEntry[]): PlaygroundStats {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      totalHours: 0,
      dateRange: { start: 'N/A', end: 'N/A' },
      uniqueDays: 0,
      longestDay: { date: 'N/A', hours: 0 },
      longestStreak: 0,
      busiestMonth: { month: 'N/A', hours: 0 },
      mostSleepMonth: { month: 'N/A', hours: 0 },
    };
  }

  const totalEntries = entries.length;
  const totalHours = sumHours(entries);
  
  const dates = entries.map(e => e.date).sort();
  const dateRange = { start: dates[0], end: dates[dates.length - 1] };
  const uniqueDays = new Set(entries.map(e => e.date)).size;
  
  // Longest single day
  const dailyHours = new Map<string, number>();
  for (const entry of entries) {
    dailyHours.set(entry.date, (dailyHours.get(entry.date) || 0) + entry.hours);
  }
  let longestDay = { date: '', hours: 0 };
  for (const [date, hours] of dailyHours) {
    if (hours > longestDay.hours) longestDay = { date, hours };
  }
  
  // Longest streak
  const sortedDates = [...new Set(entries.map(e => e.date))].sort();
  let maxStreak = 1, currentStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / 86400000;
    if (diff === 1) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else currentStreak = 1;
  }
  
  // Busiest month
  const monthlyHours = new Map<string, number>();
  for (const entry of entries) {
    const key = `${entry.year}-${entry.month.toString().padStart(2, '0')}`;
    monthlyHours.set(key, (monthlyHours.get(key) || 0) + entry.hours);
  }
  let busiestMonth = { month: '', hours: 0 };
  for (const [month, hours] of monthlyHours) {
    if (hours > busiestMonth.hours) busiestMonth = { month, hours };
  }
  
  // Most sleep month
  const sleepEntries = entries.filter(e => e.prioritisedPersona === 'P0 Life Constraints (Sleep)');
  const sleepMonthly = new Map<string, number>();
  for (const entry of sleepEntries) {
    const key = `${entry.year}-${entry.month.toString().padStart(2, '0')}`;
    sleepMonthly.set(key, (sleepMonthly.get(key) || 0) + entry.hours);
  }
  let mostSleepMonth = { month: 'N/A', hours: 0 };
  for (const [month, hours] of sleepMonthly) {
    if (hours > mostSleepMonth.hours) mostSleepMonth = { month, hours };
  }
  
  return { totalEntries, totalHours, dateRange, uniqueDays, longestDay, longestStreak: maxStreak, busiestMonth, mostSleepMonth };
}

// ============================================
// PROTABLE COLUMNS (Privacy-Safe)
// ============================================

const safeColumns: ProColumns<TimeEntry>[] = [
  { title: 'Date', dataIndex: 'date', sorter: true, width: 100 },
  { title: 'Year', dataIndex: 'year', sorter: true, width: 70, filters: true },
  { title: 'Month', dataIndex: 'monthName', width: 60, filters: true },
  { title: 'Day', dataIndex: 'dayOfWeek', width: 100, filters: true, 
    render: (text: any) => typeof text === 'string' ? text.replace(/_\d\d\s/, '') : text },
  { title: 'Persona', dataIndex: 'prioritisedPersona', width: 120, filters: true,
    render: (text: any) => (
      <Tag color={PERSONA_COLORS[text as string] || '#999'}>
        {PERSONA_SHORT_NAMES[text as string] || text}
      </Tag>
    ) },
  { title: 'Category', dataIndex: 'personaTier2', width: 100, filters: true },
  { title: 'Task', dataIndex: 'normalisedTask', width: 200, ellipsis: true,
    render: (text: any) => typeof text === 'string' ? text.replace(/\[.*?\]\s*/, '') : text },
  { title: 'Work/Life', dataIndex: 'metaWorkLife', width: 80, filters: true },
  { title: 'Hours', dataIndex: 'hours', sorter: true, width: 70,
    render: (_, record) => record.hours.toFixed(2) },
];

// ============================================
// MAIN COMPONENT
// ============================================

const PlaygroundPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Filter state
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupByOption>('persona');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        setEntries(data.entries);
        const years = getAvailableYears(data.entries);
        setAvailableYears(years);
        setSelectedYears(years.slice(0, 3));
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const availablePersonas = useMemo(() => {
    return [...new Set(entries.map(e => e.prioritisedPersona))].sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (selectedYears.length > 0) result = result.filter(e => selectedYears.includes(e.year));
    if (selectedPersonas.length > 0) result = result.filter(e => selectedPersonas.includes(e.prioritisedPersona));
    return result;
  }, [entries, selectedYears, selectedPersonas]);

  const stats = useMemo(() => calculatePlaygroundStats(entries), [entries]);

  // Determine if Pie is allowed (only for categorical groupBy)
  const pieAllowed = groupBy === 'persona' || groupBy === 'dayOfWeek';

  // Standard chart data (single series)
  const standardChartData = useMemo(() => {
    if (filteredEntries.length === 0) return [];

    switch (groupBy) {
      case 'year': {
        const data = new Map<number, number>();
        for (const e of filteredEntries) data.set(e.year, (data.get(e.year) || 0) + e.hours);
        return [...data.entries()]
          .map(([year, hours]) => ({ category: year.toString(), hours: Math.round(hours), color: YEAR_COLORS[year] || '#888' }))
          .sort((a, b) => parseInt(a.category) - parseInt(b.category));
      }
      case 'month': {
        const monthData = groupByMonth(filteredEntries);
        return monthData.map(m => ({
          category: `${m.year}-${m.month.toString().padStart(2, '0')}`,
          hours: Math.round(m.hours),
          color: YEAR_COLORS[m.year] || '#888',
        }));
      }
      case 'persona': {
        const personaData = groupByPersona(filteredEntries);
        return personaData.map(p => ({
          category: PERSONA_SHORT_NAMES[p.persona] || p.persona,
          hours: Math.round(p.totalHours),
          color: PERSONA_COLORS[p.persona] || '#888',
        }));
      }
      case 'dayOfWeek': {
        const dowData = new Map<string, number>();
        for (const e of filteredEntries) {
          const day = e.dayOfWeek.replace(/_\d\d\s/, '');
          dowData.set(day, (dowData.get(day) || 0) + e.hours);
        }
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return dayOrder.filter(d => dowData.has(d)).map(day => ({ category: day, hours: Math.round(dowData.get(day) || 0), color: '#0D7377' }));
      }
      default: return [];
    }
  }, [filteredEntries, groupBy]);

  // Compare mode chart data (grouped by year)
  const compareChartData = useMemo(() => {
    if (!compareMode || selectedYears.length < 2) return [];
    
    // Group by persona within each year
    const data: { persona: string; year: string; hours: number }[] = [];
    for (const year of selectedYears) {
      const yearEntries = filteredEntries.filter(e => e.year === year);
      const byPersona = groupByPersona(yearEntries);
      for (const p of byPersona) {
        data.push({
          persona: PERSONA_SHORT_NAMES[p.persona] || p.persona,
          year: year.toString(),
          hours: Math.round(p.totalHours),
        });
      }
    }
    return data.sort((a, b) => a.persona.localeCompare(b.persona) || parseInt(a.year) - parseInt(b.year));
  }, [compareMode, selectedYears, filteredEntries]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>Loading playground data...</Text>
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

  // Render Compare Mode chart (grouped bars or multi-line)
  const renderCompareChart = () => {
    if (compareChartData.length === 0) {
      return <Alert message="Select 2+ years for comparison" type="info" showIcon />;
    }

    const yearPalette = selectedYears.sort().map(y => YEAR_COLORS[y] || '#888');

    if (chartType === 'line') {
      // Multi-line: each year is a separate line
      return (
        <Line
          data={compareChartData}
          xField="persona"
          yField="hours"
          seriesField="year"
          colorField="year"
          color={yearPalette}
          height={350}
          point={{ size: 5 }}
          tooltip={{
            title: (datum: any) => datum.persona,
            items: [(datum: any) => ({ name: datum.year, value: `${formatHours(datum.hours)} hrs` })],
          }}
          legend={{ position: 'top-left' }}
        />
      );
    }

    // Default: Grouped bar chart
    return (
      <Column
        data={compareChartData}
        xField="persona"
        yField="hours"
        seriesField="year"
        colorField="year"
        isGroup={true}
        color={yearPalette}
        height={350}
        columnWidthRatio={0.6}
        label={{ position: 'top' as const, style: { fontSize: 9 } }}
        tooltip={{
          title: (datum: any) => datum.persona,
          items: [(datum: any) => ({ name: datum.year, value: `${formatHours(datum.hours)} hrs` })],
        }}
        legend={{ position: 'top-left' }}
      />
    );
  };

  // Render standard chart
  const renderStandardChart = () => {
    if (standardChartData.length === 0) {
      return <Alert message="No data matches your filter criteria" type="info" showIcon />;
    }

    const commonConfig = { data: standardChartData, height: 350 };

    switch (chartType) {
      case 'bar':
        return (
          <Column
            {...commonConfig}
            xField="category"
            yField="hours"
            color={standardChartData.map(d => d.color)}
            label={{ position: 'top' as const, style: { fontSize: 10 } }}
            tooltip={{
              title: (datum: any) => datum.category,
              items: [(datum: any) => ({ name: 'Hours', value: `${formatHours(datum.hours)} hrs` })],
            }}
          />
        );
      case 'line':
        return (
          <Line
            {...commonConfig}
            xField="category"
            yField="hours"
            color="#0D7377"
            point={{ size: 5, shape: 'circle' }}
            tooltip={{
              title: (datum: any) => datum.category,
              items: [(datum: any) => ({ name: 'Hours', value: `${formatHours(datum.hours)} hrs` })],
            }}
          />
        );
      case 'pie':
        return (
          <Pie
            {...commonConfig}
            angleField="hours"
            colorField="category"
            radius={0.85}
            scale={{ color: { range: standardChartData.map(d => d.color) } }}
            label={{ type: 'outer', content: '{name}: {percentage}' }}
            legend={{ position: 'bottom' }}
            tooltip={{
              title: (datum: any) => datum.category,
              items: [(datum: any) => ({ name: datum.category, value: `${formatHours(datum.hours)} hrs` })],
            }}
          />
        );
    }
  };

  // Calculate summary for ProTable
  const totalFilteredHours = sumHours(filteredEntries);

  return (
    <PageContainer
      header={{
        title: (
          <span style={{ fontSize: 24, fontWeight: 600, color: '#333' }}>
            <ExperimentOutlined style={{ marginRight: 8, color: '#722ed1' }} />
            Data Nerds Playground
          </span>
        ),
        subTitle: 'Explore your data with custom filters and interactive charts',
      }}
    >
      {/* Section 1: Key Stats */}
      <ProCard title={<Title level={5} style={{ margin: 0 }}><DatabaseOutlined /> Key Statistics</Title>} style={CARD_STYLE}>
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6} lg={3}>
            <Statistic title="Total Entries" value={stats.totalEntries.toLocaleString()} prefix={<DatabaseOutlined />} />
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Statistic title="Total Hours" value={formatHours(stats.totalHours)} suffix="hrs" prefix={<ClockCircleOutlined />} />
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Statistic title="Date Range" value={`${stats.dateRange.start.slice(0, 4)} - ${stats.dateRange.end.slice(0, 4)}`} prefix={<CalendarOutlined />} />
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Statistic title="Days Tracked" value={stats.uniqueDays.toLocaleString()} />
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Statistic title="Longest Day" value={`${stats.longestDay.hours.toFixed(1)}h`} prefix={<FireOutlined />} />
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Statistic title="Longest Streak" value={`${stats.longestStreak} days`} prefix={<ThunderboltOutlined />} />
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Statistic title="Busiest Month" value={stats.busiestMonth.month} prefix={<TrophyOutlined />} />
          </Col>
          <Col xs={12} md={6} lg={3}>
            <Statistic title="Most Sleep" value={stats.mostSleepMonth.month} />
          </Col>
        </Row>
      </ProCard>

      {/* Section 2: Interactive Chart Builder with QueryFilter */}
      <ProCard 
        title={<Title level={5} style={{ margin: 0 }}>📊 Interactive Chart Builder</Title>} 
        style={{ ...CARD_STYLE, marginTop: 20 }}
        extra={
          <Space>
            <Tooltip title="Compare years side-by-side (select 2+ years)">
              <Switch 
                checkedChildren={<><SwapOutlined /> Compare</>}
                unCheckedChildren="Compare"
                checked={compareMode}
                onChange={setCompareMode}
                disabled={selectedYears.length < 2}
              />
            </Tooltip>
          </Space>
        }
      >
        {/* QueryFilter */}
        <QueryFilter
          onFinish={async (values) => {
            if (values.years) setSelectedYears(values.years);
            if (values.personas) setSelectedPersonas(values.personas);
            return true;
          }}
          onReset={() => {
            setSelectedYears(availableYears.slice(0, 3));
            setSelectedPersonas([]);
          }}
          style={{ marginBottom: 16 }}
        >
          <ProFormSelect
            name="years"
            label="Years"
            fieldProps={{
              mode: 'multiple',
              value: selectedYears,
              onChange: (vals) => setSelectedYears(vals as number[]),
            }}
            options={availableYears.map(y => ({ label: y.toString(), value: y }))}
            width="md"
          />
          <ProFormSelect
            name="personas"
            label="Personas"
            fieldProps={{
              mode: 'multiple',
              value: selectedPersonas,
              onChange: setSelectedPersonas,
            }}
            options={availablePersonas.map(p => ({ label: PERSONA_SHORT_NAMES[p] || p, value: p }))}
            width="md"
          />
        </QueryFilter>

        {/* Chart Controls */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <Text strong>Group By:</Text>
              <Select
                style={{ width: 140 }}
                value={groupBy}
                onChange={setGroupBy}
                disabled={compareMode}
                options={[
                  { label: 'Year', value: 'year' },
                  { label: 'Month', value: 'month' },
                  { label: 'Persona', value: 'persona' },
                  { label: 'Day of Week', value: 'dayOfWeek' },
                ]}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Text strong>Chart:</Text>
              <Radio.Group value={chartType} onChange={e => setChartType(e.target.value)}>
                <Radio.Button value="bar">Bar</Radio.Button>
                <Radio.Button value="line">Line</Radio.Button>
                <Radio.Button value="pie" disabled={!pieAllowed || compareMode}>
                  <Tooltip title={!pieAllowed ? "Pie only for Persona/Day grouping" : ""}>Pie</Tooltip>
                </Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
        </Row>

        {/* Dynamic Chart */}
        <div style={{ minHeight: 350 }}>
          {compareMode ? renderCompareChart() : renderStandardChart()}
        </div>

        <Divider />
        <Text type="secondary">
          Showing {filteredEntries.length.toLocaleString()} entries | {formatHours(totalFilteredHours)} total hours
          {compareMode && <Tag color="purple" style={{ marginLeft: 8 }}>Compare Mode</Tag>}
        </Text>
      </ProCard>

      {/* Section 3: ProTable with Summary Row */}
      <ProCard 
        title={<Title level={5} style={{ margin: 0 }}>📋 Data Explorer</Title>} 
        style={{ ...CARD_STYLE, marginTop: 20 }}
        collapsible
        defaultCollapsed
      >
        <ProTable<TimeEntry>
          columns={safeColumns}
          dataSource={filteredEntries}
          rowKey={(record, index) => `${record.date}-${index}`}
          search={false}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} entries` }}
          scroll={{ x: 1200 }}
          options={{ density: true, fullScreen: true, reload: false }}
          toolBarRender={() => [
            <Text key="count" type="secondary">
              {filteredEntries.length.toLocaleString()} entries | {formatHours(totalFilteredHours)} hrs
            </Text>,
          ]}
          summary={() => (
            <ProTable.Summary fixed>
              <ProTable.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                <ProTable.Summary.Cell index={0} colSpan={8}>
                  <Text strong>Total</Text>
                </ProTable.Summary.Cell>
                <ProTable.Summary.Cell index={8}>
                  <Text strong style={{ color: '#0D7377' }}>{totalFilteredHours.toFixed(2)}</Text>
                </ProTable.Summary.Cell>
              </ProTable.Summary.Row>
            </ProTable.Summary>
          )}
        />
      </ProCard>
    </PageContainer>
  );
};

export default PlaygroundPage;
