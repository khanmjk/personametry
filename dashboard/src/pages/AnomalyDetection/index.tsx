
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

import { useYear } from '@/contexts/YearContext';
import { getAvailableYears } from '@/services/personametryService';

// Standard Ant Design Charts (G2Plot) format
interface ChartDataPoint {
  date: string;
  type: string; // 'Actual' | 'Expected'
  value: number;
}

const AnomalyDetectionPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [entries, setEntries] = useState<TimeEntry[]>([]); // ALL entries
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]); // Filtered for detection
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>('P3 Professional');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartAnomalies, setChartAnomalies] = useState<Anomaly[]>([]); // For annotations
  const [stats, setStats] = useState({ critical: 0, warning: 0, structural: 0 });

  // Global Year Context
  const { selectedYear, isAllTime, setAvailableYears } = useYear();

  // Load Data & Run Detection
  useEffect(() => {
    const init = async () => {
        try {
            const data = await loadTimeEntries(getDataSource());
            setEntries(data.entries);
            
            // Sync available years to global context
            const years = getAvailableYears(data.entries);
            setAvailableYears(years);

            // Filter based on Global Selector
            const relevantEntries = isAllTime 
                ? data.entries 
                : data.entries.filter(e => e.year === selectedYear);

            setFilteredEntries(relevantEntries);

            const engine = new AnomalyService();
            const results = engine.detectAll(relevantEntries);
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
  }, [selectedYear, isAllTime, setAvailableYears]);

  // Update Chart when Persona Changes
  useEffect(() => {
      if (filteredEntries.length === 0) return;

      const engine = new AnomalyService();
      
      const relevant = filteredEntries.filter(e => e.prioritisedPersona === selectedPersona).sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
      
      // Dynamic Date Range based on Filter
      const end = isAllTime ? dayjs() : dayjs(`${selectedYear}-12-31`);
      const start = isAllTime 
          ? dayjs().subtract(6, 'month') // Default view for all time (too much data otherwise)
          : dayjs(`${selectedYear}-01-01`); 

      // If specific year, show full year. If All Time, show last 6 months window or full? 
      // User likely wants to scroll or zoom, but G2Plot Line basic is static.
      // Let's stick to the filtered data range.
      
      const values: number[] = [];
      const dates: string[] = [];
      const entryMap = new Map(relevant.map(e => [e.date, e.hours]));
      
      // Re-construct dense timeline for the view window
      // Use the actual data range from the filtered entries
      if (relevant.length === 0) {
          setChartData([]);
          return;
      }

      const firstDate = dayjs(relevant[0].date);
      const lastDate = dayjs(relevant[relevant.length - 1].date);
      
      let curr = firstDate;
      const final = lastDate;

      while (curr.isBefore(final) || curr.isSame(final, 'day')) {
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
      // The 'anomalies' state is already filtered by year effectively, since we ran detectAll on filteredEntries
      // But we still filter by persona here
      const visibleAnomalies = anomalies.filter(a => 
          (a.category === selectedPersona || a.type === 'Structural')
      );
      setChartAnomalies(visibleAnomalies);

  }, [selectedPersona, filteredEntries, anomalies, isAllTime, selectedYear]);


  const getSeverityColor = (severity: string) => {
      switch (severity) {
          case 'Critical': return 'red';
          case 'Warning': return 'gold';
          case 'Info': return 'blue';
          default: return 'default';
      }
  };

  // Chart Configuration
  const config = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 2000,
      },
    },
    colorField: 'type',
    scale: {
        color: {
            domain: ['Actual', 'Expected'],
            range: ['#28A745', '#1890ff'], // Green for Actual, Blue for Expected (User Request)
        }
    },
    xAxis: {
        type: 'time',
        mask: 'MMM D'
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${v}h`,
      },
      max: 24, // Keep scale sane, though anomalies might exceed
    },
    legend: {
      position: 'top-left' as const,
    },
    // Add annotations for anomalies
    annotations: chartAnomalies.map(a => ({
        type: 'text',
        position: [a.date, a.value],
        content: a.severity === 'Critical' ? '🔴' : '⚠️',
        offsetY: -10,
        style: {
            textAlign: 'center',
            fontSize: 16,
        },
        tooltip: a.description
    })),
    tooltip: {
        title: (d: any) => d.date, // Show date in tooltip title
        items: [
            (d: any) => ({
                name: d.type,
                value: d.value.toFixed(1) + 'h',
                color: d.type === 'Actual' ? '#28A745' : '#1890ff'
            })
        ]
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
                        suffix={<Tag color="red">{((stats.critical / Math.max(stats.critical+stats.warning, 1)) * 100).toFixed(0)}%</Tag>}
                    />
                </Card>
            </Col>
            <Col span={8}>
                <Card bordered={false}>
                    <Statistic 
                        title="Warnings" 
                        value={stats.warning} 
                        valueStyle={{ color: '#faad14' }} 
                        prefix={<ThunderboltOutlined />}
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
        {/* Row 3: Incident Log (ProTable) */}
        <ProTable<Anomaly>
            headerTitle="Incident Log"
            rowKey={(record) => record.date + record.type}
            search={{
                labelWidth: 'auto',
            }}
            options={false}
            pagination={{
                pageSize: 10,
            }}
            // Use request to handle filtering robustly even with local data
            request={async (params, sort, filter) => {
                let filtered = [...anomalies];

                // 1. Search Filter (Severity, Type, Description) supported by ProTable default logic? 
                // No, when using request, we must filter manually.
                
                // Severity Filter
                if (params.severity) {
                    filtered = filtered.filter(a => a.severity === params.severity);
                }

                // Type Filter
                if (params.type) {
                    filtered = filtered.filter(a => a.type === params.type);
                }
                
                // Year Filter
                if (params.year) {
                     filtered = filtered.filter(a => dayjs(a.date.split(' to ')[0]).year().toString() === params.year);
                }

                // Date Range Filter (from 'date' column with valueType: dateRange)
                if (params.date) {
                    const [start, end] = params.date;
                    const startUnix = dayjs(start).startOf('day').unix();
                    const endUnix = dayjs(end).endOf('day').unix();
                    
                    filtered = filtered.filter(a => {
                        const aDate = dayjs(a.date.split(' to ')[0]).unix();
                        return aDate >= startUnix && aDate <= endUnix;
                    });
                }

                // Keyword Search (if generic search needed, but we don't have one enabled yet)

                // 2. Sorting
                // Note: 'sort' object is like { date: 'ascend' }
                const sortField = Object.keys(sort)[0];
                const sortOrder = sortField ? sort[sortField] : undefined;

                if (sortField && sortOrder) {
                    filtered.sort((a, b) => {
                        let aVal: any = a[sortField as keyof Anomaly];
                        let bVal: any = b[sortField as keyof Anomaly];
                        
                        // Special handling for Date
                        if (sortField === 'date') {
                             aVal = dayjs(a.date.split(' to ')[0]).unix();
                             bVal = dayjs(b.date.split(' to ')[0]).unix();
                        }
                        
                        if (sortOrder === 'ascend') return aVal > bVal ? 1 : -1;
                        return aVal < bVal ? 1 : -1;
                    });
                }

                return {
                    data: filtered,
                    success: true,
                    total: filtered.length,
                };
            }}
            // Trigger request when anomalies data changes
            params={{ anomaliesStamp: anomalies.length }} 
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
                    valueType: 'dateRange', // Use Date Range Picker for searching
                    sorter: true, // Handled in request
                    render: (_, record) => {
                         const isRange = record.date.includes('to');
                         return (
                             <Space>
                                 {isRange ? <CalendarOutlined /> : null}
                                 {record.date}
                             </Space>
                         );
                    },
                    // We need to override search form to be dateRange, but display as text in table
                    search: {
                        transform: (value) => {
                            return { date: value };
                        },
                    },
                },
                {
                    title: 'Year',
                    dataIndex: 'year', // Virtual field for search
                    width: 80,
                    hideInTable: true, // We have date column
                    renderFormItem: () => {
                         // Build options dynamically
                         const years = Array.from(new Set(anomalies.map(a => dayjs(a.date.split(' to ')[0]).year()))).sort().reverse();
                         return (
                             <Select>
                                 {years.map(y => <Option key={y} value={y.toString()}>{y}</Option>)}
                             </Select>
                         );
                    }
                }, 
                {
                    title: 'Type',
                    dataIndex: 'type',
                    width: 120,
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
                    search: false,
                },
                {
                    title: 'Impact',
                    dataIndex: 'score',
                    width: 100,
                    search: false,
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
