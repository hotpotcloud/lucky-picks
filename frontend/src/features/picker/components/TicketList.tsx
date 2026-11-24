import { Badge, Notice } from '../../../components/ui/feedback';
import { MAX_RENDERED_TICKETS } from '../constants';
import { analyzeTicket } from '../analysis';
import type { GameConfig, TicketNumbers } from '../types';
import NumberBall from './NumberBall';

/** 结果列表属性。 */
interface TicketListProps {
  /** 玩法规则。 */
  game: GameConfig;
  /** 号码列表。 */
  tickets: readonly TicketNumbers[];
  /** 组合注数，用于提示是否被截断展示。 */
  combinations: number;
  /** 是否展示主区分布分析；复式结果展示的是号码集合，不适用单注分析。 */
  analyze?: boolean;
}

/**
 * 生成结果列表：逐注展示号码球与主区分布分析。
 * 注数较多时只渲染前 MAX_RENDERED_TICKETS 注，避免页面卡顿。
 */
const TicketList = ({ game, tickets, combinations, analyze = true }: TicketListProps) => {
  const visible = tickets.slice(0, MAX_RENDERED_TICKETS);
  const hiddenCount = tickets.length - visible.length;

  return (
    <div className="space-y-2">
      {visible.map((ticket, index) => {
        const analysis = analyzeTicket(game, ticket);
        return (
          <div
            className="ticket-row rounded-md border border-slate-800 bg-slate-950/35 px-3 py-2"
            key={index}
          >
            <span className="ticket-index font-mono text-xs text-slate-500">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="ticket-numbers">
              {game.areas.map((area) => {
                const values = ticket[area.key] ?? [];
                return (
                  <span className="ticket-area" key={area.key}>
                    <span className="text-xs text-slate-500">{area.label}</span>
                    {values.map((value) => (
                      <NumberBall key={`${area.key}-${value}`} value={value} color={area.color} />
                    ))}
                  </span>
                );
              })}
            </div>
            {analyze ? (
              <div className="ticket-analysis flex flex-wrap gap-1">
                <Badge tone="neutral">奇偶 {analysis.oddEven}</Badge>
                <Badge tone="neutral">大小 {analysis.bigSmall}</Badge>
                <Badge tone="neutral">和值 {analysis.sum}</Badge>
                <Badge tone="neutral">三区 {analysis.zones}</Badge>
              </div>
            ) : null}
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <Notice tone="info">
          为保持页面流畅，仅展示前 {MAX_RENDERED_TICKETS} 注，合计 {combinations} 注。复制包含完整结果。
        </Notice>
      )}
    </div>
  );
};

export default TicketList;
