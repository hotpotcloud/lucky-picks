/** AI 分析面板：调用后端 deepseek-v4.1-flash 生成统计解读。 */

import { useEffect, useState } from 'react';
import { Alert, Button, Spin, Tag } from 'antd';
import { Sparkles } from 'lucide-react';
import { fetchAiAnalysis, fetchAiConfigured } from '../../api/client';
import type { AiAnalysisDto } from '../../api/types';

/** AI 面板属性。 */
interface AiPanelProps {
  game: string;
  window: number;
}

/**
 * AI 分析面板。
 * @param props 属性
 */
const AiPanel = ({ game, window }: AiPanelProps) => {
  const [available, setAvailable] = useState(false);
  const [result, setResult] = useState<AiAnalysisDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetchAiConfigured()
      .then((value) => {
        if (!cancelled) {
          setAvailable(value.available);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailable(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await fetchAiAnalysis(game, window));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI 分析失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-head">
        <Sparkles size={18} strokeWidth={1.5} />
        <strong>AI 分析</strong>
        <Tag color="cyan">deepseek-v4.1-flash</Tag>
      </div>
      {!available && <Alert type="warning" showIcon message="服务端 AI 未配置" />}
      <Button type="primary" loading={loading} disabled={!available} onClick={() => void generate()}>
        生成 AI 分析
      </Button>
      {error && <Alert type="error" showIcon message={error} />}
      {loading && <Spin />}
      {result && (
        <div className="ai-result">
          <p>{result.content}</p>
          <small>{result.disclaimer}</small>
        </div>
      )}
    </div>
  );
};

export default AiPanel;
