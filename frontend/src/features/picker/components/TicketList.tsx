import { Alert, Space, Tag, Typography } from 'antd';
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
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {visible.map((ticket, index) => {
        const analysis = analyzeTicket(game, ticket);
        return (
          <div className="ticket-row" key={index}>
            <Typography.Text type="secondary" className="ticket-index">
              {index + 1}.
            </Typography.Text>
            <div className="ticket-numbers">
              {game.areas.map((area) => {
                const values = ticket[area.key] ?? [];
                return (
                  <span className="ticket-area" key={area.key}>
                    <Typography.Text type="secondary">{area.label}</Typography.Text>
                    {values.map((value) => (
                      <NumberBall key={`${area.key}-${value}`} value={value} color={area.color} />
                    ))}
                  </span>
                );
              })}
            </div>
            {analyze ? (
              <Space size={4} wrap className="ticket-analysis">
                <Tag>奇偶 {analysis.oddEven}</Tag>
                <Tag>大小 {analysis.bigSmall}</Tag>
                <Tag>和值 {analysis.sum}</Tag>
                <Tag>三区 {analysis.zones}</Tag>
              </Space>
            ) : (
              <Typography.Text type="secondary" className="ticket-analysis">
                复式号码集合，已展开为 {combinations} 注，不展示单注分析
              </Typography.Text>
            )}
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <Alert
          type="info"
          showIcon
          message={`为保持页面流畅，仅展示前 ${MAX_RENDERED_TICKETS} 注，合计 ${combinations} 注。复制包含完整结果。`}
        />
      )}
    </Space>
  );
};

export default TicketList;
