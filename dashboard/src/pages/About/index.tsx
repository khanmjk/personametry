import React, { useEffect, useMemo, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  GithubOutlined,
  LinkedinOutlined,
  ReadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { BlogPost } from '@/models/about';
import { PERSONA_COLORS, PERSONA_SHORT_NAMES } from '@/models/personametry';
import { aboutService } from '@/services/aboutService';

const { Title, Text, Paragraph } = Typography;

const CARD_STYLE = {
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const BLOG_LABEL_URL = 'https://khanmjk-outlet.blogspot.com/search/label/personametry';
const GITHUB_URL = 'https://github.com/khanmjk';
const LINKEDIN_URL = 'https://www.linkedin.com/in/khanmjk/';

const PROFILE = {
  name: 'Mo Khan',
  title: 'Software & Engineering Leader | AI-First Development Advocate',
  summary:
    'Building Personametry with AI-assisted development practices. Exploring the intersection of traditional software engineering and modern AI tooling.',
  avatar:
    'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhWFOIBZbuZPwCogTfE_ByQjgYJp4ZVK8aeVlUgSUoc9-0N_gd09g7HAU7gMxmSKO2I-NHVu3-fRHNqqihUV-UMhETo1aKaeEYKWvUFS08WdB1BeW3dH0EH3FJ8PI7uwSqvxnXNElAuaQGsrAHe7Y8_4HqE2ppYMuvWY4zq-pCF_fjr4DsNwrPsz-BRWg/s150/IMG_20220705_145433.jpg',
};

const PERSONAMETRY_POINTS = [
  'A personal telemetry system built from 10+ years of time tracking (since 2015).',
  'Models life through seven personas to reveal balance, trade-offs, and trends.',
  'Designed for reflection, goal-setting, and honest year-over-year review.',
];

const DASHBOARD_HIGHLIGHTS = [
  'Executive summary cards for yearly and all-time performance.',
  'Persona deep dives across work, family, individual, and sleep.',
  'Trend analysis, gains/losses, and readiness experiments.',
  'Machine learning forecasts and optimization scenarios.',
];

const PERSONA_ORDER = [
  'P0 Life Constraints (Sleep)',
  'P1 Muslim',
  'P2 Individual',
  'P3 Professional',
  'P4 Husband',
  'P5 Family',
  'P6 Friend Social',
];

const formatDate = (value: string): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getTagTextColor = (hexColor: string): string => {
  const normalized = hexColor.replace('#', '');
  if (normalized.length !== 6) {
    return '#fff';
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1f1f1f' : '#ffffff';
};

const BlogCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <Card
    hoverable
    style={CARD_STYLE}
    cover={
      post.thumbnail ? (
        <img
          alt={post.title}
          src={post.thumbnail}
          style={{ height: 180, objectFit: 'cover' }}
        />
      ) : undefined
    }
  >
    <Space direction="vertical" size={6}>
      <Text type="secondary">{formatDate(post.published)}</Text>
      <Title level={5} style={{ margin: 0 }}>
        {post.title}
      </Title>
      <Paragraph ellipsis={{ rows: 3 }} style={{ marginBottom: 0 }}>
        {post.summary || 'Read the latest entry in the Personametry series.'}
      </Paragraph>
      <Button type="link" href={post.url} target="_blank" rel="noreferrer">
        Read Article →
      </Button>
    </Space>
  </Card>
);

const AboutPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const personaTags = useMemo(
    () =>
      PERSONA_ORDER.map((persona) => ({
        persona,
        label: PERSONA_SHORT_NAMES[persona] || persona,
        color: PERSONA_COLORS[persona] || '#0D7377',
      })),
    []
  );

  useEffect(() => {
    let active = true;
    const loadPosts = async () => {
      try {
        const data = await aboutService.getPersonametryPosts();
        if (active) {
          setPosts(data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load posts.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPosts();
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageContainer
      title="About"
      extra={[
        <Button
          key="blog"
          type="primary"
          icon={<ReadOutlined />}
          href={BLOG_LABEL_URL}
          target="_blank"
          rel="noreferrer"
        >
          Visit Blog
        </Button>,
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <ProCard style={CARD_STYLE}>
            <Row gutter={[24, 24]} align="middle">
              <Col flex="120px">
                <Avatar
                  size={96}
                  src={PROFILE.avatar}
                  icon={<UserOutlined />}
                />
              </Col>
              <Col flex="auto">
                <Title level={3} style={{ marginBottom: 0 }}>
                  {PROFILE.name}
                </Title>
                <Text type="secondary">{PROFILE.title}</Text>
                <Paragraph style={{ marginTop: 12, marginBottom: 12 }}>
                  {PROFILE.summary}
                </Paragraph>
                <Space wrap>
                  <Button icon={<ReadOutlined />} href={BLOG_LABEL_URL} target="_blank" rel="noreferrer">
                    Blog
                  </Button>
                  <Button icon={<GithubOutlined />} href={GITHUB_URL} target="_blank" rel="noreferrer">
                    GitHub
                  </Button>
                  <Button icon={<LinkedinOutlined />} href={LINKEDIN_URL} target="_blank" rel="noreferrer">
                    LinkedIn
                  </Button>
                </Space>
                <div style={{ marginTop: 12 }}>
                  <Space wrap>
                    {personaTags.map((tag) => {
                      const textColor = getTagTextColor(tag.color);
                      return (
                        <Tag
                          key={tag.persona}
                          style={{
                            backgroundColor: tag.color,
                            color: textColor,
                            border: 'none',
                          }}
                        >
                          {tag.label}
                        </Tag>
                      );
                    })}
                  </Space>
                </div>
              </Col>
            </Row>
          </ProCard>
        </Col>

        <Col xs={24} md={12}>
          <ProCard title="Personametry Concept" style={CARD_STYLE}>
            <Paragraph>
              Personametry is my personal analytics system for understanding how time is actually spent and
              where life needs rebalancing. It blends long-form time tracking with persona modeling to turn
              daily entries into honest narratives.
            </Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              "Your own personal dashboard of life. A complete personal assistant to help achieve a well-balanced
              life."
            </Paragraph>
            <Space direction="vertical" size={6}>
              {PERSONAMETRY_POINTS.map((point) => (
                <Text key={point}>• {point}</Text>
              ))}
            </Space>
          </ProCard>
        </Col>

        <Col xs={24} md={12}>
          <ProCard title="What You Can Explore" style={CARD_STYLE}>
            <Paragraph>
              The dashboard is built to surface patterns you can act on quickly, from high-level summaries to
              persona-specific deep dives.
            </Paragraph>
            <Space direction="vertical" size={6}>
              {DASHBOARD_HIGHLIGHTS.map((item) => (
                <Text key={item}>• {item}</Text>
              ))}
            </Space>
          </ProCard>
        </Col>

        <Col span={24}>
          <ProCard
            title="Personametry Articles"
            extra={
              <Button type="link" href={BLOG_LABEL_URL} target="_blank" rel="noreferrer">
                View all posts →
              </Button>
            }
            style={CARD_STYLE}
          >
            {loading && (
              <Row gutter={[16, 16]}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Col key={index} xs={24} md={12} lg={8}>
                    <Card loading style={CARD_STYLE} />
                  </Col>
                ))}
              </Row>
            )}

            {!loading && error && (
              <Alert
                type="warning"
                message="Blog posts unavailable"
                description={
                  <>
                    <div>{error}</div>
                    <div>
                      You can still browse the posts directly at{' '}
                      <a href={BLOG_LABEL_URL} target="_blank" rel="noreferrer">
                        the Personametry blog label
                      </a>
                      .
                    </div>
                  </>
                }
                showIcon
              />
            )}

            {!loading && !error && posts.length === 0 && (
              <Empty description="No Personametry posts found yet." />
            )}

            {!loading && !error && posts.length > 0 && (
              <Row gutter={[16, 16]}>
                {posts.map((post) => (
                  <Col key={post.id} xs={24} md={12} lg={8}>
                    <BlogCard post={post} />
                  </Col>
                ))}
              </Row>
            )}
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default AboutPage;
