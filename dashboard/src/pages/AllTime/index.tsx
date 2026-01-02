/**
 * All Time Page - Historical Overview
 * -------------------------------------
 * Multi-year analysis across all available data.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Statistic, Typography, Divider, Table, Space, Select } from 'antd';
import { Column, Line } from '@ant-design/charts';
import YearlyStackedBar from '@/components/charts/YearlyStackedBar';
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
  const [selectedPersona, setSelectedPersona] = useState<string>('ALL');

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

  // Filter out current incomplete year (e.g., 2026) for "All Time" analysis
  // This ensures metrics reflect "Complete Years" only
  const currentYear = new Date().getFullYear();
  const displayedYears = availableYears.filter(y => y < currentYear);
  const displayedEntries = entries.filter(e => e.year < currentYear);

  // Include all metrics (Sleep included)
  // const entriesExcludingSleep = entries.filter(e => e.prioritisedPersona !== SLEEP_PERSONA);
  
  // Get unique personas for dropdown
  const uniquePersonas = [...new Set(displayedEntries.map(e => e.prioritisedPersona))].sort();
  
  // Apply persona filter
  const filteredEntries = selectedPersona === 'ALL' 
    ? displayedEntries 
    : displayedEntries.filter(e => e.prioritisedPersona === selectedPersona);
  
  // Total metrics (use filtered data)
  const totalHours = sumHours(filteredEntries);
  const totalEntries = filteredEntries.length;
  const yearCount = displayedYears.length;
  const avgPerYear = totalHours / yearCount;

  // Persona breakdown across all years (still show all for context)
  const personaSummaries = selectedPersona === 'ALL' 
    ? groupByPersona(displayedEntries) // Use full entries (minus current year)
    : groupByPersona(filteredEntries);



  // Yearly totals for trend line (use filtered data)
  const yearlyTotals = displayedYears.map(year => {
    const yearData = filterByYear(filteredEntries, year);
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

  // Tracking Quality Analysis
  // 1. Calculate Theoretical Max (365.25 days * 24h = 8766h/yr approx, or 8760 for non-leap)
  const HOURS_PER_YEAR = 8760;
  
  // 2. Identified Latest Complete Year
  // displayedYears is already filtered to exclude current year.
  // So displayedYears[0] is the latest complete year (e.g. 2025).
  const latestCompleteYear = displayedYears.length > 0 ? displayedYears[0] : 0;
  const latestCompleteYearData = yearlyTotals.find(y => y.year === latestCompleteYear.toString());
  
  // 3. Calculate Accuracy for that year
  // Determine if leap year
  const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const targetHours = isLeapYear(latestCompleteYear) ? 8784 : 8760;
  const recordedHours = latestCompleteYearData ? latestCompleteYearData.hours : 0;
  
  const missingHours = targetHours - recordedHours;
  const accuracyPct = targetHours > 0 ? (recordedHours / targetHours) * 100 : 0;
  
  // 4. All Time Coverage (approx)
  // Use displayedYears (completed years only)
  // SPECIAL HANDLING: 2016 is a partial year (started mid-year).
  // We should calculate the target based on the FIRST logged entry in 2016.
  const calculateYearTarget = (year: number) => {
    const daysInYear = isLeapYear(year) ? 366 : 365;
    
    // Exception for 2016 (Partial Year)
    if (year === 2016) {
       const entriesIn2016 = entries.filter(e => e.year === 2016);
       if (entriesIn2016.length > 0) {
          // Find first date
          const dates = entriesIn2016.map(e => e.date).sort();
          // Assuming date format YYYY-MM-DD, lexicographical sort works
          const firstDate = new Date(dates[0]);
          const lastDate = new Date('2016-12-31');
          const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
          const daysActive = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          return daysActive * 24;
       }
    }
    return daysInYear * 24;
  };

  const totalTargetHours = displayedYears.reduce((sum, year) => {
    return sum + calculateYearTarget(year);
  }, 0);
  
  // Accuracy color
  const getAccuracyColor = (pct: number) => {
    if (pct >= 99) return STATUS_COLORS.success;
    if (pct >= 95) return STATUS_COLORS.warning;
    return STATUS_COLORS.error;
  };

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

  // Benchmark Constants
  const WORK_PERSONA = 'P3 Professional';
  const SLEEP_PERSONA = 'P0 Life Constraints (Sleep)';
  const WORK_BENCHMARK_SA = 2340; // 45h/week * 52
  const SLEEP_BENCHMARK = 2920;   // 8h/day * 365
  
  // Determine active benchmark
  let activeBenchmark = null;
  let benchmarkLabel = '';
  
  if (selectedPersona === 'ALL') {
    activeBenchmark = HOURS_PER_YEAR; // 8760
    benchmarkLabel = 'Theoretical Max';
  } else if (selectedPersona === WORK_PERSONA) {
    activeBenchmark = WORK_BENCHMARK_SA;
    benchmarkLabel = 'SA Standard (45h/wk)';
  } else if (selectedPersona === SLEEP_PERSONA) {
    activeBenchmark = SLEEP_BENCHMARK;
    benchmarkLabel = 'Recommended (8h/day)';
  }

  // Calculate Total Benchmark (for Total Hours card)
  // Use sum of displayedYears. Handle 2016 Partial Exception.
  const totalBenchmarkHours = displayedYears.reduce((sum, year) => {
    if (!activeBenchmark) return 0;
    
    let yearBenchmark = activeBenchmark;
    
    // Adjust for 2016 if it's in the displayed years
    if (year === 2016) {
        // Calculate factor based on days active / total days
        const target2016 = calculateYearTarget(2016);
        const full2016 = isLeapYear(2016) ? 8784 : 8760;
        const fraction = target2016 / full2016;
        yearBenchmark = activeBenchmark * fraction;
    }
    
    return sum + yearBenchmark;
  }, 0);
  
  // Calculate Tracking/Performance %
  const performancePct = (activeBenchmark && totalHours > 0) ? (totalHours / totalBenchmarkHours) * 100 : 0;

  return (
    <PageContainer
      header={{
        title: (
          <span style={{ fontSize: 24, fontWeight: 600, color: '#333' }}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            All Time • {yearCount} Years
          </span>
        ),
        subTitle: displayedYears.length > 0 ? `${displayedYears[displayedYears.length - 1]} - ${displayedYears[0]}` : '',
        extra: [
          <Select
            key="persona-filter"
            value={selectedPersona}
            onChange={setSelectedPersona}
            style={{ width: 200 }}
            options={[
              { label: 'All Personas', value: 'ALL' },
              ...uniquePersonas.map(p => ({ 
                label: PERSONA_SHORT_NAMES[p] || p, 
                value: p 
              }))
            ]}
          />
        ],
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
            {activeBenchmark && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary">
                  {selectedPersona === 'ALL' 
                    ? `Includes sleep (${(totalHours / totalTargetHours * 100).toFixed(1)}% tracked)`
                    : `${performancePct.toFixed(1)}% of ${benchmarkLabel}`
                  }
                </Text>
              </>
            )}
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
            {activeBenchmark && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary">
                  vs {formatHours(activeBenchmark)} hrs ({benchmarkLabel})
                </Text>
              </>
            )}
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <ProCard style={CARD_STYLE}>
            {selectedPersona === 'ALL' ? (
              <>
                <Statistic
                  title={<Text strong>Tracking Quality ({latestCompleteYear})</Text>}
                  value={`${accuracyPct.toFixed(2)}%`}
                  valueStyle={{ 
                    color: getAccuracyColor(accuracyPct), 
                    fontSize: 28, 
                    fontWeight: 600 
                  }}
                  prefix={<TrophyOutlined />}
                />
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary">
                  Variance: {missingHours > 0 ? '-' : '+'}{formatHours(Math.abs(missingHours))} hrs
                </Text>
              </>
            ) : (
              <>
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
              </>
            )}
          </ProCard>
        </Col>
      </Row>

      {/* Yearly Trend Chart */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Annual Hours Trend</Title>}
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
                  name: 'Total Hours',
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
          <YearlyStackedBar
            entries={filteredEntries}
            title={selectedPersona === 'ALL' ? 'Hours by Year & Persona' : `Hours by Year (${PERSONA_SHORT_NAMES[selectedPersona] || selectedPersona})`}
            height={420}
            variant="grouped"
          />
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
