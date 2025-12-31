/**
 * Personas Page
 * -------------
 * Deep dive into individual persona performance and trends.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Select, Statistic, Tag, Table, Progress, Space } from 'antd';
import { Column } from '@ant-design/charts';
import {
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { TimeEntry, PersonaSummary } from '@/models/personametry';
import { PERSONA_COLORS, PERSONA_SHORT_NAMES } from '@/models/personametry';
import {
  loadTimeEntries,
  getAvailableYears,
  groupByPersona,
  filterByYear,
  filterByPersona,
  groupByMonth,
  formatHours,
  getDataSource,
} from '@/services/personametryService';

const PersonasPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2022);
  const [selectedPersona, setSelectedPersona] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        setEntries(data.entries);
        const years = getAvailableYears(data.entries);
        setAvailableYears(years);
        setSelectedYear(years[0] || 2022);
        // Set default persona
        const yearEntries = filterByYear(data.entries, years[0] || 2022);
        const summaries = groupByPersona(yearEntries);
        if (summaries.length > 0) {
          setSelectedPersona(summaries[0].persona);
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate data
  const yearEntries = filterByYear(entries, selectedYear);
  const personaSummaries = groupByPersona(yearEntries);
  const personaEntries = filterByPersona(yearEntries, selectedPersona);
  const monthlyData = groupByMonth(personaEntries);

  // Previous year data for comparison
  const prevYearEntries = filterByYear(entries, selectedYear - 1);
  const prevSummaries = groupByPersona(prevYearEntries);
  const prevPersonaHours = prevSummaries.find(p => p.persona === selectedPersona)?.totalHours || 0;
  const currentPersonaHours = personaSummaries.find(p => p.persona === selectedPersona)?.totalHours || 0;
  const deltaHours = currentPersonaHours - prevPersonaHours;
  const deltaPercent = prevPersonaHours > 0 ? ((deltaHours / prevPersonaHours) * 100) : 0;

  // Monthly chart data
  const monthlyChartData = monthlyData.map(m => ({
    month: m.monthName,
    hours: Math.round(m.hours * 10) / 10,
  }));

  // Table columns for persona summary
  const tableColumns = [
    {
      title: 'Persona',
      dataIndex: 'persona',
      key: 'persona',
      render: (text: string) => (
        <Tag color={PERSONA_COLORS[text]}>
          {PERSONA_SHORT_NAMES[text] || text}
        </Tag>
      ),
    },
    {
      title: 'Hours',
      dataIndex: 'totalHours',
      key: 'hours',
      render: (hours: number) => formatHours(hours),
      sorter: (a: PersonaSummary, b: PersonaSummary) => a.totalHours - b.totalHours,
    },
    {
      title: '%',
      dataIndex: 'percentageOfTotal',
      key: 'percentage',
      render: (pct: number) => (
        <Progress
          percent={pct}
          size="small"
          format={(p) => `${p}%`}
          strokeColor="#1890ff"
        />
      ),
    },
    {
      title: 'Entries',
      dataIndex: 'entryCount',
      key: 'entries',
      render: (count: number) => count.toLocaleString(),
    },
  ];

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
          <p>Loading persona data...</p>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert type="error" message="Failed to Load Data" description={error} showIcon />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{
        title: 'Personas',
        subTitle: `Deep dive into ${selectedYear} persona performance`,
        extra: [
          <Select
            key="year"
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 100 }}
            options={availableYears.map((y) => ({ label: y.toString(), value: y }))}
          />,
        ],
      }}
    >
      {/* Persona Summary Table */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <ProCard title="All Personas" style={{ height: 450 }}>
            <Table
              dataSource={personaSummaries}
              columns={tableColumns}
              rowKey="persona"
              pagination={false}
              size="small"
              onRow={(record) => ({
                onClick: () => setSelectedPersona(record.persona),
                style: {
                  cursor: 'pointer',
                  background: record.persona === selectedPersona ? '#e6f7ff' : undefined,
                },
              })}
            />
          </ProCard>
        </Col>

        {/* Selected Persona Details */}
        <Col xs={24} lg={14}>
          <ProCard
            title={
              <Space>
                <Tag color={PERSONA_COLORS[selectedPersona]}>
                  {PERSONA_SHORT_NAMES[selectedPersona] || selectedPersona}
                </Tag>
                <span>Detail View</span>
              </Space>
            }
            style={{ height: 450 }}
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title="Total Hours"
                  value={formatHours(currentPersonaHours)}
                  suffix="hrs"
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="vs Previous Year"
                  value={deltaHours >= 0 ? `+${formatHours(deltaHours)}` : formatHours(deltaHours)}
                  suffix="hrs"
                  valueStyle={{ color: deltaHours >= 0 ? '#52c41a' : '#ff4d4f' }}
                  prefix={deltaHours >= 0 ? <RiseOutlined /> : <FallOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="% Change"
                  value={deltaPercent >= 0 ? `+${deltaPercent.toFixed(1)}` : deltaPercent.toFixed(1)}
                  suffix="%"
                  valueStyle={{ color: deltaPercent >= 0 ? '#52c41a' : '#ff4d4f' }}
                />
              </Col>
            </Row>

            <div style={{ marginTop: 24 }}>
              <h4>Monthly Breakdown</h4>
              <Column
                data={monthlyChartData}
                xField="month"
                yField="hours"
                height={200}
                color={PERSONA_COLORS[selectedPersona] || '#1890ff'}
                label={{
                  position: 'top',
                  style: { fontSize: 10, fill: '#666' },
                }}
              />
            </div>
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default PersonasPage;
