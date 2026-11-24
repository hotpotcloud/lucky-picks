import { useEffect, useState } from 'react';
import { fetchAiAnalysis, fetchAiConfigured } from '../../api/client';
import type { AiAnalysisDto } from '../../api/types';

export const useAiPanelLogic = (game: string, window: number) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [result, setResult] = useState<AiAnalysisDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCancelled = false;
    void fetchAiConfigured()
      .then(({ available }) => {
        if (!isCancelled) {
          setIsAvailable(available);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsAvailable(false);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    try {
      setResult(await fetchAiAnalysis(game, window));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI 分析失败');
    } finally {
      setIsLoading(false);
    }
  };

  return { isAvailable, result, isLoading, error, handleGenerate };
};
