import RecommendPanel from '../../features/recommend/RecommendPanel';
import type { DrawItem } from '../../features/data/useDraws';
import { PanelFrame } from './PanelFrame';
import type { PickerState } from './types';

interface RecommendViewProps {
  picker: PickerState;
  draws: DrawItem[];
}

export const RecommendView = ({ picker, draws }: RecommendViewProps) => (
  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
    <PanelFrame
      title="智能推荐"
    >
      <RecommendPanel game={picker.gameId} draws={draws} />
    </PanelFrame>
    <PanelFrame title="推荐说明">
      <div className="space-y-4 text-sm leading-6 text-muted-foreground">
        <p>当前样本 {draws.length} 期。</p>
      </div>
    </PanelFrame>
  </div>
);
