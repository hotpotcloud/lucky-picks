/** 智能推荐：策略表单、结果展示与解释。 */

import { useState } from 'react';
import { Alert, Button, InputNumber, Segmented, Space, Tag, Typography } from 'antd';
import { apiPost, hasBackend } from '../../api/client';
import type { BetDto, RecommendationDto } from '../../api/types';
import type { DrawItem } from '../data/useDraws';
import NumberBall from '../picker/components/NumberBall';

/** 策略选项。 */
const STRATEGIES = [
  { label: '均衡', value: 'balanced' },
  { label: '热号', value: 'hot' },
  { label: '冷号', value: 'cold' },
  { label: '遗漏', value: 'omission' },
  { label: '综合', value: 'bayesian' },
];

/** 推荐面板属性。 */
interface RecommendPanelProps {
  game: string;
  draws: DrawItem[];
}

/**
 * 生成一注本地号码（离线模式下的简化策略）。
 * @param game 玩法
 * @param draws 历史数据
 * @param strategy 策略
 * @param seed 种子
 */
const localPick = (game: string, draws: DrawItem[], strategy: string, seed: number): BetDto => {
  const span = game === 'redblue' ? 33 : 35;
  const base = game === 'redblue' ? 6 : 5;
  const recent = draws.slice(-100);
  const counts = new Map<number, number>();
  recent.forEach((draw) => draw.main.forEach((number) => counts.set(number, (counts.get(number) ?? 0) + 1)));
  const weights = Array.from({ length: span }, (_, index) => {
    const count = counts.get(index + 1) ?? 0;
    if (strategy === 'hot') {
      return 1 + count * 0.2;
    }
    if (strategy === 'cold' || strategy === 'omission') {
      return 1 + (12 - Math.min(12, count)) * 0.15;
    }
    return 1 + Math.abs(count - (recent.length * base) / span) * -0.05;
  });
  let state = seed || 1;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const picked: number[] = [];
  while (picked.length < base) {
    let total = 0;
    const candidates = Array.from({ length: span }, (_, index) => index + 1).filter(
      (number) => !picked.includes(number),
    );
    candidates.forEach((number) => {
      total += weights[number - 1];
    });
    let threshold = random() * total;
    for (const number of candidates) {
      threshold -= weights[number - 1];
      if (threshold <= 0) {
        picked.push(number);
        break;
      }
    }
  }
  picked.sort((a, b) => a - b);
  return {
    mode: 'single',
    areas: [{ key: game === 'redblue' ? 'red' : 'front', numbers: picked, banker: [] }],
    combinations: 1,
    baseAmount: 2,
    additionalAmount: 0,
    totalAmount: 2,
    explanation: picked.map((number) => ({
      number,
      feature: strategy,
      weight: 1,
      value: weights[number - 1],
    })),
  };
};

/**
 * 推荐面板。
 * @param props 属性
 */
const RecommendPanel = ({ game, draws }: RecommendPanelProps) => {
  const [strategy, setStrategy] = useState('balanced');
  const [count, setCount] = useState(3);
  const [seed, setSeed] = useState<number | null>(null);
  const [bets, setBets] = useState<BetDto[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      if (hasBackend()) {
        const result = await apiPost<RecommendationDto>('/api/v1/recommendations', {
          game,
          mode: 'single',
          strategy,
          window: 100,
          count,
          seed: seed ?? undefined,
        });
        setBets(result.bets);
      } else {
        const baseSeed = seed ?? Math.floor(Math.random() * 1000000);
        setBets(
          Array.from({ length: count }, (_, index) =>
            localPick(game, draws, strategy, baseSeed + index),
          ),
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Segmented
        block
        options={STRATEGIES}
        value={strategy}
        onChange={(value) => setStrategy(String(value))}
      />
      <Space wrap>
        <Typography.Text>注数</Typography.Text>
        <InputNumber min={1} max={10} value={count} onChange={(value) => setCount(value ?? 3)} />
        <Typography.Text>种子</Typography.Text>
        <InputNumber
          min={1}
          placeholder="留空随机"
          value={seed ?? undefined}
          onChange={(value) => setSeed(value)}
        />
        <Button type="primary" loading={loading} onClick={() => void generate()}>
          生成推荐
        </Button>
      </Space>
      {error && <Alert type="error" showIcon message={error} />}
      {!hasBackend() && (
        <Alert type="info" showIcon message="离线模式：使用本地简化策略，结果仅供参考" />
      )}
      {bets.map((bet, index) => (
        <div className="ticket-row" key={index}>
          <Typography.Text type="secondary">{index + 1}.</Typography.Text>
          <Space wrap size={4}>
            {bet.areas.map((area) =>
              area.numbers.map((number) => (
                <NumberBall
                  key={`${area.key}-${number}`}
                  value={number}
                  color={area.key === 'red' || area.key === 'front' ? 'red' : 'blue'}
                />
              )),
            )}
          </Space>
          <Tag>{strategy}</Tag>
        </div>
      ))}
    </Space>
  );
};

export default RecommendPanel;
