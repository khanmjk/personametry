import React from 'react';
import { Card, Tooltip } from 'antd';

interface SleepHeatmapProps {
  data: { year: number; month: number; hours: number; days: number }[];
  height?: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Colors for Sleep Health (Avg Daily Hours)
// < 6.0: Red (Severe Deprivation)
// 6.0 - 7.0: Amber (Mild Deprivation)
// 7.0+: Green (Healthy)
const getColor = (avgHours: number): string => {
  if (avgHours < 6.0) return '#f5222d'; // Red
  if (avgHours < 7.0) return '#faad14'; // Amber
  return '#52c41a'; // Green
};

const SleepHeatmap: React.FC<SleepHeatmapProps> = ({ data, height = 530 }) => {
  // Get unique years sorted
  const years = [...new Set(data.map(d => d.year))].sort((a, b) => a - b);
  
  // Build a lookup map: year-month -> {hours, days}
  const dataMap = new Map<string, { hours: number; days: number }>();
  
  for (const item of data) {
    const key = `${item.year}-${item.month}`;
    dataMap.set(key, { hours: item.hours, days: item.days });
  }

  // Grid styling
  const cellStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    border: '2px solid #fff',
    minHeight: '28px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 500,
    color: '#666',
    minHeight: '28px',
  };

  return (
    <Card 
      title="Sleep Health Heatmap (Avg Hours/Day)" 
      style={{ height }} 
      bodyStyle={{ paddingBottom: '40px' }}
      extra={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          fontSize: '11px',
          color: '#666',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '16px', height: '12px', backgroundColor: '#52c41a', borderRadius: '2px' }} />
            <span>&gt;7.0h</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '16px', height: '12px', backgroundColor: '#faad14', borderRadius: '2px' }} />
            <span>6.0-7.0h</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '16px', height: '12px', backgroundColor: '#f5222d', borderRadius: '2px' }} />
            <span>&lt;6.0h</span>
          </div>
        </div>
      }
    >
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `60px repeat(${years.length}, 1fr)`,
        gap: '0',
        marginTop: '10px'
      }}>
        {/* Header Row: Empty + Years */}
        <div style={headerStyle}>Month</div>
        {years.map(year => (
          <div key={year} style={headerStyle}>{year}</div>
        ))}

        {/* Data Rows: Month Label + Cells */}
        {MONTH_NAMES.map((monthName, monthIndex) => (
          <React.Fragment key={monthName}>
            <div style={headerStyle}>{monthName}</div>
            {years.map(year => {
              const item = dataMap.get(`${year}-${monthIndex + 1}`);
              const hasData = item !== undefined && item.days > 0;
              
              let avg = 0;
              let bgColor = '#f0f0f0'; // Default gray for no data
              let textColor = '#ccc';

              if (hasData) {
                avg = item!.hours / item!.days;
                bgColor = getColor(avg);
                textColor = '#fff';
              }
              
              return (
                <Tooltip 
                  key={`${year}-${monthIndex}`} 
                  title={hasData 
                    ? `${monthName} ${year}: ${avg.toFixed(1)}h avg (${Math.round(item!.hours)} total)` 
                    : `${monthName} ${year}: No data`
                  }
                >
                  <div style={{ 
                    ...cellStyle, 
                    backgroundColor: bgColor,
                    color: textColor,
                    cursor: hasData ? 'pointer' : 'default',
                  }}>
                    {hasData ? avg.toFixed(1) : '-'}
                  </div>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};

export default SleepHeatmap;
