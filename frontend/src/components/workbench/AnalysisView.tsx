import { Badge } from '../ui/feedback';
import { Segmented } from '../ui/segmented';
import { FrequencyChart, OmissionTable } from '../../features/data/Charts';
import type { StatsResult } from '../../features/data/useDraws';
import AiPanel from '../../features/stats/AiPanel';
import { PanelFrame } from './PanelFrame';
import type { PickerState } from './types';

interface AnalysisViewProps {
  picker: PickerState;
  stats: StatsResult;
  windowSize: number;
  onWindowChange: (value: number) => void;
}

export const AnalysisView = ({
  picker,
  stats,
  windowSize,
  onWindowChange,
}: AnalysisViewProps) => (
  <div className="space-y-6">
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <PanelFrame
        title="频率分析"
        action={<Badge tone="neutral">{stats.window} 期样本</Badge>}
      >
        <div className="mb-5">
          <Segmented
            label="统计窗口"
            value={windowSize}
            onChange={(value) => onWindowChange(Number(value))}
            options={[50, 100, 200].map((value) => ({ label: `${value} 期`, value }))}
          />
        </div>
        <FrequencyChart game={picker.game} stats={stats} />
      </PanelFrame>
      <PanelFrame title="AI 解读">
        <AiPanel game={picker.gameId} window={windowSize} />
      </PanelFrame>
    </div>
    <PanelFrame title="冷热与遗漏">
      <OmissionTable stats={stats} />
    </PanelFrame>
  </div>
);
