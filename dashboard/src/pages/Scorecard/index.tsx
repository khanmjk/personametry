/**
 * Scorecard Page - RAGE Executive Scorecard
 * ------------------------------------------
 * Goal tracking with RAG status indicators.
 */

import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Row, Col, Spin, Alert, Select, Table, Typography, Progress, Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import type { TimeEntry } from '@/models/personametry';
import { PERSONA_COLORS, PERSONA_SHORT_NAMES, STATUS_COLORS } from '@/models/personametry';
import {
  loadTimeEntries,
  getAvailableYears,
  groupByPersona,
  filterByYear,
  formatHours,
  getDataSource,
} from '@/services/personametryService';

const { Title, Text } = Typography;

const CARD_STYLE = {
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

// Target hours per year (adjustable goals)
const PERSONA_GOALS: Record<string, number> = {
  'P0 Life Constraints (Sleep)': 2920,
  'P1 Muslim': 730,
  'P2 Individual': 1095,
  'P3 Professional': 2080,
  'P4 Husband': 730,
  'P5 Family': 1825,
  'P6 Friend Social': 365,
};

const getRAGStatus = (actual: number, goal: number): 'success' | 'warning' | 'error' => {
  const ratio = actual / goal;
  if (ratio >= 0.9) return 'success';
  if (ratio >= 0.7) return 'warning';
  return 'error';
};

const ScorecardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2022);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const source = getDataSource();
        const data = await loadTimeEntries(source);
        setEntries(data.entries);
        const years = getAvailableYears(data.entries);
        setAvailableYears(years);
        setSelectedYear(years[0] || 2022);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const yearEntries = filterByYear(entries, selectedYear);
  const personaSummaries = groupByPersona(yearEntries);

  const scorecardData = personaSummaries.map((summary, index) => {
    const goal = PERSONA_GOALS[summary.persona] || 1000;
    const achievement = (summary.totalHours / goal) * 100;
    const status = getRAGStatus(summary.totalHours, goal);

    return {
      key: summary.persona,
      rank: index + 1,
      persona: summary.persona,
      shortName: PERSONA_SHORT_NAMES[summary.persona],
      actual: summary.totalHours,
      goal,
      achievement: Math.min(Math.round(achievement), 150),
      status,
      delta: summary.totalHours - goal,
    };
  });

  const greenCount = scorecardData.filter((d) => d.status === 'success').length;
  const amberCount = scorecardData.filter((d) => d.status === 'warning').length;
  const redCount = scorecardData.filter((d) => d.status === 'error').length;

  const columns = [
    {
      title: 'Persona',
      dataIndex: 'shortName',
      key: 'persona',
      render: (name: string, record: typeof scorecardData[0]) => (
        <Space>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: PERSONA_COLORS[record.persona],
            }}
          />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Actual',
      dataIndex: 'actual',
      key: 'actual',
      align: 'right' as const,
      render: (hours: number) => <Text strong>{formatHours(hours)} hrs</Text>,
    },
    {
      title: 'Goal',
      dataIndex: 'goal',
      key: 'goal',
      align: 'right' as const,
      render: (hours: number) => <Text type="secondary">{formatHours(hours)} hrs</Text>,
    },
    {
      title: 'Achievement',
      dataIndex: 'achievement',
      key: 'achievement',
      width: 200,
      render: (pct: number, record: typeof scorecardData[0]) => (
        <Progress
          percent={Math.min(pct, 100)}
          strokeColor={
            record.status === 'success'
              ? STATUS_COLORS.success
              : record.status === 'warning'
              ? STATUS_COLORS.warning
              : STATUS_COLORS.error
          }
          format={() => `${pct}%`}
          size="small"
        />
      ),
    },
    {
      title: 'Delta',
      dataIndex: 'delta',
      key: 'delta',
      align: 'right' as const,
      render: (delta: number) => (
        <Text style={{ color: delta >= 0 ? STATUS_COLORS.success : STATUS_COLORS.error, fontWeight: 500 }}>
          {delta >= 0 ? '+' : ''}
          {formatHours(delta)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: 'success' | 'warning' | 'error') => {
        if (status === 'success')
          return <CheckCircleOutlined style={{ color: STATUS_COLORS.success, fontSize: 20 }} />;
        if (status === 'warning')
          return <MinusCircleOutlined style={{ color: STATUS_COLORS.warning, fontSize: 20 }} />;
        return <CloseCircleOutlined style={{ color: STATUS_COLORS.error, fontSize: 20 }} />;
      },
    },
  ];

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>Loading scorecard...</Text>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert type="error" message="Unable to Load Data" description={error} showIcon />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{
        title: <span style={{ fontSize: 24, fontWeight: 600 }}>RAGE Scorecard</span>,
        extra: [
          <Select
            key="year"
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 90 }}
            options={availableYears.map((y) => ({ label: y.toString(), value: y }))}
          />,
        ],
      }}
    >
      {/* RAG Summary */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={8}>
          <ProCard style={{ ...CARD_STYLE, borderTop: `4px solid ${STATUS_COLORS.success}` }}>
            <div style={{ textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: 32, color: STATUS_COLORS.success }} />
              <div style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 28, fontWeight: 600, color: STATUS_COLORS.success }}>{greenCount}</Text>
                <Text type="secondary"> / {scorecardData.length}</Text>
              </div>
              <Text strong>On Track</Text>
            </div>
          </ProCard>
        </Col>
        <Col xs={24} sm={8}>
          <ProCard style={{ ...CARD_STYLE, borderTop: `4px solid ${STATUS_COLORS.warning}` }}>
            <div style={{ textAlign: 'center' }}>
              <MinusCircleOutlined style={{ fontSize: 32, color: STATUS_COLORS.warning }} />
              <div style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 28, fontWeight: 600, color: STATUS_COLORS.warning }}>{amberCount}</Text>
                <Text type="secondary"> / {scorecardData.length}</Text>
              </div>
              <Text strong>Needs Attention</Text>
            </div>
          </ProCard>
        </Col>
        <Col xs={24} sm={8}>
          <ProCard style={{ ...CARD_STYLE, borderTop: `4px solid ${STATUS_COLORS.error}` }}>
            <div style={{ textAlign: 'center' }}>
              <CloseCircleOutlined style={{ fontSize: 32, color: STATUS_COLORS.error }} />
              <div style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 28, fontWeight: 600, color: STATUS_COLORS.error }}>{redCount}</Text>
                <Text type="secondary"> / {scorecardData.length}</Text>
              </div>
              <Text strong>Off Track</Text>
            </div>
          </ProCard>
        </Col>
      </Row>

      {/* Scorecard Table */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <ProCard
            title={<Title level={5} style={{ margin: 0 }}>Goals Achievement ({selectedYear})</Title>}
            style={CARD_STYLE}
          >
            <Table
              dataSource={scorecardData}
              columns={columns}
              pagination={false}
              rowClassName={(record) =>
                record.status === 'success'
                  ? ''
                  : record.status === 'warning'
                  ? ''
                  : ''
              }
              style={{ marginTop: 8 }}
            />
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default ScorecardPage;
