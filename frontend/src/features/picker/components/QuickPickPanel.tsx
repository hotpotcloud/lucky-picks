import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Segmented } from '../../../components/ui/segmented';
import { QUICK_PICK_MAX, QUICK_PICK_MIN } from '../constants';
import { STRATEGY_LABELS } from '../labels';
import type { QuickStrategy } from '../types';
import type { BallArea } from '../types';
import type { QuickConstraints } from '../constraints';
import QuickConstraintsPanel from './QuickConstraintsPanel';

/** 机选参数面板属性。 */
interface QuickPickPanelProps {
  /** 机选注数。 */
  count: number;
  /** 机选策略。 */
  strategy: QuickStrategy;
  /** 当前玩法主区。 */
  primaryArea: BallArea;
  /** 可选手动条件。 */
  constraints: QuickConstraints;
  /** 注数变化回调。 */
  onCountChange: (value: number) => void;
  /** 策略变化回调。 */
  onStrategyChange: (value: QuickStrategy) => void;
  /** 手动条件变化回调。 */
  onConstraintsChange: (value: QuickConstraints) => void;
  /** 机选填充回调。 */
  onQuickFill: () => void;
}

/**
 * 机选参数面板：注数与策略。
 * 注数范围由常量统一约束，与后端校验保持一致。
 */
const QuickPickPanel = ({
  count,
  strategy,
  primaryArea,
  constraints,
  onCountChange,
  onStrategyChange,
  onConstraintsChange,
  onQuickFill,
}: QuickPickPanelProps) => (
  <div className="space-y-4">
    <Button className="w-full" type="button" onClick={onQuickFill}>
      机选填充
    </Button>
    <label className="block space-y-2 text-sm font-medium text-[var(--foreground)]">
      <span>机选注数</span>
      <Input
        type="number"
        aria-label="机选注数"
        min={QUICK_PICK_MIN}
        max={QUICK_PICK_MAX}
        step={1}
        value={count}
        onChange={(event) => {
          const nextValue = event.currentTarget.valueAsNumber;
          onCountChange(Number.isNaN(nextValue) ? QUICK_PICK_MIN : nextValue);
        }}
      />
    </label>
    <Segmented
      label="选号策略"
      value={strategy}
      onChange={(nextValue) => onStrategyChange(nextValue as QuickStrategy)}
      options={[
        { label: STRATEGY_LABELS.random, value: 'random' },
        { label: STRATEGY_LABELS.balanced, value: 'balanced' },
      ]}
    />
    <QuickConstraintsPanel
      primaryArea={primaryArea}
      value={constraints}
      onChange={onConstraintsChange}
    />
  </div>
);

export default QuickPickPanel;
