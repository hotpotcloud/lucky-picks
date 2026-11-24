/** 轻量分析视图：频率柱图、遗漏表、号码走势。 */

import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DrawItem, StatsResult } from './useDraws';

/** 频率柱状图属性。 */
interface FrequencyChartProps {
  stats: StatsResult;
}

/**
 * 频率柱状图（纯 SVG，不引入图表库）。
 * @param props 属性
 */
export const FrequencyChart = ({ stats }: FrequencyChartProps) => {
  const max = Math.max(...stats.metrics.map((item) => item.count), 1);
  const bars = stats.metrics.map((item) => {
    const height = (item.count / max) * 100;
    return (
      <rect
        key={item.number}
        x={(item.number - 1) * 12 + 2}
        y={110 - height}
        width={9}
        height={height}
        fill={item.zScore > 0.5 ? '#cf1322' : item.zScore < -0.5 ? '#1677ff' : '#bfbfbf'}
      />
    );
  });
  return (
    <div>
      <svg viewBox="0 0 400 120" width="100%" height="140" role="img" aria-label="号码频率分布">
        {bars}
        <line x1="0" y1="110" x2="400" y2="110" stroke="#d9d9d9" />
      </svg>
      <Typography.Text type="secondary">
        红色为高于期望的红球，蓝色为低于期望的红球（仅描述历史分布）
      </Typography.Text>
    </div>
  );
};

/** 遗漏表属性。 */
interface OmissionTableProps {
  stats: StatsResult;
}

/** 遗漏表行。 */
interface OmissionRow {
  number: number;
  count: number;
  omission: number;
  zScore: number;
  state: string;
}

/**
 * 冷热与遗漏表。
 * @param props 属性
 */
export const OmissionTable = ({ stats }: OmissionTableProps) => {
  const rows: OmissionRow[] = stats.metrics.map((item) => ({
    number: item.number,
    count: item.count,
    omission: item.omission,
    zScore: Math.round(item.zScore * 100) / 100,
    state: item.zScore > 0.5 ? '热号' : item.zScore < -0.5 ? '冷号' : '常态',
  }));
  const columns: ColumnsType<OmissionRow> = [
    { title: '号码', dataIndex: 'number', key: 'number', width: 70 },
    { title: '出现次数', dataIndex: 'count', key: 'count', width: 90 },
    { title: '当前遗漏', dataIndex: 'omission', key: 'omission', width: 90 },
    { title: 'z 分数', dataIndex: 'zScore', key: 'zScore', width: 90 },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      render: (value: string) => (
        <Tag color={value === '热号' ? 'red' : value === '冷号' ? 'blue' : 'default'}>{value}</Tag>
      ),
    },
  ];
  return (
    <Table<OmissionRow>
      size="small"
      columns={columns}
      dataSource={rows}
      rowKey="number"
      pagination={{ pageSize: 10 }}
      scroll={{ y: 360 }}
    />
  );
};

/** 走势表格属性。 */
interface TrendGridProps {
  draws: DrawItem[];
}

/**
 * 近期号码走势（最后 20 期）。
 * @param props 属性
 */
export const TrendGrid = ({ draws }: TrendGridProps) => {
  const recent = draws.slice(-20).reverse();
  return (
    <div className="trend-grid">
      {recent.map((draw) => (
        <div className="trend-row" key={draw.issue}>
          <span className="trend-issue">{draw.issue}</span>
          {Array.from({ length: 33 }, (_, index) => index + 1).map((number) => (
            <span
              key={number}
              className={draw.main.includes(number) ? 'trend-hit' : 'trend-cell'}
              title={draw.main.includes(number) ? String(number) : undefined}
            >
              {draw.main.includes(number) ? number : ''}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};
