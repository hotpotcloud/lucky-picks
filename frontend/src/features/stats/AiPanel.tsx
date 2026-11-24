/** AI 分析面板：保持现有接口行为，仅升级展示。 */

import { LoaderCircle, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge, EmptyState, Notice } from '../../components/ui/feedback';
import { useAiPanelLogic } from './useAiPanelLogic';

interface AiPanelProps {
  game: string;
  window: number;
}

const AiPanel = ({ game, window }: AiPanelProps) => {
  const logic = useAiPanelLogic(game, window);

  return (
    <Card className="border-[var(--border)] bg-[var(--card)] shadow-none">
      <CardHeader className="border-b border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-[var(--foreground)]">
            <Sparkles className="text-cyan-300" size={18} />
            AI 分析
          </CardTitle>
          <Badge tone={logic.isAvailable ? 'success' : 'warning'}>deepseek-v4.1-flash</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {!logic.isAvailable && <Notice tone="warning">服务端 AI 未配置</Notice>}
        <Button
          className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
          disabled={!logic.isAvailable || logic.isLoading}
          onClick={() => void logic.handleGenerate()}
        >
          {logic.isLoading ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}
          {logic.isLoading ? '分析中...' : '生成 AI 分析'}
        </Button>
        {logic.error && <Notice tone="error">{logic.error}</Notice>}
        {logic.result ? (
          <article className="rounded-md border border-cyan-400/20 bg-cyan-400/5 p-4">
            <p className="m-0 whitespace-pre-wrap leading-7 text-[var(--foreground)]">
              {logic.result.content}
            </p>
            <p className="mb-0 mt-4 border-t border-cyan-400/15 pt-3 text-xs leading-5 text-muted-foreground">
              {logic.result.disclaimer}
            </p>
          </article>
        ) : (
          <EmptyState title="暂无 AI 解读" description="生成后将在此展示当前统计窗口的分析。" />
        )}
      </CardContent>
    </Card>
  );
};

export default AiPanel;
