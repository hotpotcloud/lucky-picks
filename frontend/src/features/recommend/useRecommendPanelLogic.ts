import { useState } from 'react';
import { apiPost } from '../../api/client';
import type { BetDto, RecommendationDto } from '../../api/types';

const DEFAULT_COUNT = 3;

export const useRecommendPanelLogic = (game: string) => {
  const [strategy, setStrategy] = useState('balanced');
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [seed, setSeed] = useState<number | null>(null);
  const [bets, setBets] = useState<BetDto[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCountChange = (value: number) => {
    setCount(value ? Math.min(10, Math.max(1, value)) : DEFAULT_COUNT);
  };

  const handleSeedChange = (value: string) => {
    setSeed(value === '' ? null : Math.max(1, Number(value)));
  };

  const handleGenerate = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return {
    strategy,
    count,
    seed,
    bets,
    error,
    isLoading,
    setStrategy,
    handleCountChange,
    handleSeedChange,
    handleGenerate,
  };
};
