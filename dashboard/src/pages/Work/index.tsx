import { PageContainer } from '@ant-design/pro-components';
import { Col, Row, Card, Statistic, Select } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  calculateWorkPatterns,
  loadTimeEntries,
  getAvailableYears,
  getDataSource,
  WorkPatternAnalysis,
} from '@/services/personametryService';
import WorkHeatmap from '@/components/charts/WorkHeatmap';
import LateNightChart from '@/components/charts/LateNightChart';
import StreakHistogram from '@/components/charts/StreakHistogram';
import { FireOutlined, ClockCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';

const WorkPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [fullAnalysis, setFullAnalysis] = useState<WorkPatternAnalysis | null>(null);
  const [yearAnalysis, setYearAnalysis] = useState<WorkPatternAnalysis | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [allEntries, setAllEntries] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        const entries = data.entries;
        setAllEntries(entries);
        
        const availableYears = getAvailableYears(entries);
        setYears(availableYears);
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
             setSelectedYear(availableYears[0]);
        }
        
        // 1. Full History for Heatmap
        const history = calculateWorkPatterns(entries); 
        setFullAnalysis(history);
        
        // 2. Initial Year Analysis
        const currentYear = availableYears.includes(selectedYear) ? selectedYear : availableYears[0];
        const yearly = calculateWorkPatterns(entries, currentYear);
        setYearAnalysis(yearly);
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
      if (allEntries.length > 0) {
          const yearly = calculateWorkPatterns(allEntries, selectedYear);
          setYearAnalysis(yearly);
      }
  }, [selectedYear, allEntries]);

  if (!fullAnalysis || !yearAnalysis) return null;

  return (
    <PageContainer
        extra={[
            <Select 
                key="year-select"
                value={selectedYear} 
                onChange={setSelectedYear} 
                style={{ width: 120 }}
                options={years.map(y => ({ label: y, value: y }))}
            />
        ]}
    >


      {/* KPI Row (Year Specific) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={`Late Days in ${selectedYear} (> 7 PM)`}
              value={yearAnalysis.stats.totalLateDays}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={`Max Streak in ${selectedYear} (Days)`}
              value={yearAnalysis.stats.maxStreakLength}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#d48806' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Avg Daily Hours"
              value={yearAnalysis.stats.avgDailyHours}
              precision={1}
              prefix={<ThunderboltOutlined />}
              suffix="h"
            />
          </Card>
        </Col>
      </Row>

      {/* Main Heatmap Row (History) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <WorkHeatmap data={fullAnalysis.workIntensityHeatmap} height={480} />
        </Col>
      </Row>

      {/* Detailed Analysis Row (Year Specific) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <LateNightChart data={yearAnalysis.lateDayFrequency.byDayOfWeek} height={350} />
        </Col>
        <Col xs={24} md={12}>
          {yearAnalysis && (
            <StreakHistogram 
              data={[
                ...yearAnalysis.workloadStreaks.highWorkload.map(s => ({ value: s.length, type: 'High Workload (>10h)' })),
                ...yearAnalysis.workloadStreaks.lateEnd.map(s => ({ value: s.length, type: 'Late End (>9pm)' }))
              ]} 
              height={350} 
            />
          )}
        </Col>
      </Row>
    </PageContainer>
  );
};

export default WorkPage;
