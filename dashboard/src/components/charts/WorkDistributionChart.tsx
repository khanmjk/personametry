/**
 * WorkDistributionChart - Histogram of Daily Work Hours with Zone Coloring
 * 
 * Uses G2 v5 scale.color.range for reliable zone-to-color mapping.
 */

import React from 'react';
import { Column } from '@ant-design/charts';
import { Card, Typography } from 'antd';
import { WorkDistributionAnalysis } from '@/services/personametryService';

const { Title, Text } = Typography;

interface WorkDistributionChartProps {
  data: WorkDistributionAnalysis;
  height?: number;
}

// Zone Logic - Aligned with SA Monthly Heatmap (175h/200h thresholds)
// Monthly thresholds: <175h Normal, 175-200h Crunch, >200h Burnout
// Standard working days/month: 52 weeks × 5 days ÷ 12 = 21.67 days (HR standard)
// Daily equivalents: 175h/21.67 = 8.08h, 200h/21.67 = 9.23h
// Rounded thresholds: Normal <10h, Crunch 10-13h, Burnout >13h
function getZone(hours: number): 'Light' | 'Normal' | 'Crunch' | 'Burnout' {
  if (hours < 6) return 'Light';
  if (hours < 10) return 'Normal';  // 6-9h = sustainable (<175h/month)
  if (hours < 14) return 'Crunch';  // 10-13h = extended (175-200h/month)
  return 'Burnout';                  // 14h+ = burnout (>200h/month)
}

// Zone to Color mapping - FIXED ORDER with SHORT descriptions for tooltip
// Matches SA monthly heatmap: Green < 175h, Amber 175-200h, Red > 200h
const ZONE_CONFIG = [
  { zone: 'Light', color: '#1890ff', label: 'Light (<6h)', desc: 'Light day' },
  { zone: 'Normal', color: '#52c41a', label: 'Normal (6-9h)', desc: 'Sustainable' },
  { zone: 'Crunch', color: '#faad14', label: 'Crunch (10-13h)', desc: 'Extended' },
  { zone: 'Burnout', color: '#f5222d', label: 'Burnout (>13h)', desc: 'Risk zone!' },
];

const WorkDistributionChart: React.FC<WorkDistributionChartProps> = ({ data, height = 400 }) => {
  // Safety check for empty data
  if (!data || !data.histogram || data.histogram.length === 0) {
    return (
      <Card title={<Title level={5}>Work Intensity Distribution</Title>} bordered={false}>
        <Text type="secondary">No work data available for this period.</Text>
      </Card>
    );
  }

  // Calculate total days for percentage
  const totalDays = data.histogram.reduce((sum, d) => sum + d.count, 0);

  // Helper to get zone info
  const getZoneInfo = (zone: string) => ZONE_CONFIG.find(z => z.zone === zone);

  // Transform data: include zone AND description directly for tooltip access
  const chartData = data.histogram
    .filter(d => d.count > 0)
    .map(d => {
      const zone = getZone(d.min + 0.5);
      const zoneInfo = getZoneInfo(zone);
      return {
        hours: String(d.min),
        hoursNum: d.min,
        count: d.count,
        zone: zone,
        zoneColor: zoneInfo?.color || '#999',
        zoneDesc: zoneInfo?.desc || '',
      };
    });

  // G2 v5 scale configuration for reliable color mapping
  const zoneOrder = ZONE_CONFIG.map(z => z.zone);
  const colorRange = ZONE_CONFIG.map(z => z.color);

  const config = {
    data: chartData,
    xField: 'hours',
    yField: 'count',
    colorField: 'zone',
    height: height - 120,
    autoFit: true,
    legend: false, // We use custom legend
    // G2 v5: Use scale.color for reliable categorical color mapping
    scale: {
      color: {
        domain: zoneOrder,
        range: colorRange,
      },
    },
    label: {
      position: 'top' as const,
      style: {
        fill: '#595959',
        fontSize: 10,
      },
      content: (item: { count: number }) => item.count > 0 ? String(item.count) : '',
    },
    xAxis: {
      title: { text: 'Daily Work Hours' },
      label: {
        formatter: (val: string) => `${val}h`,
      },
    },
    yAxis: {
      title: { text: 'Frequency (Days)' },
    },
    tooltip: {
      title: (d: { hours: string }) => `${d.hours}h - ${Number(d.hours) + 1}h range`,
      items: [(d: { hours: string; count: number; zone: string; zoneDesc: string }) => {
        const pct = totalDays > 0 ? ((d.count / totalDays) * 100).toFixed(1) : '0';
        return {
          name: `${d.zone} Zone`,
          value: `${d.count} days (${pct}%) - ${d.zoneDesc}`,
        };
      }],
    },
  };

  return (
    <Card 
      title={<Title level={5}>Work Intensity Distribution</Title>} 
      bordered={false} 
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Are you burning out or in the flow? This histogram shows how your work hours stack up.
      </Text>
      
      <Column {...config} />
      
      {/* Custom Zone Legend - colors match ZONE_CONFIG exactly */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center', fontSize: 12, flexWrap: 'wrap' }}>
        {ZONE_CONFIG.map(z => (
          <div key={z.zone} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'block', width: 12, height: 12, background: z.color, borderRadius: 2 }}></span>
            {z.label}
          </div>
        ))}
      </div>

      {/* Stats Footer */}
      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: '#8c8c8c' }}>
        Mean: <strong>{data.mean.toFixed(1)}h</strong> | Std Dev: <strong>{data.stdDev.toFixed(1)}h</strong>
      </div>
    </Card>
  );
};

export default WorkDistributionChart;
