import { formatBall } from '../format';
import type { BallArea } from '../types';
import NumberBall from './NumberBall';

/** 号码选择网格属性。 */
interface NumberGridProps {
  /** 区域规则，用于生成号码范围与颜色。 */
  area: BallArea;
  /** 已选号码。 */
  selected: readonly number[];
  /** 点击号码时的切换回调。 */
  onToggle: (value: number) => void;
  /** 胆拖模式下返回号码的语义状态。 */
  statusOf?: (value: number) => 'banker' | 'drag' | undefined;
}

/**
 * 号码选择网格。
 * 复式模式按 selected 高亮；胆拖主区按 statusOf 区分胆码与拖码。
 */
const NumberGrid = ({ area, selected, onToggle, statusOf }: NumberGridProps) => {
  const selectedSet = new Set(selected);
  const numbers = Array.from(
    { length: area.max - area.min + 1 },
    (_, index) => area.min + index,
  );

  return (
    <div className="number-grid" role="group" aria-label={`${area.label}选号`}>
      {numbers.map((value) => {
        const status = statusOf?.(value);
        const isSelected = selectedSet.has(value) || status === 'banker' || status === 'drag';
        const variant = status === 'banker' ? 'banker' : status === 'drag' ? 'drag' : undefined;

        return (
          <button
            key={value}
            type="button"
            className={[
              'number-button',
              isSelected ? 'is-selected' : '',
              variant ? `is-${variant}` : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={isSelected}
            aria-label={`${area.label} ${formatBall(value)}${
              status === 'banker' ? ' 胆码' : status === 'drag' ? ' 拖码' : ''
            }`}
            onClick={() => onToggle(value)}
          >
            <NumberBall value={value} color={area.color} variant={variant} />
          </button>
        );
      })}
    </div>
  );
};

export default NumberGrid;
