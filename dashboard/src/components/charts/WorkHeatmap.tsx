import React from 'react';
import { Card, Tooltip } from 'antd';

interface WorkHeatmapProps {
  data: { year: number; month: number; hours: number }[];
  height?: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Red-Amber-Green color scale based on SA labour law (BCEA)
// Normal work: 45h/week = ~195h/month
// With overtime: 55h/week = ~238h/month max
// Green: <175h (healthy), Amber: 175-200h (approaching limit), Red: >200h (excessive)
const getColor = (hours: number): string => {
  if (hours < 175) {
    return '#52c41a'; // Green - healthy work-life balance
  } else if (hours <= 200) {
    return '#faad14'; // Amber - approaching legal limit
  } else {
    return '#f5222d'; // Red - excessive workload
  }
};

const WorkHeatmap: React.FC<WorkHeatmapProps> = ({ data, height = 530 }) => {
  // Get unique years sorted
  const years = [...new Set(data.map(d => d.year))].sort((a, b) => a - b);
  
  // Build a lookup map: year-month -> hours
  const dataMap = new Map<string, number>();
  let minHours = Infinity;
  let maxHours = -Infinity;
  
  for (const item of data) {
    const key = `${item.year}-${item.month}`;
    dataMap.set(key, item.hours);
    if (item.hours < minHours) minHours = item.hours;
    if (item.hours > maxHours) maxHours = item.hours;
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
    <Card title="Work Hours Heatmap" style={{ height }} bodyStyle={{ paddingBottom: '40px' }}>
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
              const hours = dataMap.get(`${year}-${monthIndex + 1}`);
              const hasData = hours !== undefined;
              const bgColor = hasData ? getColor(hours) : '#f5f5f5';
              const textColor = hasData ? '#fff' : '#ccc';
              
              return (
                <Tooltip 
                  key={`${year}-${monthIndex}`} 
                  title={hasData ? `${monthName} ${year}: ${Math.round(hours)}h` : 'No data'}
                >
                  <div style={{ 
                    ...cellStyle, 
                    backgroundColor: bgColor,
                    color: textColor,
                    cursor: 'pointer',
                  }}>
                    {hasData ? Math.round(hours) : '-'}
                  </div>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Color Legend */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end', 
        marginTop: '16px',
        fontSize: '11px',
        color: '#666',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '12px', backgroundColor: '#52c41a', borderRadius: '2px' }} />
          <span>&lt;175h</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '12px', backgroundColor: '#faad14', borderRadius: '2px' }} />
          <span>175-200h</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '12px', backgroundColor: '#f5222d', borderRadius: '2px' }} />
          <span>&gt;200h</span>
        </div>
      </div>
    </Card>
  );
};

export default WorkHeatmap;
