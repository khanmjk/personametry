/**
 * Work-Life Balance Pie Chart
 * ---------------------------
 * Shows the distribution of time between Work, Life, and Sleep.
 */

import React from 'react';
import { Pie } from '@ant-design/charts';
import { Card, Tooltip, Badge } from 'antd';
import type { TimeEntry } from '@/models/personametry';
import { MetaWorkLife, META_WORK_LIFE_COLORS } from '@/models/personametry';
import { sumHours, filterByMetaWorkLife, formatHours } from '@/services/personametryService';

interface WorkLifePieProps {
  entries: TimeEntry[];
  title?: string;
  height?: number;
}

const WorkLifePie: React.FC<WorkLifePieProps> = ({
  entries,
  title = 'Work-Life Balance',
  height = 300,
}) => {
  // Calculate hours by MetaWorkLife category
  const workHours = sumHours(filterByMetaWorkLife(entries, MetaWorkLife.WORK));
  const lifeHours = sumHours(filterByMetaWorkLife(entries, MetaWorkLife.LIFE));
  const sleepHours = sumHours(filterByMetaWorkLife(entries, MetaWorkLife.SLEEP_LIFE));
  const totalHours = workHours + lifeHours + sleepHours;

  const data = [
    { type: 'Work', value: Math.round(workHours), color: META_WORK_LIFE_COLORS[MetaWorkLife.WORK] },
    { type: 'Life', value: Math.round(lifeHours), color: META_WORK_LIFE_COLORS[MetaWorkLife.LIFE] },
    { type: 'Sleep', value: Math.round(sleepHours), color: META_WORK_LIFE_COLORS[MetaWorkLife.SLEEP_LIFE] },
  ];

  // Calculate percentages
  const workPercent = totalHours > 0 ? ((workHours / totalHours) * 100).toFixed(1) : '0';
  const lifePercent = totalHours > 0 ? ((lifeHours / totalHours) * 100).toFixed(1) : '0';
  const sleepPercent = totalHours > 0 ? ((sleepHours / totalHours) * 100).toFixed(1) : '0';

  // Determine balance status
  const getBalanceStatus = (): { text: string; color: string } => {
    const workRatio = workHours / totalHours;
    // Ideal work ratio is around 25-30% (assuming 8-10 hrs work in 24hr day)
    if (workRatio < 0.20) return { text: 'EXCELLENT!', color: '#52c41a' };
    if (workRatio < 0.30) return { text: 'GOOD!', color: '#52c41a' };
    if (workRatio < 0.40) return { text: 'OKAY', color: '#faad14' };
    return { text: 'NEEDS ATTENTION', color: '#ff4d4f' };
  };

  const balanceStatus = getBalanceStatus();

  const config = {
    data,
    angleField: 'value',
    colorField: 'type',
    radius: 0.85,
    innerRadius: 0.6,
    height: height - 50,
    scale: { color: { range: data.map(d => d.color) } },
    label: {
      text: (datum: { type: string; value: number }) => {
        const pct = totalHours > 0 ? ((datum.value / totalHours) * 100).toFixed(0) : '0';
        return `${datum.type}\n${pct}%`;
      },
      style: {
        fontWeight: 'bold',
        fontSize: 12,
      },
    },
    legend: false as const,
    statistic: {
      title: {
        content: balanceStatus.text,
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          color: balanceStatus.color,
        },
      },
      content: {
        content: formatHours(totalHours) + ' hrs',
        style: {
          fontSize: '20px',
        },
      },
    },
    interactions: [{ type: 'element-active' }],
  };

  return (
    <Card
      title={
        <span>
          {title}
          <Tooltip title={`Work: ${workPercent}% | Life: ${lifePercent}% | Sleep: ${sleepPercent}%`}>
            <Badge
              status={balanceStatus.color === '#52c41a' ? 'success' : balanceStatus.color === '#faad14' ? 'warning' : 'error'}
              text={balanceStatus.text}
              style={{ marginLeft: 12 }}
            />
          </Tooltip>
        </span>
      }
      style={{ height }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <Pie {...config} />
        </div>
        <div style={{ width: 140 }}>
          {data.map((item) => (
            <div 
              key={item.type} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: item.color }} />
                <span style={{ fontSize: 13 }}>{item.type}</span>
              </span>
              <span style={{ fontSize: 12, color: '#666' }}>
                {totalHours > 0 ? Math.round((item.value / totalHours) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default WorkLifePie;
