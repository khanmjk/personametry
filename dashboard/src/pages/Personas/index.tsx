/**
 * Personas Page
 * -------------
 * Deep dive into individual persona performance and trends.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Statistic, Tag, Table, Progress, Space, Typography } from 'antd';
import { Column } from '@ant-design/charts';
import {
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import PersonaDetailCharts from '@/components/charts/PersonaDetailCharts';
import type { TimeEntry, PersonaSummary } from '@/models/personametry';
import { PERSONA_COLORS, PERSONA_SHORT_NAMES } from '@/models/personametry';
import { useYear } from '@/contexts/YearContext';
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

const { Text } = Typography;

const PersonasPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>('');

  // Use global year context
  const { selectedYear, setAvailableYears, isAllTime } = useYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        setEntries(data.entries);
        const years = getAvailableYears(data.entries);
        setAvailableYears(years);
        // Set default persona from first year or all entries
        const summaries = groupByPersona(data.entries);
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
  }, [setAvailableYears]);

  // Calculate data - handle All Time mode
  const filteredEntries = isAllTime ? entries : filterByYear(entries, selectedYear as number);
  const personaSummaries = groupByPersona(filteredEntries);
  const personaEntries = filterByPersona(filteredEntries, selectedPersona);
  const monthlyData = groupByMonth(personaEntries);

  // Monthly chart data - pad with all 12 months to ensure consistent ordering
  const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyDataMap = new Map(monthlyData.map(m => [m.monthName, m.hours]));
  const monthlyChartData = MONTH_ORDER.map(month => ({
    month,
    hours: Math.round((monthlyDataMap.get(month) || 0) * 10) / 10,
  }));
  
  // Stats calculations - YoY only for specific year
  const currentPersonaHours = personaSummaries.find(p => p.persona === selectedPersona)?.totalHours || 0;
  
  // Previous year comparison - only for specific year
  let prevPersonaHours = 0;
  let deltaHours = 0;
  let deltaPercent = 0;
  
  if (!isAllTime && typeof selectedYear === 'number') {
    const prevYearEntries = filterByYear(entries, selectedYear - 1);
    const prevSummaries = groupByPersona(prevYearEntries);
    prevPersonaHours = prevSummaries.find(p => p.persona === selectedPersona)?.totalHours || 0;
    deltaHours = currentPersonaHours - prevPersonaHours;
    deltaPercent = prevPersonaHours > 0 ? ((deltaHours / prevPersonaHours) * 100) : 0;
  }

  // Title suffix
  const titleSuffix = isAllTime ? 'All Time' : selectedYear.toString();

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
        title: (
          <span style={{ fontSize: 24, fontWeight: 600 }}>
            Personas
            {isAllTime && <Tag color="#0D7377" icon={<GlobalOutlined />} style={{ marginLeft: 12 }}>All Time</Tag>}
          </span>
        ),
        subTitle: `Deep dive into ${titleSuffix} persona performance`,
      }}
    >
      {/* Persona Summary Table */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <ProCard title={`All Personas (${titleSuffix})`} style={{ height: 450 }}>
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
              <Col span={isAllTime ? 12 : 8}>
                <Statistic
                  title="Total Hours"
                  value={formatHours(currentPersonaHours)}
                  suffix="hrs"
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              
              {/* YoY comparison - only for specific year */}
              {!isAllTime && (
                <>
                  <Col span={8}>
                    <Statistic
                      title={`vs ${(selectedYear as number) - 1}`}
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
                </>
              )}
              
              {/* Entry count for All Time mode */}
              {isAllTime && (
                <Col span={12}>
                  <Statistic
                    title="Total Entries"
                    value={personaEntries.length.toLocaleString()}
                  />
                </Col>
              )}
            </Row>
            
            {/* Yearly Hours Chart - only for All Time mode */}
            {isAllTime && (
              <div style={{ marginTop: 24 }}>
                <Text strong>Hours by Year</Text>
                <Column
                  data={(() => {
                    const availableYears = getAvailableYears(entries).sort((a, b) => a - b);
                    return availableYears.map(year => {
                      const yearPersonaEntries = filterByPersona(filterByYear(entries, year), selectedPersona);
                      const hours = yearPersonaEntries.reduce((sum, e) => sum + e.hours, 0);
                      return {
                        year: year.toString(),
                        hours: Math.round(hours),
                      };
                    });
                  })()}
                  xField="year"
                  yField="hours"
                  height={200}
                  color={PERSONA_COLORS[selectedPersona] || '#1890ff'}
                  label={{
                    position: 'top',
                    content: ({ hours }: { hours: number }) => `${formatHours(hours)}`,
                    style: { fontSize: 10, fill: '#666' },
                  }}
                />
              </div>
            )}
             
            {/* Monthly breakdown - only for specific year */}
            {!isAllTime && (
              <div style={{ marginTop: 24 }}>
                <Text strong>Monthly Breakdown ({selectedYear})</Text>
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
            )}
          </ProCard>
        </Col>
      </Row>

      {/* Detailed Charts Section - pass current year for specific year mode */}
      {!isAllTime && (
        <PersonaDetailCharts 
          entries={entries} 
          persona={selectedPersona} 
          currentYear={selectedYear as number} 
        />
      )}
    </PageContainer>
  );
};

export default PersonasPage;
