import type { DrawState } from './drawTypes';
import { LocalHistoryPanel } from './LocalHistoryPanel';
import { PickerPanel } from './PickerPanel';
import { ResultPanel } from './ResultPanel';
import { TrendPanel } from './TrendPanel';
import type { PickerState } from './types';

interface PickerViewProps {
  picker: PickerState;
  draws: DrawState;
}

export const PickerView = ({ picker, draws }: PickerViewProps) => (
  <div className="space-y-6">
    <div className="workbench-grid">
      <PickerPanel picker={picker} />
      <ResultPanel picker={picker} />
    </div>
    <TrendPanel picker={picker} draws={draws} />
    <LocalHistoryPanel picker={picker} />
  </div>
);
