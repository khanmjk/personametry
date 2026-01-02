/**
 * Individual Persona Page
 * -----------------------
 * Self-investment tracking: Health, Learning, Hobbies, Spiritual
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Statistic, Typography, Divider, Table, Progress, Tag } from 'antd';
import { Pie, Line } from '@ant-design/charts';
import {
  HeartOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { TimeEntry } from '@/models/personametry';
import { useYear } from '@/contexts/YearContext';
import {
  loadTimeEntries,
  getAvailableYears,
  getDataSource,
  calculateIndividualPatterns,
  IndividualAnalysis,
  formatHours,
} from '@/services/personametryService';

const { Text, Title } = Typography;

const CARD_STYLE = {
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const RAG_COLORS = {
  green: '#52c41a',
  amber: '#faad14',
  red: '#f5222d',
};

const IndividualPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [analysis, setAnalysis] = useState<IndividualAnalysis | null>(null);

  // Use global year context - this page treats 'ALL' as all-time
  const { selectedYear, setAvailableYears, isAllTime } = useYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        setEntries(data.entries);
        const years = getAvailableYears(data.entries);
        setAvailableYears(years);
        
        // Initial analysis based on global selection
        const result = isAllTime 
          ? calculateIndividualPatterns(data.entries)
          : calculateIndividualPatterns(data.entries, selectedYear as number);
        setAnalysis(result);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };
    fetchData();
  }, [setAvailableYears]);

  // Update analysis when global year changes
  useEffect(() => {
    if (entries.length > 0) {
      const result = isAllTime 
        ? calculateIndividualPatterns(entries)
        : calculateIndividualPatterns(entries, selectedYear as number);
      setAnalysis(result);
    }
  }, [selectedYear, entries, isAllTime]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>Loading self-investment data...</Text>
        </div>
      </PageContainer>
    );
  }

  if (error || !analysis) {
    return (
      <PageContainer>
        <Alert type="error" message="Unable to Load Data" description={error} showIcon />
      </PageContainer>
    );
  }


  // Calculate YoY trend - compare selected year vs previous year
  const calculateYoYTrend = () => {
    if (selectedYear === 'ALL') {
      // For all time, compare last 12 months vs previous 12
      if (analysis.monthlyTrend.length < 24) return { delta: 0, percent: 0 };
      const lastYear = analysis.monthlyTrend.slice(-12).reduce((sum, m) => sum + m.hours, 0);
      const prevYear = analysis.monthlyTrend.slice(-24, -12).reduce((sum, m) => sum + m.hours, 0);
      const delta = lastYear - prevYear;
      const percent = prevYear > 0 ? Math.round((delta / prevYear) * 100) : 0;
      return { delta, percent };
    } else {
      // For specific year, compare to previous year
      const INDIVIDUAL_PERSONA = 'P2 Individual';
      const SPIRITUAL_PERSONA = 'P1 Muslim';
      const SOCIAL_PERSONA = 'P6 Friend Social';
      
      const individualEntries = entries.filter(
        e => e.prioritisedPersona === INDIVIDUAL_PERSONA || 
             e.prioritisedPersona === SPIRITUAL_PERSONA ||
             e.prioritisedPersona === SOCIAL_PERSONA
      );
      
      const currentYearHours = individualEntries
        .filter(e => e.year === selectedYear)
        .reduce((sum, e) => sum + e.hours, 0);
      const prevYearHours = individualEntries
        .filter(e => e.year === selectedYear - 1)
        .reduce((sum, e) => sum + e.hours, 0);
      
      if (prevYearHours === 0) return { delta: 0, percent: 0 };
      const delta = currentYearHours - prevYearHours;
      const percent = Math.round((delta / prevYearHours) * 100);
      return { delta, percent };
    }
  };
  const yoyTrend = calculateYoYTrend();

  // Pie chart config
  const pieConfig = {
    data: analysis.activityBreakdown,
    angleField: 'hours',
    colorField: 'category',
    color: (category: string) => {
      const colorMap: Record<string, string> = {
        'Health & Fitness': '#52c41a',
        'Learning': '#1890ff',
        'Hobbies & Creative': '#722ed1',
        'Spiritual': '#faad14',
      };
      return colorMap[category] || '#999';
    },
    radius: 0.85,
    innerRadius: 0.55,
    label: false,
    legend: { position: 'bottom' as const },
    statistic: {
      title: false as const,
      content: {
        style: { fontSize: '18px', fontWeight: 600 },
        content: `${formatHours(analysis.totalHours)}h`,
      },
    },
    interactions: [{ type: 'element-active' }],
    tooltip: {
      formatter: (datum: any) => {
        return { name: datum.category, value: `${formatHours(datum.hours)} hrs (${datum.percentage}%)` };
      },
    },
  };

  // Line chart config for monthly trend
  const lineConfig = {
    data: analysis.monthlyTrend,
    xField: 'month',
    yField: 'hours',
    height: 280,
    smooth: true,
    color: '#722ed1',
    point: { size: 3, shape: 'circle' },
    xAxis: {
      label: {
        formatter: (text: string) => {
          const parts = text.split('-');
          return parts.length === 2 ? `${parts[1]}/${parts[0].slice(2)}` : text;
        },
        autoRotate: true,
      },
    },
    yAxis: {
      title: { text: 'Hours' },
    },
    tooltip: {
      title: (datum: { month: string }) => datum.month,
      items: [(datum: { month: string; hours: number }) => ({
        name: 'Self-Care Hours',
        value: `${datum.hours.toFixed(1)} hrs`,
      })],
    },
  };

  // Table columns for activity breakdown
  const activityColumns = [
    {
      title: 'Activity',
      dataIndex: 'category',
      key: 'category',
      render: (category: string, record: any) => (
        <span style={{ fontWeight: 500 }}>
          <span style={{ 
            display: 'inline-block', 
            width: 12, 
            height: 12, 
            borderRadius: 2, 
            backgroundColor: record.color,
            marginRight: 8 
          }} />
          {category}
        </span>
      ),
    },
    {
      title: 'Hours',
      dataIndex: 'hours',
      key: 'hours',
      align: 'right' as const,
      render: (hours: number) => <Text strong>{formatHours(hours)} hrs</Text>,
    },
    {
      title: '%',
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'right' as const,
      render: (pct: number) => <Text type="secondary">{pct}%</Text>,
    },
  ];

  // Calculate RAG distribution
  const ragDistribution = {
    green: analysis.weeklyScores.filter(w => w.ragStatus === 'green').length,
    amber: analysis.weeklyScores.filter(w => w.ragStatus === 'amber').length,
    red: analysis.weeklyScores.filter(w => w.ragStatus === 'red').length,
  };

  return (
    <PageContainer
      header={{
        title: (
          <span style={{ fontSize: 24, fontWeight: 600, color: '#333' }}>
            <HeartOutlined style={{ marginRight: 8, color: '#722ed1' }} />
            Individual • Self Care
            {isAllTime && <Tag color="#0D7377" icon={<GlobalOutlined />} style={{ marginLeft: 12 }}>All Time</Tag>}
          </span>
        ),
        subTitle: 'Health, Learning, Hobbies, Spiritual & Social',
      }}
    >
      {/* KPI Row */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} md={isAllTime ? 8 : 6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Total Me Time</Text>}
              value={formatHours(analysis.totalHours)}
              suffix="hrs"
              valueStyle={{ color: '#722ed1', fontSize: 28, fontWeight: 600 }}
              prefix={<ClockCircleOutlined />}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">Incl. Spiritual + Social for a more holistic view of self-care streams</Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={isAllTime ? 8 : 6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Avg. Weekly</Text>}
              value={analysis.avgWeeklyHours}
              suffix="hrs"
              valueStyle={{ 
                color: analysis.avgWeeklyHours >= 10 ? RAG_COLORS.green : 
                       analysis.avgWeeklyHours >= 5 ? RAG_COLORS.amber : RAG_COLORS.red, 
                fontSize: 28, 
                fontWeight: 600 
              }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">
              {analysis.avgWeeklyHours >= 10 ? '🟢 Thriving' : 
               analysis.avgWeeklyHours >= 5 ? '🟠 Maintenance' : '🔴 Low'}
            </Text>
          </ProCard>
        </Col>
        <Col xs={24} sm={12} md={isAllTime ? 8 : 6}>
          <ProCard style={CARD_STYLE}>
            <Statistic
              title={<Text strong>Fitness Consistency</Text>}
              value={analysis.fitnessConsistencyPct}
              suffix="%"
              valueStyle={{ color: '#52c41a', fontSize: 28, fontWeight: 600 }}
              prefix={<TrophyOutlined />}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">Weeks with 3+ day streaks</Text>
          </ProCard>
        </Col>
        {!isAllTime && (
          <Col xs={24} sm={12} md={6}>
            <ProCard style={CARD_STYLE}>
              <Statistic
                title={<Text strong>YoY Trend</Text>}
                value={yoyTrend.delta >= 0 ? `+${formatHours(yoyTrend.delta)}` : formatHours(yoyTrend.delta)}
                suffix="hrs"
                valueStyle={{ 
                  color: yoyTrend.delta >= 0 ? '#52c41a' : '#f5222d', 
                  fontSize: 28, 
                  fontWeight: 600 
                }}
                prefix={yoyTrend.delta >= 0 ? <RiseOutlined /> : <FallOutlined />}
              />
              <Divider style={{ margin: '12px 0' }} />
              <Text style={{ color: yoyTrend.percent >= 0 ? '#52c41a' : '#f5222d' }}>
                {yoyTrend.percent >= 0 ? '+' : ''}{yoyTrend.percent}%
              </Text>
            </ProCard>
          </Col>
        )}
      </Row>

      {/* Charts Row */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={10}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Activity Distribution</Title>}
            style={{ ...CARD_STYLE, height: 420 }}
          >
            <Row gutter={16}>
              {/* Left: Clean Pie */}
              <Col span={12}>
                <Pie
                  data={analysis.activityBreakdown}
                  angleField="hours"
                  colorField="category"
                  scale={{ color: { range: analysis.activityBreakdown.map(item => item.color) } }}
                  radius={1}
                  innerRadius={0}
                  label={false}
                  legend={false}
                  height={280}
                  interactions={[{ type: 'element-active' }]}
                  tooltip={{
                    title: (datum: any) => datum.category,
                    items: [
                      (datum: any) => ({
                        name: datum.category,
                        value: `${formatHours(datum.hours)} hrs (${datum.percentage}%)`,
                      }),
                    ],
                  }}
                />
              </Col>
              {/* Right: Legend Table */}
              <Col span={12}>
                <Table
                  dataSource={analysis.activityBreakdown}
                  columns={[
                    {
                      title: '',
                      dataIndex: 'color',
                      key: 'color',
                      width: 24,
                      render: (_: any, record: any) => (
                        <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: record.color }} />
                      ),
                    },
                    {
                      title: 'Activity',
                      dataIndex: 'category',
                      key: 'category',
                      render: (category: string) => <Text>{category}</Text>,
                    },
                    {
                      title: '%',
                      dataIndex: 'percentage',
                      key: 'percentage',
                      align: 'right' as const,
                      render: (pct: number) => <Text strong>{pct}%</Text>,
                    },
                    {
                      title: 'Hours',
                      dataIndex: 'hours',
                      key: 'hours',
                      align: 'right' as const,
                      render: (hours: number) => <Text type="secondary">{formatHours(hours)}</Text>,
                    },
                  ]}
                  pagination={false}
                  size="small"
                  rowKey="category"
                  showHeader={false}
                />
              </Col>
            </Row>
          </ProCard>
        </Col>
        <Col xs={24} lg={14}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Self-Care Trend (Monthly)</Title>}
            style={{ ...CARD_STYLE, height: 420 }}
          >
            <Line {...lineConfig} />
          </ProCard>
        </Col>
      </Row>

      {/* Activity Breakdown + Weekly RAG */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Activity Breakdown</Title>}
            style={{ ...CARD_STYLE, height: 350 }}
          >
            <Table
              dataSource={analysis.activityBreakdown}
              columns={activityColumns}
              pagination={false}
              size="small"
              rowKey="category"
            />
          </ProCard>
        </Col>
        <Col xs={24} lg={12}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Weekly Self-Care Score</Title>}
            style={{ ...CARD_STYLE, height: 350 }}
          >
            <div style={{ marginBottom: 24 }}>
              <Text strong>Distribution across {analysis.stats.totalWeeks} weeks:</Text>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: RAG_COLORS.green }}>{ragDistribution.green}</div>
                <Text type="secondary">🟢 Thriving (&gt;10h)</Text>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: RAG_COLORS.amber }}>{ragDistribution.amber}</div>
                <Text type="secondary">🟠 Maintenance (5-10h)</Text>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: RAG_COLORS.red }}>{ragDistribution.red}</div>
                <Text type="secondary">🔴 Low (&lt;5h)</Text>
              </div>
            </div>
            <Divider />
            <div>
              <Text strong>Best Fitness Streak:</Text>
              <Text style={{ marginLeft: 8 }}>{analysis.stats.bestFitnessStreak} consecutive days</Text>
            </div>
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default IndividualPage;
