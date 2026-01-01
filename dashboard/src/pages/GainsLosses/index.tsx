/**
 * Gains/Losses Page
 * -----------------
 * Comparative view of time reallocation across personas (Year-over-Year).
 * Visualized as a diverging waterfall-like chart (Blue = Gain, Red = Loss).
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Select, Table, Space, Tag, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import YoYComparisonBar from '@/components/charts/YoYComparisonBar';
import { 
  type TimeEntry, 
  PERSONA_COLORS, 
  PERSONA_SHORT_NAMES,
  type YearlyComparison 
} from '@/models/personametry';
import { 
  loadTimeEntries, 
  getAvailableYears, 
  filterByYear, 
  groupByPersona, 
  calculateYoYComparison,
  getDataSource,
  formatHours,
} from '@/services/personametryService';

const { Text } = Typography;

const GainsLossesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        setEntries(data.entries);
        const years = getAvailableYears(data.entries);
        setAvailableYears(years);
        // Default to latest year
        setSelectedYear(years[0] || new Date().getFullYear());
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate Comparison
  const currentYear = selectedYear;
  const previousYear = selectedYear - 1;

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
          color: delta >= 0 ? '#1890ff' : '#ff4d4f', 
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
         const color = pct >= 0 ? '#1890ff' : '#ff4d4f';
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
        extra: [
           <Select
             key="year"
             value={selectedYear}
             onChange={setSelectedYear}
             options={availableYears.map(y => ({ label: y.toString(), value: y }))}
             style={{ width: 100 }}
           />
        ]
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
             <div style={{ textAlign: 'center', marginTop: 10 }}>
               <Space size="large">
                 <Space><div style={{width: 12, height:12, background: '#52c41a'}} /> Gains (More time)</Space>
                 <Space><div style={{width: 12, height:12, background: '#ff4d4f'}} /> Losses (Less time)</Space>
               </Space>
             </div>
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
