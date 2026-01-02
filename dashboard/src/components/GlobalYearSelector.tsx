/**
 * Global Year Selector Component
 * -------------------------------------------
 * Centered header component for selecting year globally.
 * Shows in all pages, persists selection across navigation.
 */

import React, { useEffect } from 'react';
import { Select, Space, Tag } from 'antd';
import { CalendarOutlined, GlobalOutlined } from '@ant-design/icons';
import { useYear, YearSelection } from '@/contexts/YearContext';
import { loadTimeEntries, getAvailableYears, getDataSource } from '@/services/personametryService';

const GlobalYearSelector: React.FC = () => {
  const { selectedYear, setSelectedYear, availableYears, setAvailableYears, isAllTime } = useYear();

  // Load available years on mount
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        const years = getAvailableYears(data.entries);
        setAvailableYears(years);
      } catch (error) {
        console.error('Failed to load available years:', error);
      }
    };
    fetchYears();
  }, [setAvailableYears]);

  // Build options: "All Time" + specific years
  const options = [
    { label: '🌍 All Time', value: 'ALL' as YearSelection },
    ...availableYears.map((year) => ({
      label: year.toString(),
      value: year as YearSelection,
    })),
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '8px 16px',
        background: isAllTime ? 'linear-gradient(135deg, #0D7377 0%, #14919B 100%)' : '#f5f5f5',
        borderRadius: 20,
        boxShadow: isAllTime ? '0 2px 8px rgba(13, 115, 119, 0.3)' : '0 1px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
      }}
    >
      {isAllTime ? (
        <GlobalOutlined style={{ fontSize: 16, color: '#fff' }} />
      ) : (
        <CalendarOutlined style={{ fontSize: 16, color: '#0D7377' }} />
      )}
      <Select
        value={selectedYear}
        onChange={setSelectedYear}
        options={options}
        style={{ minWidth: 120 }}
        bordered={false}
        dropdownStyle={{ minWidth: 140 }}
        suffixIcon={null}
        className={isAllTime ? 'year-selector-alltime' : 'year-selector-normal'}
      />
      {isAllTime && (
        <Tag color="#fff" style={{ color: '#0D7377', fontWeight: 600, margin: 0 }}>
          All Years
        </Tag>
      )}
    </div>
  );
};

export default GlobalYearSelector;
