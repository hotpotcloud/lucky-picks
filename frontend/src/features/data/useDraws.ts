/** 开奖数据加载与本地统计。 */

import { useEffect, useState } from 'react';
import { apiGet } from '../../api/client';
import type { DrawDto } from '../../api/types';

/** 归一化的开奖记录。 */
export interface DrawItem {
  issue: string;
  date: string;
  main: number[];
  extra: number[];
}

/**
 * 加载某玩法的开奖记录。
 * @param game 玩法标识
 */
export const useDraws = (game: string) => {
  const [draws, setDraws] = useState<DrawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const page = await apiGet<{ items: DrawDto[] }>(
          `/api/v1/draws/${game}?limit=100&offset=0`,
        );
        if (!cancelled) {
          setDraws(
            page.items
              .map((draw) => ({
                issue: draw.issue,
                date: draw.date,
                main: draw.numbers.red ?? draw.numbers.front ?? [],
                extra: draw.numbers.blue ?? draw.numbers.back ?? [],
              }))
              .sort((left, right) =>
                left.issue.localeCompare(right.issue, 'en', { numeric: true }),
              ),
          );
          setSource('后端接口');
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '数据加载失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [game]);

  return { draws, loading, error, source };
};

/** 单号统计。 */
export interface NumberMetric {
  number: number;
  count: number;
  omission: number;
  zScore: number;
}

/** 形态统计结果。 */
export interface StatsResult {
  metrics: NumberMetric[];
  sums: number[];
  oddEven: Record<string, number>;
  bigSmall: Record<string, number>;
  zones: Record<string, number>;
  latestIssue: string;
  latestDate: string;
  window: number;
}

const mean = (values: number[]): number =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

/**
 * 计算本地统计（与后端统计公式一致）。
 * @param draws 开奖记录（升序）
 * @param game 玩法标识
 * @param window 窗口
 */
export const computeStats = (draws: DrawItem[], game: string, window: number): StatsResult => {
  const selected = draws.slice(-window);
  const span = game === 'redblue' ? 33 : 35;
  const base = game === 'redblue' ? 6 : 5;
  const selectedCount = selected.length || 1;
  const expected = (selectedCount * base) / span;
  const deviation = Math.sqrt(selectedCount * (base / span) * (1 - base / span)) || 1;
  const countMap = new Map<number, number>();
  const lastSeen = new Map<number, number>();
  selected.forEach((draw, index) => {
    draw.main.forEach((number) => {
      countMap.set(number, (countMap.get(number) ?? 0) + 1);
      lastSeen.set(number, index);
    });
  });
  const metrics: NumberMetric[] = Array.from({ length: span }, (_, index) => {
    const number = index + 1;
    const count = countMap.get(number) ?? 0;
    const seen = lastSeen.get(number);
    const omission = seen === undefined ? selectedCount : selectedCount - 1 - seen;
    return { number, count, omission, zScore: (count - expected) / deviation };
  });
  const sums = selected.map((draw) => draw.main.reduce((total, value) => total + value, 0));
  const oddEven: Record<string, number> = {};
  const bigSmall: Record<string, number> = {};
  const zones: Record<string, number> = {};
  const threshold = Math.ceil((span + 1) / 2);
  selected.forEach((draw) => {
    const odd = draw.main.filter((value) => value % 2 === 1).length;
    const big = draw.main.filter((value) => value >= threshold).length;
    const zoneCounts = [0, 0, 0];
    draw.main.forEach((value) => {
      zoneCounts[Math.min(2, Math.floor(((value - 1) * 3) / span))] += 1;
    });
    const oddKey = `${odd}:${draw.main.length - odd}`;
    const bigKey = `${big}:${draw.main.length - big}`;
    const zoneKey = zoneCounts.join(':');
    oddEven[oddKey] = (oddEven[oddKey] ?? 0) + 1;
    bigSmall[bigKey] = (bigSmall[bigKey] ?? 0) + 1;
    zones[zoneKey] = (zones[zoneKey] ?? 0) + 1;
  });
  const latest = selected[selected.length - 1];
  return {
    metrics,
    sums,
    oddEven,
    bigSmall,
    zones,
    latestIssue: latest?.issue ?? '',
    latestDate: latest?.date ?? '',
    window: selected.length,
  };
};

/** 和值均值（供图表使用）。 */
export const averageOf = mean;
