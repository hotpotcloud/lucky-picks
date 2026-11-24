import { Button, InputNumber, Radio, Space, Typography } from 'antd';
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
 * 注数范围由常量统一约束，InputNumber 与后端校验保持一致。
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
  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <Button block onClick={onQuickFill}>
      机选填充
    </Button>
    <div>
      <Typography.Text strong>机选注数</Typography.Text>
      <InputNumber
        aria-label="机选注数"
        min={QUICK_PICK_MIN}
        max={QUICK_PICK_MAX}
        precision={0}
        step={1}
        value={count}
        style={{ width: '100%', marginTop: 8 }}
        onChange={(value) => {
          // InputNumber 清空时返回 null，回退到最小值，避免出现非法状态
          onCountChange(value ?? QUICK_PICK_MIN);
        }}
      />
    </div>
    <div>
      <Typography.Text strong>选号策略</Typography.Text>
      <Radio.Group
        optionType="button"
        buttonStyle="solid"
        style={{ width: '100%', marginTop: 8 }}
        value={strategy}
        onChange={(event) => onStrategyChange(event.target.value as QuickStrategy)}
        options={[
          { label: STRATEGY_LABELS.random, value: 'random' },
          { label: STRATEGY_LABELS.balanced, value: 'balanced' },
        ]}
      />
    </div>
    <QuickConstraintsPanel
      primaryArea={primaryArea}
      value={constraints}
      onChange={onConstraintsChange}
    />
  </Space>
);

export default QuickPickPanel;
