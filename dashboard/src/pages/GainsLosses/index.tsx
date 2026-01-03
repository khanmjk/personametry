/**
 * Gains/Losses Page
 * -----------------
 * Comparative view of time reallocation across personas (Year-over-Year).
 * Visualized as a diverging waterfall-like chart (Blue = Gain, Red = Loss).
 * NOTE: This page requires a specific year - All Time shows info message.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Table, Space, Tag, Typography, Result } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import YoYComparisonBar from '@/components/charts/YoYComparisonBar';
import { 
  type TimeEntry, 
  PERSONA_COLORS, 
  PERSONA_SHORT_NAMES,
  type YearlyComparison 
} from '@/models/personametry';
import { useYear } from '@/contexts/YearContext';
import { 
  loadTimeEntries, 
  getAvailableYears, 
  calculateYoYComparison,
  getDataSource,
  formatHours,
} from '@/services/personametryService';

const { Text } = Typography;

const GainsLossesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

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
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };
    fetchData();
  }, [setAvailableYears]);

  // If All Time mode, show info message
  if (!loading && !error && isAllTime) {
    return (
      <PageContainer
        header={{
          title: (
            <span style={{ fontSize: 24, fontWeight: 600 }}>
              Gains & Losses
              <Tag color="#0D7377" icon={<GlobalOutlined />} style={{ marginLeft: 12 }}>All Time</Tag>
            </span>
          ),
        }}
      >
        <Result
          icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
          title="Year-over-Year Comparison Required"
          subTitle="This page compares time allocation between consecutive years. Please select a specific year from the global year selector to view gains and losses."
          extra={
            <Text type="secondary">
              Try selecting 2024, 2025, or another specific year to see how your time allocation changed from the previous year.
            </Text>
          }
        />
      </PageContainer>
    );
  }

  // Calculate Comparison (only for specific year)
  const currentYear = selectedYear as number;
  const previousYear = currentYear - 1;

  const comparisonData = calculateYoYComparison(entries, currentYear, previousYear);

  // Filter out zero-hour personas for cleaner chart
  const activeComparisons = comparisonData.filter(d => Math.abs(d.deltaHours) > 1);

  // Sort by Delta (Positive to Negative) - Waterfall style
  const sortedData = [...activeComparisons].sort((a,b) => b.deltaHours - a.deltaHours);

  // Table Columns
  const columns = [
    {
      title: 'Persona',
      dataIndex: 'persona',
      key: 'persona',
      render: (text: string) => (
         <Tag color={PERSONA_COLORS[text]}>{PERSONA_SHORT_NAMES[text] || text}</Tag>
      ),
    },
    {
      title: `${previousYear}`,
      dataIndex: 'previousYearHours',
      key: 'previous',
      render: (val: number) => formatHours(val),
      align: 'right' as const,
    },
    {
      title: `${currentYear}`,
      dataIndex: 'currentYearHours',
      key: 'current',
      render: (val: number) => formatHours(val),
      align: 'right' as const,
    },
    {
      title: 'Variance',
      dataIndex: 'deltaHours',
      key: 'variance',
      align: 'right' as const,
      sorter: (a: YearlyComparison, b: YearlyComparison) => a.deltaHours - b.deltaHours,
      render: (delta: number) => (
        <Text style={{ 
          color: delta >= 0 ? '#52c41a' : '#ff4d4f', 
          fontWeight: 600 
        }}>
          {delta >= 0 ? '+' : ''}{formatHours(delta)}
        </Text>
      ),
    },
    {
      title: '% Change',
      dataIndex: 'percentageChange',
      key: 'pct',
      align: 'right' as const,
      render: (pct: number) => {
         const color = pct >= 0 ? '#52c41a' : '#ff4d4f';
         const Icon = pct >= 0 ? ArrowUpOutlined : ArrowDownOutlined;
         return (
           <Space size={4}>
             <Icon style={{ color, fontSize: 12 }} />
             <Text style={{ color }}>{Math.abs(pct)}%</Text>
           </Space>
         )
      }
    }
  ];

  if (loading) return <PageContainer><Spin size="large" style={{ display:'block', margin:'100px auto' }} /></PageContainer>;
  if (error) return <PageContainer><Alert type="error" message={error} /></PageContainer>;

  return (
    <PageContainer
      header={{
        title: 'Gains & Losses',
        subTitle: `Net time reallocation: ${previousYear} vs ${currentYear}`,
      }}
    >
      <Row gutter={[20, 20]}>
        {/* Waterfall Chart */}
        <Col span={24}>
           <ProCard>
             <YoYComparisonBar 
                data={sortedData}
                currentYear={currentYear}
                previousYear={previousYear}
                title={`Year-over-Year Change (${previousYear} → ${currentYear})`}
                height={500}
             />

           </ProCard>
        </Col>

        {/* Detailed Table */}
        <Col span={24}>
          <ProCard title="Detailed Variance Analysis">
            <Table
              dataSource={sortedData}
              columns={columns}
              rowKey="persona"
              pagination={false}
              size="small"
            />
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default GainsLossesPage;
