import type { GameConfig, TicketNumbers } from './types';

/** 把号码格式化为两位数，例如 1 → 01。 */
export const formatBall = (value: number): string => value.toString().padStart(2, '0');

/**
 * 把一注号码格式化为易读文本，例如：
 * 「红球 01 05 12 19 26 33 | 蓝球 08」
 * @param game 彩种规则，用于获取区域名称与顺序
 * @param numbers 号码集合
 */
export const formatTicketText = (game: GameConfig, numbers: TicketNumbers): string =>
  game.areas
    .map((area) => {
      const values = numbers[area.key] ?? [];
      return `${area.label} ${values.map(formatBall).join(' ')}`;
    })
    .join(' | ');

/**
 * 把多注号码格式化为可复制的多行文本。
 * @param game 彩种规则
 * @param tickets 号码列表
 */
export const formatTicketsText = (game: GameConfig, tickets: readonly TicketNumbers[]): string =>
  tickets
    .map((ticket, index) => `${index + 1}. ${formatTicketText(game, ticket)}`)
    .join('\n');

/** 金额展示，例如 14 →「14 元」。 */
export const formatAmount = (amount: number): string => `${amount} 元`;
