
import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, List, Tag, Select, Typography, Statistic, Divider, Alert } from 'antd';
import { WarningOutlined, ThunderboltOutlined, LineChartOutlined } from '@ant-design/icons';
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
        <Row gutter={16}>
            <Col xs={24} md={8}>
                <Card 
                    title={<><WarningOutlined /> Incident Log</>} 
                    bordered={false} 
                    style={{ height: 'calc(100vh - 200px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    bodyStyle={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}
                >
                    <div style={{ padding: '12px 0' }}>
                        <Row gutter={8}>
                            <Col span={8}><Statistic title="Critical" value={stats.critical} valueStyle={{ color: '#cf1322' }} /></Col>
                            <Col span={8}><Statistic title="Warnings" value={stats.warning} valueStyle={{ color: '#faad14' }} /></Col>
                            <Col span={8}><Statistic title="Structural" value={stats.structural} valueStyle={{ color: '#1890ff' }} /></Col>
                        </Row>
                        <Divider />
                    </div>

                    <List
                        itemLayout="vertical"
                        dataSource={anomalies}
                        renderItem={item => (
                            <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Tag color={getSeverityColor(item.severity)}>{item.type}</Tag>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{item.date}</Text>
                                </div>
                                <Text strong>{item.category}</Text>
                                <div style={{ color: '#666', fontSize: 13 }}>{item.description}</div>
                            </List.Item>
                        )}
                    />
                </Card>
            </Col>

            <Col xs={24} md={16}>
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
                </Card>

                <Alert
                    message="How The Inspector Works"
                    description={
                        <div style={{ fontSize: 13 }}>
                            <p><strong>Structural Checks:</strong> Flags impossible entries (e.g. &gt; 24h/day) or data gaps.</p>
                            <p><strong>Statistical (STL):</strong> Decomposes your history into Trend + Seasonality. The "Expected" blue line shows your normal pattern. Deviations &gt; 3.5x sigma are flagged.</p>
                        </div>
                    }
                    type="info"
                    showIcon
                />
            </Col>
        </Row>
    </PageContainer>
  );
};

const BoltOutlined = ThunderboltOutlined;

export default AnomalyDetectionPage;
