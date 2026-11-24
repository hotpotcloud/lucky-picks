import { WandSparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Notice } from '../ui/feedback';
import { Segmented } from '../ui/segmented';
import BankerPanel from '../../features/picker/components/BankerPanel';
import MultiplePanel from '../../features/picker/components/MultiplePanel';
import QuickPickPanel from '../../features/picker/components/QuickPickPanel';
import type { SelectionMode } from '../../features/picker/types';
import { PanelFrame } from './PanelFrame';
import type { PickerState } from './types';

interface PickerPanelProps {
  picker: PickerState;
}

const SelectionPanel = ({ picker }: PickerPanelProps) => {
  if (picker.mode === 'multiple') {
    return (
      <MultiplePanel
        game={picker.game}
        selections={picker.selections}
        onToggle={picker.toggleSelection}
        info={picker.multipleInfo}
        onQuickFill={picker.quickFill}
      />
    );
  }

  if (picker.mode === 'banker') {
    return (
      <BankerPanel
        game={picker.game}
        banker={picker.bankerNumbers}
        drag={picker.dragNumbers}
        selections={picker.selections}
        onCycle={picker.cycleBankerNumber}
        onToggle={picker.toggleSelection}
        info={picker.bankerInfo}
        onQuickFill={picker.quickFill}
      />
    );
  }

  return (
    <QuickPickPanel
      count={picker.quickCount}
      strategy={picker.strategy}
      primaryArea={picker.game.areas[0]}
      constraints={picker.quickConstraints}
      onCountChange={picker.setQuickCount}
      onStrategyChange={picker.setStrategy}
      onConstraintsChange={picker.setQuickConstraints}
      onQuickFill={picker.quickFill}
    />
  );
};

export const PickerPanel = ({ picker }: PickerPanelProps) => (
  <PanelFrame
    title="选号设置"
    action={<span className="text-xs text-muted-foreground">每注 2 元</span>}
  >
    <div className="space-y-5">
      <Segmented
        label="选号模式"
        value={picker.mode}
        onChange={(value) => picker.setMode(value as SelectionMode)}
        options={[
          { label: '单式机选', value: 'quick' },
          { label: '复式', value: 'multiple' },
          { label: '胆拖', value: 'banker' },
        ]}
      />
      <SelectionPanel picker={picker} />
      {picker.mode === 'quick' && !picker.activeInfo.valid && (
        <Notice tone="warning">{picker.activeInfo.error}</Notice>
      )}
      {picker.generateError && <Notice tone="error">{picker.generateError}</Notice>}
      <Button
        className="w-full"
        size="lg"
        disabled={!picker.activeInfo.valid || picker.isGenerating}
        onClick={() => void picker.generate()}
      >
        <WandSparkles className="size-4" aria-hidden="true" />
        {picker.isGenerating ? '正在生成...' : '生成号码'}
      </Button>
    </div>
  </PanelFrame>
);
