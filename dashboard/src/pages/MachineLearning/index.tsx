
import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Typography, Slider, Switch, Statistic, Divider, Alert, Spin, Collapse, Progress } from 'antd';
import { RobotOutlined, ThunderboltOutlined, SafetyCertificateOutlined, InfoCircleOutlined } from '@ant-design/icons';

import { Radar } from '@ant-design/charts';
import { MachineLearningService, RecommendationResult } from '@/services/ml/MachineLearningService';
import { loadTimeEntries, getDataSource } from '@/services/personametryService';
import { TimeEntry } from '@/models/personametry';

const { Text, Paragraph, Title } = Typography;
const { Panel } = Collapse;

const MachineLearningPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  // Cached Forecasts (Heavy Prep)
  const [baselines, setBaselines] = useState<{forecasts: any, history2025: Record<string, number>, readinessScore: number} | null>(null);
  // Live Result
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Optimization Controls State
  const [workCap, setWorkCap] = useState<number>(180); // Ceiling
  const [contractHours, setContractHours] = useState<number>(160); // Floor
  const [sleepTarget, setSleepTarget] = useState<number>(7.5);
  
  // Growth Targets (Percentage)
  const [familyGrowth, setFamilyGrowth] = useState<number>(10);
  const [husbandGrowth, setHusbandGrowth] = useState<number>(10); // NEW (P4)
  const [individualGrowth, setIndividualGrowth] = useState<number>(10); // Health & Self
  const [spiritualGrowth, setSpiritualGrowth] = useState<number>(0);
  // Removed Social slider

  const [ignoreReadiness, setIgnoreReadiness] = useState<boolean>(false);

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
        try {
            const source = getDataSource();
            const data = await loadTimeEntries(source);
            setEntries(data.entries);
            
            // Phase 1: Heavy Computation (Run once)
            const mlService = new MachineLearningService();
            const baseData = mlService.prepareBaselines(data.entries);
            setBaselines(baseData);
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  // Run Optimization (Lightweight - instant update)
  useEffect(() => {
    if (baselines) {
        const mlService = new MachineLearningService();
        const config = {
            hardConstraints: { 
                maxDailyHours: 24, 
                maxWorkHoursPerMonth: workCap,
                minWorkHoursPerMonth: contractHours 
            },
            softConstraints: { 
                targetSleepPerDay: sleepTarget, 
                familyTimeGrowth: 1 + (familyGrowth / 100),
                husbandTimeGrowth: 1 + (husbandGrowth / 100),
                individualTimeGrowth: 1 + (individualGrowth / 100),
                spiritualTimeGrowth: 1 + (spiritualGrowth / 100)
            }
        };

        let effectiveReadiness = baselines.readinessScore;
         if (ignoreReadiness) {
            effectiveReadiness = 1.0;
        }

        const optimizedProfile = mlService.optimizeProfile(baselines.forecasts, effectiveReadiness, config);
        
        setResult({
            forecasts: baselines.forecasts,
            readinessScore: effectiveReadiness,
            optimizedProfile
        });
    }
  }, [baselines, workCap, contractHours, familyGrowth, husbandGrowth, individualGrowth, spiritualGrowth, sleepTarget, ignoreReadiness]);

  // Removed old runOptimization function

  if (error) return <PageContainer><Alert type="error" message={error} /></PageContainer>;
  if (loading && !result) return <PageContainer><Spin size="large" /></PageContainer>;
  if (!result) return <PageContainer><Spin /></PageContainer>;

  // Helper for safe access
  const getBaseline = (key: string): number => {
      const f = result.forecasts[key];
      return f ? f.forecast.reduce((a, b) => a + b, 0) / 12 : 0; // Forecasting 2026
  };
  
  const get2025History = (key: string): number => {
      return baselines?.history2025[key] || 0;
  };

  // Data for Radar Chart - 3 Layers
  // Order: 2025 (Grey) -> Forecast (Blue) -> Optimized (Green)
  const rawData = [
      { name: 'Work', type: '2025 Actual', value: get2025History('P3 Professional') },
      { name: 'Work', type: '2026 Forecast', value: getBaseline('P3 Professional') },
      { name: 'Work', type: '2026 Optimized', value: result.optimizedProfile.work },
      
      { name: 'Sleep', type: '2025 Actual', value: get2025History('P0 Life Constraints (Sleep)') },
      { name: 'Sleep', type: '2026 Forecast', value: getBaseline('P0 Life Constraints (Sleep)') },
      { name: 'Sleep', type: '2026 Optimized', value: result.optimizedProfile.sleep },
      
      { name: 'Family', type: '2025 Actual', value: get2025History('P5 Family') },
      { name: 'Family', type: '2026 Forecast', value: getBaseline('P5 Family') },
      { name: 'Family', type: '2026 Optimized', value: result.optimizedProfile.family },
      
      { name: 'Husband', type: '2025 Actual', value: get2025History('P4 Husband') },
      { name: 'Husband', type: '2026 Forecast', value: getBaseline('P4 Husband') },
      { name: 'Husband', type: '2026 Optimized', value: result.optimizedProfile.husband },

      { name: 'Health', type: '2025 Actual', value: get2025History('P2 Individual') },
      { name: 'Health', type: '2026 Forecast', value: getBaseline('P2 Individual') },
      { name: 'Health', type: '2026 Optimized', value: result.optimizedProfile.individual },

      { name: 'Spiritual', type: '2025 Actual', value: get2025History('P1 Muslim') },
      { name: 'Spiritual', type: '2026 Forecast', value: getBaseline('P1 Muslim') },
      { name: 'Spiritual', type: '2026 Optimized', value: result.optimizedProfile.spiritual },
  ];

  // Specific Sort Order for Legend/Color Consistency
  const sortOrder = ['2025 Actual', '2026 Forecast', '2026 Optimized'];
  const radarData = rawData.sort((a, b) => sortOrder.indexOf(a.type) - sortOrder.indexOf(b.type));

  return (
    <PageContainer>
      <Row gutter={[16, 16]}>
        {/* Section A: Narrative & Readiness */}
        <Col span={24}>
           <Card bordered={false} style={{ marginBottom: 16 }}>
               <Row gutter={24} align="middle">
                   <Col flex="auto">
                       <Title level={4}><RobotOutlined style={{ color: '#1890ff' }} /> The Personametry Automator</Title>
                       <Paragraph type="secondary">
                           This engine uses 10 years of your data to perform 3 tasks:
                       </Paragraph>
                       <Collapse ghost>
                           <Panel header="How it works (Click to expand)" key="1">
                               <ul>
                                   <li><strong>The Oracle (Forecast)</strong>: Uses Holt-Winters smoothing to predict your "Business as Usual" for 2026 based on seasonal patterns.</li>
                                   <li><strong>The Solver (Optimization)</strong>: Uses Goal Programming to find the mathematically perfect schedule that meets your constraints (Work Contract, Sleep Targets) while maximizing your Growth Goals.</li>
                                   <li><strong>The Guardian (Readiness)</strong>: Monitors your recent sleep and burnout levels. If your Readiness Score is low, it automatically relaxes your growth targets to prevent crash.</li>
                               </ul>
                           </Panel>
                       </Collapse>
                   </Col>
                   <Col flex="300px">
                       <Card size="small" title="Readiness Score" extra={<Statistic value={Math.round(result.readinessScore * 100)} suffix="%" valueStyle={{ fontSize: 18, color: result.readinessScore > 0.7 ? '#3f8600' : '#cf1322' }} />}>
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span>Sleep Balance</span><span>90%</span></div>
                                <Progress percent={90} size="small" showInfo={false} strokeColor="#52c41a" />
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span>Work Load</span><span>{result.readinessScore > 0.5 ? '80%' : '40%'}</span></div>
                                <Progress percent={result.readinessScore > 0.5 ? 80 : 40} size="small" showInfo={false} strokeColor={result.readinessScore > 0.5 ? '#1890ff' : '#cf1322'} />
                            </div>
                            <div style={{ fontSize: 10, color: '#888', marginTop: 8 }}>
                                {result.readinessScore > 0.7 ? "You are primed for growth." : "Recover mode active. Goals reduced."}
                            </div>
                       </Card>
                   </Col>
               </Row>
           </Card>
        </Col>

        {/* Section B: The Lab (Controls) */}
        <Col xs={24} md={8}>
            <Card title={<><SafetyCertificateOutlined /> The Lab: Set Objectives</>} bordered={false}>
                
                <Divider>Realism Shortcuts</Divider>
                <div style={{ marginBottom: 16 }}>
                    <Text strong>Target Sleep (Hours/Day)</Text>
                    <Slider min={5} max={9} step={0.5} value={sleepTarget} onChange={setSleepTarget} marks={{6.5: '6.5h', 8: '8h'}} />
                </div>
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>Contracted Hours (Floor)</Text>
                        <Text strong style={{ color: '#1890ff' }}>{contractHours}h</Text>
                    </div>
                    <Slider 
                        min={0} 
                        max={175} 
                        marks={{ 0: '0h', 175: '175h' }}
                        value={contractHours} 
                        onChange={(v) => {
                            setContractHours(v);
                            if (v > workCap) setWorkCap(v); // Push ceiling up
                        }} 
                    />
                </div>
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <Text strong>Work Cap (Ceiling)</Text>
                         <Text strong style={{ color: '#1890ff' }}>{workCap}h</Text>
                    </div>
                    <Slider 
                        min={0} 
                        max={188} 
                        marks={{ 0: '0h', 188: '188h' }}
                        value={workCap} 
                        onChange={(v) => {
                            setWorkCap(v);
                            if (v < contractHours) setContractHours(v); // Push floor down
                        }} 
                    />
                </div>

                <Divider>Growth Targets</Divider>
                
                <Text strong>Husband Focus</Text>
                <Slider min={-20} max={50} value={husbandGrowth} onChange={setHusbandGrowth} tooltip={{ formatter: (v) => `${v}%` }} />
                
                <Text strong>Health & Self (Individual)</Text>
                <Slider min={-20} max={50} value={individualGrowth} onChange={setIndividualGrowth} tooltip={{ formatter: (v) => `${v}%` }} />
                
                <Text strong>Family Focus</Text>
                <Slider min={-20} max={50} value={familyGrowth} onChange={setFamilyGrowth} tooltip={{ formatter: (v) => `${v}%` }} />
                
                <Text strong>Spiritual Renewal</Text>
                <Slider min={-20} max={50} value={spiritualGrowth} onChange={setSpiritualGrowth} tooltip={{ formatter: (v) => `${v}%` }} />

                {/* Social removed from active optimization */}

                <Divider>Behavioral</Divider>
                <Row justify="space-between" align="middle">
                    <Text>Respect Readiness Score</Text>
                    <Switch checked={!ignoreReadiness} onChange={(v) => setIgnoreReadiness(!v)} />
                </Row>
            </Card>
        </Col>

        {/* Section C: The Blueprint (Result) */}
        <Col xs={24} md={16}>
             <Card title={<><ThunderboltOutlined /> The 2026 Optimized Profile</>} bordered={false}>
                <Row>
                    <Col span={24} style={{ height: 500 }}>
                        <Radar
                            data={radarData}
                            xField="name"
                            yField="value"
                            seriesField="type"
                            meta={{
                                value: {
                                    min: 0,
                                    alias: 'Hours/Month'
                                }
                            }}
                            // G2 v5 / WorkLifePie Pattern: Use 'scale' for visual channels
                            scale={{
                                color: {
                                    range: ['#bfbfbf', '#1890ff', '#52c41a']
                                }
                            }}
                            point={{ size: 4 }}
                            area={{
                                style: { fillOpacity: 0.25 },
                            }}
                            colorField="type" // Matches seriesField
                            legend={{ 
                                position: 'top',
                            }}
                        />
                    </Col>
                </Row>
                <Divider />
                <Row gutter={16}>
                    {[
                        { title: "Health Change", key: 'P2 Individual', target: result.optimizedProfile.individual },
                        { title: "Husband Change", key: 'P4 Husband', target: result.optimizedProfile.husband },
                        { title: "Family Change", key: 'P5 Family', target: result.optimizedProfile.family }
                    ].map(stat => {
                        const baseline = getBaseline(stat.key);
                        const delta = Math.round(stat.target - baseline);
                        const isPositive = delta >= 0;
                        return (
                            <Col span={8} key={stat.key}>
                                <Statistic 
                                    title={stat.title} 
                                    value={delta} 
                                    precision={0} 
                                    valueStyle={{ color: isPositive ? '#3f8600' : '#cf1322' }} 
                                    prefix={isPositive ? '+' : ''} 
                                    suffix="hrs/mo" 
                                />
                            </Col>
                        );
                    })}
                </Row>
             </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};



export default MachineLearningPage;
