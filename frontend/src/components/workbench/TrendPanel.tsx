import { Notice } from '../ui/feedback';
import { TrendGrid } from '../../features/data/Charts';
import { PanelFrame } from './PanelFrame';
import type { DrawState } from './drawTypes';
import type { PickerState } from './types';

interface TrendPanelProps {
  picker: PickerState;
  draws: DrawState;
}

export const TrendPanel = ({ picker, draws }: TrendPanelProps) => (
  <PanelFrame
    title="号码走势"
    action={
      <span className="text-xs tabular-nums text-muted-foreground">
        {draws.draws.length ? `${draws.draws.length} 期样本` : '暂无样本'}
      </span>
    }
  >
    {draws.loading && <Notice tone="info">正在加载历史数据...</Notice>}
    {draws.error && <Notice tone="error">{draws.error}</Notice>}
    {!draws.loading && !draws.error && <TrendGrid game={picker.game} draws={draws.draws} />}
  </PanelFrame>
);
