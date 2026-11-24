/** 图表纯计算函数，不依赖 React 或浏览器 API。 */

import type { BallArea, GameConfig } from '../picker/types';
import type { DrawItem, NumberMetric, StatsResult } from './useDraws';

export type FrequencySort = 'number' | 'frequency';
export type TrendDensity = 'compact' | 'comfortable';
export type TrendArea = 'main' | 'extra';

export interface TrendDetail {
  issue: string;
  date: string;
  number: number;
  isHit: boolean;
}

export const formatNumber = (number: number): string => String(number).padStart(2, '0');

export const createNumberRange = (area: BallArea): number[] =>
  Array.from({ length: area.max - area.min + 1 }, (_, index) => area.min + index);

export const getTrendArea = (game: GameConfig, area: TrendArea): BallArea =>
  game.areas[area === 'main' ? 0 : 1] ?? game.areas[0];

export const getDrawNumbers = (draw: DrawItem, area: TrendArea): number[] =>
  area === 'main' ? draw.main : draw.extra;

export const getPeriodOptions = (available: number): number[] => {
  if (available <= 0) return [];
  const standard = [10, 20, 30, 50].filter((value) => value < available);
  return Array.from(new Set([...standard, available])).sort((left, right) => left - right);
};

export const selectRecentDraws = (draws: DrawItem[], count: number): DrawItem[] =>
  draws.slice(-Math.min(count, draws.length)).reverse();

export const sortMetrics = (
  metrics: NumberMetric[],
  sort: FrequencySort,
): NumberMetric[] =>
  [...metrics].sort((left, right) =>
    sort === 'frequency'
      ? right.count - left.count || left.number - right.number
      : left.number - right.number,
  );

export const getExpectedCount = (stats: StatsResult, game: GameConfig): number => {
  const area = game.areas[0];
  const range = area.max - area.min + 1;
  return range > 0 ? (stats.window * area.count) / range : 0;
};

export const getMetricState = (zScore: number): string => {
  if (zScore > 0.5) return '偏热';
  if (zScore < -0.5) return '偏冷';
  return '常态';
};
