
import React, { useState, useEffect } from 'react';
import { PageContainer, ProTable, ProColumns } from '@ant-design/pro-components';
import { Card, Row, Col, List, Tag, Select, Typography, Statistic, Divider, Alert, Space, Collapse, Table } from 'antd';
import { WarningOutlined, ThunderboltOutlined, LineChartOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { getDataSource, loadTimeEntries } from '@/services/personametryService';
import { AnomalyService, Anomaly } from '@/services/ml/AnomalyService';
import { TimeEntry } from '@/models/personametry';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

// Standard Ant Design Charts (G2Plot) format
interface ChartDataPoint {
  date: string;
  type: string; // 'Actual' | 'Expected'
  value: number;
}

const AnomalyDetectionPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>('P3 Professional');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartAnomalies, setChartAnomalies] = useState<Anomaly[]>([]); // For annotations
  const [stats, setStats] = useState({ critical: 0, warning: 0, structural: 0 });

  // Load Data & Run Detection
  useEffect(() => {
    const init = async () => {
        try {
            const data = await loadTimeEntries(getDataSource());
            setEntries(data.entries);

            const engine = new AnomalyService();
            const results = engine.detectAll(data.entries);
            setAnomalies(results);
            
            setStats({
                critical: results.filter(a => a.severity === 'Critical').length,
                warning: results.filter(a => a.severity === 'Warning').length,
                structural: results.filter(a => a.type === 'Structural').length
            });
            
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };
    init();
  }, []);

  // Update Chart when Persona Changes
  useEffect(() => {
      if (entries.length === 0) return;

      const engine = new AnomalyService();
      
      const relevant = entries.filter(e => e.prioritisedPersona === selectedPersona).sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
      
      const start = dayjs().subtract(6, 'month'); // Show last 6 months for better visibility
      const end = dayjs();
      
      const values: number[] = [];
      const dates: string[] = [];
      const entryMap = new Map(relevant.map(e => [e.date, e.hours]));
      
      let curr = start;
      while (curr.isBefore(end)) {
          const d = curr.format('YYYY-MM-DD');
          dates.push(d);
          values.push(entryMap.get(d) || 0);
          curr = curr.add(1, 'day');
      }

      const decomp = engine.stlDecomposition(values, 7);
      
      // Transform for G2Plot (Long format)
      const newChartData: ChartDataPoint[] = [];
      dates.forEach((d, i) => {
          newChartData.push({ date: d, type: 'Actual', value: values[i] });
          newChartData.push({ date: d, type: 'Expected', value: decomp.trend[i] + decomp.seasonal[i] });
      });

      setChartData(newChartData);

      // Filter anomalies for this persona and time range
      const visibleAnomalies = anomalies.filter(a => 
          (a.category === selectedPersona || a.type === 'Structural') && 
          dayjs(a.date).isAfter(start) &&
          dayjs(a.date).isBefore(end)
      );
      setChartAnomalies(visibleAnomalies);

  }, [selectedPersona, entries, anomalies]);


  const getSeverityColor = (s: string) => s === 'Critical' ? '#cf1322' : '#d4b106';

  // Chart Configuration
  const config = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    animation: false, // Performance
    colorField: 'type',
    scale: {
        color: {
            domain: ['Actual', 'Expected'],
            range: ['#52c41a', '#1890ff'] // Green, Blue
        }
    },
    xAxis: {
        type: 'time',
        mask: 'MMM D'
    },
    // Add annotations for anomalies
    annotations: chartAnomalies.map(a => ({
        type: 'text',
        position: [a.date, a.value],
        content: '⚠️',
        offsetY: -15,
        style: {
            fontSize: 18,
            textAlign: 'center',
            fill: '#cf1322', // Red color for text
        },
    } as any)), // Type casting for older TS definitions if needed
    tooltip: {
        showMarkers: false,
        items: [(datum: ChartDataPoint) => {
            return { 
                name: datum.type, 
                value: datum.value?.toFixed(1) + 'h' 
            };
        }]
    }
  };

  return (
    <PageContainer>
        {/* Row 1: Key Metrics */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
                <Card bordered={false}>
                    <Statistic 
                        title="Critical Issues" 
                        value={stats.critical} 
                        valueStyle={{ color: '#cf1322' }} 
                        prefix={<WarningOutlined />} 
                        suffix={anomalies.length > 0 ? <Tag color="red" style={{ marginLeft: 8 }}>{((stats.critical/anomalies.length)*100).toFixed(0)}%</Tag> : null}
                    />
                </Card>
            </Col>
            <Col span={8}>
                <Card bordered={false}>
                    <Statistic 
                        title="Warnings" 
                        value={stats.warning} 
                        valueStyle={{ color: '#faad14' }} 
                        prefix={<LineChartOutlined />}
                    />
                </Card>
            </Col>
            <Col span={8}>
                <Card bordered={false}>
                    <Statistic 
                        title="Structural Integrity" 
                        value={stats.structural} 
                        valueStyle={{ color: '#1890ff' }} 
                        prefix={<ThunderboltOutlined />}
                    />
                </Card>
            </Col>
        </Row>

        {/* Row 2: Forensic Chart */}
        <Card title={<><LineChartOutlined /> Forensic Analysis</>} bordered={false} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Select value={selectedPersona} onChange={setSelectedPersona} style={{ width: 250 }}>
                        <Option value="P3 Professional">P3 Professional (Work)</Option>
                        <Option value="P0 Life Constraints (Sleep)">P0 Sleep</Option>
                        <Option value="P2 Individual">P2 Individual</Option>
                        <Option value="P5 Family">P5 Family</Option>
                    </Select>
                    <Tag icon={<BoltOutlined />} color="purple">STL Decomposition View</Tag>
            </div>

            <div style={{ height: 400 }}>
                <Line {...config} />
            </div>
            
            <Collapse 
                ghost 
                items={[{
                    key: '1',
                    label: <Space><InfoCircleOutlined /> How The Inspector Works</Space>,
                    children: (
                        <div>
                            <p>The system uses a hybrid "PhD-level" approach combining structural checks, behavioral analysis, and statistical decomposition.</p>
                            
                            <Table 
                                dataSource={[
                                    { severity: 'Critical', criteria: 'Impossible Day (> 35h)', logic: 'Data Analysis: P99.9 daily total is 35.39h. Higher is physically impossible.' },
                                    { severity: 'Critical', criteria: 'Sleep Deprivation Streak', logic: 'Behavioral: > 2 consecutive days with < 2 hours sleep.' },
                                    { severity: 'Critical', criteria: 'Statistical Deviation (> 6σ)', logic: 'Math: Extreme outlier from your historical baseline.' },
                                    { severity: 'Warning', criteria: 'Statistical Deviation (3.5-6σ)', logic: 'Math: Significant deviation from normal pattern.' },
                                    { severity: 'Warning', criteria: 'Weekend Overwork', logic: 'Behavioral: > 4h work on Sat/Sun.' },
                                ]}
                                pagination={false}
                                size="small"
                                columns={[
                                    { title: 'Severity', dataIndex: 'severity', render: (t) => <Tag color={t === 'Critical' ? 'red' : 'gold'}>{t}</Tag> },
                                    { title: 'Criteria', dataIndex: 'criteria', render: (t) => <strong>{t}</strong> },
                                    { title: 'Logic / "Why"', dataIndex: 'logic' }
                                ]}
                            />
                        </div>
                    )
                }]}
                style={{ marginTop: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}
            />
        </Card>

        {/* Row 3: Incident Log (ProTable) */}
        <ProTable<Anomaly>
            headerTitle="Incident Log"
            dataSource={anomalies}
            rowKey={(record) => record.date + record.type}
            search={{
                labelWidth: 'auto',
            }}
            options={false}
            pagination={{
                pageSize: 10,
            }}
            columns={[
                {
                    title: 'Severity',
                    dataIndex: 'severity',
                    width: 100,
                    valueEnum: {
                        Critical: { text: 'Critical', status: 'Error' },
                        Warning: { text: 'Warning', status: 'Warning' },
                        Info: { text: 'Info', status: 'Processing' },
                    },
                    render: (_, record) => (
                        <Tag color={getSeverityColor(record.severity)}>{record.severity}</Tag>
                    ),
                },
                {
                    title: 'Date / Range',
                    dataIndex: 'date',
                    width: 180,
                    sorter: (a, b) => dayjs(a.date.split(' to ')[0]).unix() - dayjs(b.date.split(' to ')[0]).unix(),
                    render: (dom, record) => {
                         const isRange = record.date.includes('to');
                         return (
                             <Space>
                                 {isRange ? <CalendarOutlined /> : null}
                                 {dom}
                             </Space>
                         );
                    }
                },
                {
                    title: 'Type',
                    dataIndex: 'type',
                    width: 120,
                    filters: true,
                    onFilter: true,
                    valueEnum: {
                        Structural: { text: 'Structural', status: 'Default' },
                        Statistical: { text: 'Statistical', status: 'Processing' },
                        Behavioral: { text: 'Behavioral', status: 'Warning' },
                    },
                },
                {
                    title: 'Category',
                    dataIndex: 'category',
                    width: 150,
                },
                {
                    title: 'Description',
                    dataIndex: 'description',
                    ellipsis: true,
                },
                {
                    title: 'Impact',
                    dataIndex: 'score',
                    width: 100,
                    render: (_, record) => (
                        <Tag>{record.score?.toFixed(1)}x</Tag>
                    ),
                    tooltip: 'Z-Score deviation magnitude or event count',
                },
            ] as ProColumns<Anomaly>[]}
        />
    </PageContainer>
  );
};

const BoltOutlined = ThunderboltOutlined;

export default AnomalyDetectionPage;
