/** 智能推荐：策略表单、结果展示与解释。 */

import { useState } from 'react';
import { Alert, Button, InputNumber, Segmented, Space, Tag, Typography } from 'antd';
import { apiPost } from '../../api/client';
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
 * 推荐面板。
 * @param props 属性
 */
const RecommendPanel = ({ game }: RecommendPanelProps) => {
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
      const result = await apiPost<RecommendationDto>('/api/v1/recommendations', {
        game,
        mode: 'single',
        strategy,
        window: 100,
        count,
        seed: seed ?? undefined,
      });
      setBets(result.bets);
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
