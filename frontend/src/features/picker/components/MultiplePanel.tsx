import { Button } from '../../../components/ui/button';
import { Badge, Notice } from '../../../components/ui/feedback';
import type { SelectionInfo } from '../generator';
import type { AreaKey, GameConfig, TicketNumbers } from '../types';
import NumberGrid from './NumberGrid';

/** 复式参数面板属性。 */
interface MultiplePanelProps {
  /** 玩法规则。 */
  game: GameConfig;
  /** 各区域已选号码。 */
  selections: TicketNumbers;
  /** 切换号码回调。 */
  onToggle: (areaKey: AreaKey, value: number) => void;
  /** 当前校验与组合信息。 */
  info: SelectionInfo;
  /** 机选填充回调。 */
  onQuickFill: () => void;
}

/**
 * 复式选号面板：逐个区域展示选号网格，并实时反馈组合数与金额。
 */
const MultiplePanel = ({ game, selections, onToggle, info, onQuickFill }: MultiplePanelProps) => (
  <div className="space-y-5">
    <Button className="w-full" type="button" onClick={onQuickFill}>
      机选填充
    </Button>
    {game.areas.map((area) => {
      const selected = selections[area.key] ?? [];
      return (
        <section className="space-y-2" key={area.key}>
          <h3 className="text-sm font-semibold text-slate-100">
            {area.label}（已选 {selected.length}，至少 {area.count}）
          </h3>
          <NumberGrid
            area={area}
            selected={selected}
            onToggle={(value) => onToggle(area.key, value)}
          />
        </section>
      );
    })}

    {info.valid ? (
      <div className="flex flex-wrap gap-2">
        <Badge tone="info">共 {info.combinations} 注</Badge>
        <Badge tone="warning">参考金额 {info.amount} 元</Badge>
      </div>
    ) : (
      <Notice tone="warning">{info.error}</Notice>
    )}
  </div>
);

export default MultiplePanel;
