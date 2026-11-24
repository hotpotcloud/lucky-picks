import { Button } from '../../../components/ui/button';
import { Badge, Notice } from '../../../components/ui/feedback';
import type { SelectionInfo } from '../generator';
import type { AreaKey, GameConfig, TicketNumbers } from '../types';
import NumberGrid from './NumberGrid';

/** 胆拖参数面板属性。 */
interface BankerPanelProps {
  /** 玩法规则，第一个区域为胆拖区。 */
  game: GameConfig;
  /** 胆码。 */
  banker: readonly number[];
  /** 拖码。 */
  drag: readonly number[];
  /** 其余区域已选号码。 */
  selections: TicketNumbers;
  /** 主区号码循环切换回调。 */
  onCycle: (value: number) => void;
  /** 副区号码切换回调。 */
  onToggle: (areaKey: AreaKey, value: number) => void;
  /** 当前校验与组合信息。 */
  info: SelectionInfo;
  /** 机选填充回调。 */
  onQuickFill: () => void;
}

/**
 * 胆拖选号面板。
 * 主区号码通过点击循环切换「未选 → 拖码 → 胆码 → 未选」，其余区域按普通选号处理。
 */
const BankerPanel = ({
  game,
  banker,
  drag,
  selections,
  onCycle,
  onToggle,
  info,
  onQuickFill,
}: BankerPanelProps) => {
  const [primary, ...secondaryAreas] = game.areas;

  /** 返回主区号码的胆拖语义状态。 */
  const statusOf = (value: number): 'banker' | 'drag' | undefined => {
    if (banker.includes(value)) {
      return 'banker';
    }
    if (drag.includes(value)) {
      return 'drag';
    }
    return undefined;
  };

  return (
    <div className="space-y-5">
      <Button className="w-full" type="button" onClick={onQuickFill}>
        机选填充
      </Button>
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {primary.label}（胆码 {banker.length}，拖码 {drag.length}）
          </h3>
          <Badge tone="warning">胆</Badge>
          <Badge tone="info">拖</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          点击循环：未选 → 拖码 → 胆码 → 未选；胆码少于 {primary.count} 个
        </p>
        <NumberGrid area={primary} selected={[]} statusOf={statusOf} onToggle={onCycle} />
      </section>

      {secondaryAreas.map((area) => {
        const selected = selections[area.key] ?? [];
        return (
          <section className="space-y-2" key={area.key}>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
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
};

export default BankerPanel;
