import { EmptyState, Notice } from '../ui/feedback';
import { TrendGrid } from '../../features/data/Charts';
import type { StatsResult } from '../../features/data/useDraws';
import { PanelFrame } from './PanelFrame';
import { RecentDraws } from './RecentDraws';
import type { DrawState } from './drawTypes';
import type { PickerState } from './types';

interface HistoryViewProps {
  picker: PickerState;
  draws: DrawState;
  stats: StatsResult;
}

export const HistoryView = ({ picker, draws, stats }: HistoryViewProps) => (
  <div className="space-y-6">
    <PanelFrame
      title="历史数据"
      action={
        <span className="text-xs tabular-nums text-muted-foreground">
          {stats.latestIssue ? `最新 ${stats.latestIssue}` : '暂无最新期次'}
        </span>
      }
    >
      {draws.loading && <Notice tone="info">正在加载历史数据...</Notice>}
      {draws.error && <Notice tone="error">{draws.error}</Notice>}
      {!draws.loading && !draws.error && !draws.draws.length && (
        <EmptyState title="暂无历史数据" />
      )}
      {!draws.loading && !draws.error && draws.draws.length > 0 && (
        <RecentDraws game={picker.game} draws={draws.draws} />
      )}
    </PanelFrame>
    <PanelFrame title="走势矩阵">
      {!draws.loading && !draws.error && <TrendGrid game={picker.game} draws={draws.draws} />}
    </PanelFrame>
  </div>
);
