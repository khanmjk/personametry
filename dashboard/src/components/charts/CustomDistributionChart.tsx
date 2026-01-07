/**
 * CustomDistributionChart - Pure SVG histogram with normal distribution overlay
 * 
 * Framework-independent chart that renders histogram bars and normal distribution
 * curve in the same SVG coordinate space for perfect alignment.
 * 
 * Supports toggle between:
 * - Personal Pattern: curve based on user's actual mean and std dev
 * - Industry Standard: curve based on healthy work norms (8h mean, 1h std dev)
 */

import React, { useState } from 'react';
import { Card, Typography, Switch, Space } from 'antd';
import { WorkDistributionAnalysis } from '@/services/personametryService';

const { Title, Text } = Typography;

// Industry benchmark: 8-hour workday with typical 1-hour variation
const INDUSTRY_MEAN = 8;
const INDUSTRY_STD_DEV = 1;

interface CustomDistributionChartProps {
  data: WorkDistributionAnalysis;
  height?: number;
}

// Zone Logic - Aligned with SA Monthly Heatmap (175h/200h thresholds)
function getZone(hours: number): 'Light' | 'Normal' | 'Crunch' | 'Burnout' {
  if (hours < 6) return 'Light';
  if (hours < 10) return 'Normal';
  if (hours < 14) return 'Crunch';
  return 'Burnout';
}

// Zone configuration with colors
const ZONE_CONFIG = [
  { zone: 'Light', color: '#1890ff', label: 'Light (<6h)', desc: 'Light day' },
  { zone: 'Normal', color: '#52c41a', label: 'Normal (6-9h)', desc: 'Sustainable' },
  { zone: 'Crunch', color: '#faad14', label: 'Crunch (10-13h)', desc: 'Extended' },
  { zone: 'Burnout', color: '#f5222d', label: 'Burnout (>13h)', desc: 'Risk zone!' },
];

// Normal distribution PDF function
function normalPDF(x: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
  const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
  return coefficient * Math.exp(exponent);
}

// Reference curve mode type
type CurveMode = 'personal' | 'industry';

const CustomDistributionChart: React.FC<CustomDistributionChartProps> = ({ data, height = 400 }) => {
  // Toggle state for curve mode
  const [curveMode, setCurveMode] = useState<CurveMode>('personal');
  
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: { hours: string; count: number; zone: string; pct: string; desc: string };
  } | null>(null);

  // Safety check
  if (!data || !data.histogram || data.histogram.length === 0) {
    return (
      <Card title={<Title level={5}>Work Intensity Distribution</Title>} bordered={false}>
        <Text type="secondary">No work data available for this period.</Text>
      </Card>
    );
  }

  // Chart dimensions - use full available width
  const svgWidth = 900; // Wider viewBox for better use of card space
  const chartHeight = height - 80; // More height for chart
  const padding = { top: 30, right: 40, bottom: 55, left: 65 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Prepare data
  const totalDays = data.histogram.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.histogram
    .filter(d => d.count > 0)
    .map(d => {
      const zone = getZone(d.min + 0.5);
      const zoneInfo = ZONE_CONFIG.find(z => z.zone === zone);
      return {
        hours: d.min,
        count: d.count,
        zone,
        color: zoneInfo?.color || '#999',
        desc: zoneInfo?.desc || '',
      };
    });

  // Calculate scales
  const allHours = chartData.map(d => d.hours);
  const minHour = Math.min(...allHours);
  const maxHour = Math.max(...allHours);
  const maxCount = Math.max(...chartData.map(d => d.count));
  
  // Get curve parameters based on mode
  const curveMean = curveMode === 'personal' ? data.mean : INDUSTRY_MEAN;
  const curveStdDev = curveMode === 'personal' ? data.stdDev : INDUSTRY_STD_DEV;
  
  // Generate normal curve data with higher resolution
  const curvePoints: { x: number; y: number }[] = [];
  const curveStep = 0.2; // Fine resolution for smooth curve
  for (let h = minHour - 0.5; h <= maxHour + 1.5; h += curveStep) {
    const pdfValue = normalPDF(h, curveMean, curveStdDev);
    const expectedCount = totalDays * 1 * pdfValue; // Scale to histogram
    curvePoints.push({ x: h, y: expectedCount });
  }
  
  // Adjust Y max to accommodate both bars and curve
  const maxCurveY = Math.max(...curvePoints.map(p => p.y));
  const yMax = Math.ceil(Math.max(maxCount, maxCurveY) * 1.15);

  // Scale functions
  const barWidth = innerWidth / (maxHour - minHour + 2);
  const xScale = (hour: number) => (hour - minHour + 0.5) * barWidth;
  const yScale = (count: number) => innerHeight - (count / yMax) * innerHeight;

  // Generate SVG path for normal curve
  const curvePath = curvePoints
    .map((p, i) => {
      const x = xScale(p.x);
      const y = yScale(p.y);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Axis ticks
  const xTicks = chartData.map(d => d.hours);
  const yTicks = [0, Math.round(yMax / 4), Math.round(yMax / 2), Math.round(yMax * 3 / 4), yMax];

  const handleBarHover = (
    e: React.MouseEvent<SVGRectElement>,
    d: typeof chartData[0]
  ) => {
    const pct = totalDays > 0 ? ((d.count / totalDays) * 100).toFixed(1) : '0';
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: {
        hours: `${d.hours}h - ${d.hours + 1}h`,
        count: d.count,
        zone: d.zone,
        pct,
        desc: d.desc,
      },
    });
  };

  const handleBarLeave = () => {
    setTooltip(null);
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={5} style={{ margin: 0 }}>Work Intensity Distribution</Title>
          <Space size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>My Pattern</Text>
            <Switch 
              size="small"
              checked={curveMode === 'industry'}
              onChange={(checked) => setCurveMode(checked ? 'industry' : 'personal')}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Industry Standard</Text>
          </Space>
        </div>
      }
      bordered={false}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
    >
      {/* Main layout: Side panels + Chart */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
        
        {/* Left Panel - Dynamic based on mode */}
        <div style={{ 
          flex: '0 0 180px',
          background: curveMode === 'personal' 
            ? 'linear-gradient(135deg, #f6f8fc 0%, #eef2f7 100%)'
            : 'linear-gradient(135deg, #f0f9eb 0%, #e6f4e0 100%)',
          borderRadius: 8,
          padding: 16,
          fontSize: 12,
          color: '#595959',
        }}>
          {curveMode === 'personal' ? (
            <>
              <div style={{ fontWeight: 600, color: '#722ed1', marginBottom: 8, fontSize: 13 }}>
                📊 Your Pattern
              </div>
              <p style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>
                The <strong style={{ color: '#722ed1' }}>purple dashed curve</strong> shows 
                what a "normal" distribution looks like based on <strong>your</strong> average ({data.mean.toFixed(1)}h) 
                and variation (σ={data.stdDev.toFixed(1)}h).
              </p>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                ~68% of your days fall between{' '}
                {(data.mean - data.stdDev).toFixed(1)}h - {(data.mean + data.stdDev).toFixed(1)}h.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: '#52c41a', marginBottom: 8, fontSize: 13 }}>
                🏢 Industry Standard
              </div>
              <p style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>
                The <strong style={{ color: '#52c41a' }}>green dashed curve</strong> shows 
                what a healthy 8-hour workday distribution looks like (μ=8h, σ=1h).
              </p>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                This benchmark aligns with labor standards where 68% of days should be 7-9 hours.
              </p>
            </>
          )}
        </div>
        
        {/* Center - Chart */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
            {curveMode === 'personal' 
              ? <>Comparing your actual hours to <strong>your own typical pattern</strong>.</>
              : <>Comparing your actual hours to a <strong>healthy 8-hour standard</strong>.</>
            }
          </Text>
          
          {/* SVG Chart */}
          <svg
            width="100%"
            height={chartHeight}
            viewBox={`0 0 ${svgWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: 'visible', display: 'block' }}
          >
        <g transform={`translate(${padding.left},${padding.top})`}>
          {/* Y-axis gridlines */}
          {yTicks.map(tick => (
            <line
              key={`grid-${tick}`}
              x1={0}
              x2={innerWidth}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#f0f0f0"
              strokeWidth={1}
            />
          ))}

          {/* Histogram bars */}
          {chartData.map(d => (
            <rect
              key={d.hours}
              x={xScale(d.hours) - barWidth * 0.4}
              y={yScale(d.count)}
              width={barWidth * 0.8}
              height={innerHeight - yScale(d.count)}
              fill={d.color}
              rx={2}
              onMouseEnter={e => handleBarHover(e, d)}
              onMouseMove={e => handleBarHover(e, d)}
              onMouseLeave={handleBarLeave}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            />
          ))}

          {/* Bar labels */}
          {chartData.map(d => (
            <text
              key={`label-${d.hours}`}
              x={xScale(d.hours)}
              y={yScale(d.count) - 5}
              textAnchor="middle"
              fontSize={10}
              fill="#595959"
            >
              {d.count}
            </text>
          ))}

          {/* Normal distribution curve - rendered AFTER bars so it's on top */}
          <path
            d={curvePath}
            fill="none"
            stroke={curveMode === 'personal' ? '#722ed1' : '#52c41a'}
            strokeWidth={2.5}
            strokeDasharray="6,4"
            style={{ pointerEvents: 'none' }}
          />

          {/* X-axis */}
          <line
            x1={0}
            x2={innerWidth}
            y1={innerHeight}
            y2={innerHeight}
            stroke="#d9d9d9"
            strokeWidth={1}
          />

          {/* X-axis ticks and labels */}
          {xTicks.map(hour => (
            <g key={`x-${hour}`} transform={`translate(${xScale(hour)},${innerHeight})`}>
              <line y2={5} stroke="#d9d9d9" />
              <text y={20} textAnchor="middle" fontSize={11} fill="#595959">
                {hour}h
              </text>
            </g>
          ))}

          {/* X-axis title */}
          <text
            x={innerWidth / 2}
            y={innerHeight + 40}
            textAnchor="middle"
            fontSize={12}
            fill="#8c8c8c"
          >
            Daily Work Hours
          </text>

          {/* Y-axis */}
          <line
            x1={0}
            x2={0}
            y1={0}
            y2={innerHeight}
            stroke="#d9d9d9"
            strokeWidth={1}
          />

          {/* Y-axis ticks and labels */}
          {yTicks.map(tick => (
            <g key={`y-${tick}`} transform={`translate(0,${yScale(tick)})`}>
              <line x2={-5} stroke="#d9d9d9" />
              <text x={-10} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#595959">
                {tick}
              </text>
            </g>
          ))}

          {/* Y-axis title */}
          <text
            transform={`translate(-45,${innerHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={12}
            fill="#8c8c8c"
          >
            Frequency (Days)
          </text>
        </g>
      </svg>
          
          {/* Tooltip - inside center div but positioned fixed */}
          {tooltip?.visible && (
            <div
              style={{
                position: 'fixed',
                left: tooltip.x + 10,
                top: tooltip.y - 10,
                backgroundColor: 'rgba(0,0,0,0.85)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 4,
                fontSize: 12,
                pointerEvents: 'none',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{tooltip.content.hours}</div>
              <div>
                <span style={{ color: ZONE_CONFIG.find(z => z.zone === tooltip.content.zone)?.color }}>
                  ■
                </span>{' '}
                {tooltip.content.zone} Zone: {tooltip.content.count} days ({tooltip.content.pct}%)
              </div>
              <div style={{ color: '#d9d9d9', marginTop: 2 }}>{tooltip.content.desc}</div>
            </div>
          )}
        </div>
        
        {/* Right Panel - How to Interpret (dynamic based on mode) */}
        <div style={{ 
          flex: '0 0 180px',
          background: curveMode === 'personal'
            ? 'linear-gradient(135deg, #faf6fc 0%, #f2eef7 100%)'
            : 'linear-gradient(135deg, #f6fcf8 0%, #eef7f2 100%)',
          borderRadius: 8,
          padding: 16,
          fontSize: 12,
          color: '#595959',
        }}>
          {curveMode === 'personal' ? (
            <>
              <div style={{ fontWeight: 600, color: '#722ed1', marginBottom: 8, fontSize: 13 }}>
                🔍 Reading Your Pattern
              </div>
              <p style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>
                <strong>Bars above curve:</strong> You work these hours <em>more often</em> than 
                your typical random variation would suggest.
              </p>
              <p style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>
                <strong>Bars below curve:</strong> These hours occur <em>less often</em> than your pattern predicts.
              </p>
              <p style={{ margin: 0, lineHeight: 1.5, color: '#8c8c8c' }}>
                💡 Useful for spotting behavioral anomalies.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: '#52c41a', marginBottom: 8, fontSize: 13 }}>
                🔍 Health Check
              </div>
              <p style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>
                <strong>Bars left of curve:</strong> Great! You're working <em>fewer hours</em> than the standard.
              </p>
              <p style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>
                <strong>Bars right of curve:</strong> Caution - you're exceeding industry norms.
              </p>
              <p style={{ margin: 0, lineHeight: 1.5, color: '#faad14' }}>
                ⚠️ Heavy bars in <span style={{ color: '#f5222d' }}>Burnout</span> zone = risk!
              </p>
            </>
          )}
        </div>
        
      </div>

      {/* Legend - below the flex container */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center', fontSize: 12, flexWrap: 'wrap' }}>
        {ZONE_CONFIG.map(z => (
          <span key={z.zone} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, backgroundColor: z.color, borderRadius: 2 }} />
            {z.label}
          </span>
        ))}
        {/* Reference curve legend entry - color matches mode */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width={24} height={12}>
            <line 
              x1={0} y1={6} x2={24} y2={6} 
              stroke={curveMode === 'personal' ? '#722ed1' : '#52c41a'} 
              strokeWidth={2} 
              strokeDasharray="4,2" 
            />
          </svg>
          {curveMode === 'personal' ? 'My Pattern' : 'Industry Std.'}
        </span>
      </div>
    </Card>
  );
};

export default CustomDistributionChart;
