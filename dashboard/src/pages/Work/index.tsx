import { PageContainer } from '@ant-design/pro-components';
import { Col, Row, Card, Statistic, Tag } from 'antd';
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
import { FireOutlined, ClockCircleOutlined, ThunderboltOutlined, GlobalOutlined } from '@ant-design/icons';
import { useYear } from '@/contexts/YearContext';

const WorkPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [fullAnalysis, setFullAnalysis] = useState<WorkPatternAnalysis | null>(null);
  const [yearAnalysis, setYearAnalysis] = useState<WorkPatternAnalysis | null>(null);
  const [allEntries, setAllEntries] = useState<any[]>([]);

  // Use global year context
  const { selectedYear, setAvailableYears, isAllTime } = useYear();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        const entries = data.entries;
        setAllEntries(entries);
        
        const availableYears = getAvailableYears(entries);
        setAvailableYears(availableYears);
        
        // 1. Full History for Heatmap (always computed)
        const history = calculateWorkPatterns(entries); 
        setFullAnalysis(history);
        
        // 2. Initial Year Analysis (if not All Time)
        if (!isAllTime && typeof selectedYear === 'number') {
          const yearly = calculateWorkPatterns(entries, selectedYear);
          setYearAnalysis(yearly);
        } else {
          setYearAnalysis(history);
        }
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [setAvailableYears]);

  // Recompute year analysis when selectedYear changes
  useEffect(() => {
    if (allEntries.length > 0) {
      if (isAllTime) {
        // All Time - use full analysis
        const history = calculateWorkPatterns(allEntries);
        setYearAnalysis(history);
      } else if (typeof selectedYear === 'number') {
        const yearly = calculateWorkPatterns(allEntries, selectedYear);
        setYearAnalysis(yearly);
      }
    }
  }, [selectedYear, allEntries, isAllTime]);

  if (!fullAnalysis || !yearAnalysis) return null;

  // Display suffix
  const titleSuffix = isAllTime ? 'All Time' : selectedYear.toString();

  // Check if we have data for the selected context
  const hasData = yearAnalysis.stats.avgDailyHours > 0 || yearAnalysis.stats.totalLateDays > 0;

  return (
    <PageContainer
      header={{
        title: (
          <span style={{ fontSize: 24, fontWeight: 600 }}>
            Work Patterns
            {isAllTime && <Tag color="#0D7377" icon={<GlobalOutlined />} style={{ marginLeft: 12 }}>All Time</Tag>}
          </span>
        ),
      }}
    >

      {/* KPI Row (Year Specific or All Time) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={`Late Days ${isAllTime ? '(All Time)' : `in ${selectedYear}`} (> 7 PM)`}
              value={yearAnalysis.stats.totalLateDays}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: hasData ? '#cf1322' : '#999' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={`Max Streak ${isAllTime ? '(All Time)' : `in ${selectedYear}`} (Days)`}
              value={yearAnalysis.stats.maxStreakLength}
              prefix={<FireOutlined />}
              valueStyle={{ color: hasData ? '#d48806' : '#999' }}
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
              valueStyle={{ color: hasData ? '#000' : '#999' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Empty State Message */}
      {!hasData && (
        <Row style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card>
               <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                 <ClockCircleOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                 <p style={{ fontSize: 16 }}>No work entries found for {selectedYear}.</p>
                 <p style={{ fontSize: 14 }}>Enjoy the break! 🏖️</p>
               </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Heatmap Row (Filtered by Year unless All Time) */}
      {hasData && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <WorkHeatmap 
              data={isAllTime ? fullAnalysis.workIntensityHeatmap : yearAnalysis.workIntensityHeatmap} 
              height={480} 
            />
          </Col>
        </Row>
      )}

      {/* Detailed Analysis Row (Year Specific or All Time) */}
      {hasData && (
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
      )}
    </PageContainer>
  );
};

export default WorkPage;
