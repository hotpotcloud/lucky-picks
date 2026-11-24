import type { BallArea, GameConfig, TicketAnalysis, TicketNumbers } from './types';

/**
 * 大小号分界阈值：大于等于该值视为「大号」。
 * 采用国内主流口径：红蓝玩法小号 01–16、大号 17–33；前后玩法小号 01–17、大号 18–35。
 */
export const getBigSmallThreshold = (area: BallArea): number =>
  Math.ceil((area.min + area.max) / 2);

/** 判断单个号码是否属于大号。 */
export const isBigNumber = (area: BallArea, value: number): boolean =>
  value >= getBigSmallThreshold(area);

/** 三区数量常量，供分析与均衡策略共用。 */
export const ZONE_COUNT = 3;

/**
 * 计算一注号码的主区分布分析。
 * 分析结果仅供展示，不参与任何中奖判断。
 * @param game 玩法规则
 * @param numbers 号码集合
 */
export const analyzeTicket = (game: GameConfig, numbers: TicketNumbers): TicketAnalysis => {
  const primary = game.areas[0];
  const values = numbers[primary.key] ?? [];

  if (values.length === 0) {
    return { oddEven: '0:0', bigSmall: '0:0', sum: 0, zones: '0:0:0' };
  }

  const oddCount = values.filter((value) => value % 2 === 1).length;
  const bigCount = values.filter((value) => isBigNumber(primary, value)).length;
  const sum = values.reduce((total, value) => total + value, 0);

  // 把主区范围三等分，统计各区间号码个数
  const zoneSize = Math.ceil((primary.max - primary.min + 1) / ZONE_COUNT);
  const zoneCounts = Array.from({ length: ZONE_COUNT }, () => 0);
  for (const value of values) {
    const zoneIndex = Math.min(
      ZONE_COUNT - 1,
      Math.floor((value - primary.min) / zoneSize),
    );
    zoneCounts[zoneIndex] += 1;
  }

  return {
    oddEven: `${oddCount}:${values.length - oddCount}`,
    bigSmall: `${bigCount}:${values.length - bigCount}`,
    sum,
    zones: zoneCounts.join(':'),
  };
};
