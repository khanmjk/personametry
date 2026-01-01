import { PageContainer } from '@ant-design/pro-components';
import { Col, Row, Card, Statistic, Select, Space, Alert } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  calculateWorkPatterns,
  getAllEntries,
  getAvailableYears,
  WorkPatternAnalysis,
} from '@/services/personametryService';
import WorkHeatmap from '@/components/charts/WorkHeatmap';
import LateNightChart from '@/components/charts/LateNightChart';
import StreakHistogram from '@/components/charts/StreakHistogram';
import { FireOutlined, ClockCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';

const WorkPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [analysis, setAnalysis] = useState<WorkPatternAnalysis | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const entries = await getAllEntries();
        const availableYears = getAvailableYears(entries);
        setYears(availableYears);
        
        // Calculate patterns for selected year
        // Note: Heatmap usually wants ALL time, but let's pass selectedYear for filtering late days/streaks
        // Actually, let's calculate global patterns for the heatmap and year-specific for others if needed.
        // For now, let's pass 'undefined' to get ALL years for the heatmap context, 
        // or filter locally. The service method filters by year if provided.
        // Let's get ALL data first to support the multi-year heatmap.
        
        const fullAnalysis = calculateWorkPatterns(entries); 
        setAnalysis(fullAnalysis);
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Recalculate if we want year-specific filtering on client side, 
  // currently we fetched GLOBAL analysis. 
  // Let's filter specific metrics for the "current year view" if needed.
  
  if (!analysis) return null;

  return (
    <PageContainer>
       <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
           <Alert 
             message="Professional Persona Analysis" 
             description="Filtered strictly for 'P3 Professional' activities. Analyzing intensity, sustainability, and burnout patterns."
             type="info" 
             showIcon 
           />
        </Col>
      </Row>

      {/* KPI Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Late Days (> 7 PM)"
              value={analysis.stats.totalLateDays}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Max Work Streak (Days)"
              value={analysis.stats.maxStreakLength}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#d48806' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Avg Daily Hours"
              value={analysis.stats.avgDailyHours}
              precision={1}
              prefix={<ThunderboltOutlined />}
              suffix="h"
            />
          </Card>
        </Col>
      </Row>

      {/* Main Heatmap Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <WorkHeatmap data={analysis.workIntensityHeatmap} height={350} />
        </Col>
      </Row>

      {/* Detailed Analysis Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <LateNightChart data={analysis.lateDayFrequency.byDayOfWeek} height={350} />
        </Col>
        <Col xs={24} md={12}>
          {analysis && (
            <StreakHistogram 
              data={[
                ...analysis.workloadStreaks.highWorkload.map(s => ({ value: s.length, type: 'High Workload (>10h)' })),
                ...analysis.workloadStreaks.lateEnd.map(s => ({ value: s.length, type: 'Late End (>9pm)' }))
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
