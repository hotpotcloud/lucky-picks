import type { GameConfig, TicketAnalysis, TicketNumbers } from './types';

/**
 * 计算一注号码的主区分布分析。
 * 分析结果仅供展示，不参与任何中奖判断。
 * @param game 彩种规则
 * @param numbers 号码集合
 */
export const analyzeTicket = (game: GameConfig, numbers: TicketNumbers): TicketAnalysis => {
  const primary = game.areas[0];
  const values = numbers[primary.key] ?? [];

  if (values.length === 0) {
    return { oddEven: '0:0', bigSmall: '0:0', sum: 0, zones: '0:0:0' };
  }

  const midpoint = Math.floor((primary.min + primary.max) / 2);
  const oddCount = values.filter((value) => value % 2 === 1).length;
  const bigCount = values.filter((value) => value > midpoint).length;
  const sum = values.reduce((total, value) => total + value, 0);

  // 把主区范围三等分，统计各区间号码个数
  const zoneSize = Math.ceil((primary.max - primary.min + 1) / 3);
  const zoneCounts = [0, 0, 0];
  for (const value of values) {
    const zoneIndex = Math.min(2, Math.floor((value - primary.min) / zoneSize));
    zoneCounts[zoneIndex] += 1;
  }

  return {
    oddEven: `${oddCount}:${values.length - oddCount}`,
    bigSmall: `${bigCount}:${values.length - bigCount}`,
    sum,
    zones: zoneCounts.join(':'),
  };
};
