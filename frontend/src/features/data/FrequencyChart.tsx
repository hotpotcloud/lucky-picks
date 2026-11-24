/** 深色号码频率图。 */

import { ArrowDownUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import type { GameConfig } from '../picker/types';
import {
  formatNumber,
  getExpectedCount,
  getMetricState,
  sortMetrics,
  type FrequencySort,
} from './chartHelpers';
import type { NumberMetric, StatsResult } from './useDraws';

interface FrequencyChartProps {
  stats: StatsResult;
  game?: GameConfig;
}

const BAR_HEIGHT = 176;

export const FrequencyChart = ({ stats, game }: FrequencyChartProps) => {
  const [sort, setSort] = useState<FrequencySort>('number');
  const [activeMetric, setActiveMetric] = useState<NumberMetric | null>(null);
  const metrics = useMemo(() => sortMetrics(stats.metrics, sort), [sort, stats.metrics]);
  const expected = game ? getExpectedCount(stats, game) : 0;
  const maxCount = Math.max(...metrics.map((metric) => metric.count), expected, 1);
  const expectedBottom = (expected / maxCount) * BAR_HEIGHT;

  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4">
        <div>
          <CardTitle className="text-base">号码频率</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">实际样本 {stats.window} 期</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSort((value) => (value === 'number' ? 'frequency' : 'number'))}
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
          {sort === 'number' ? '按号码' : '按频率'}
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="relative overflow-x-auto rounded-xl border border-[var(--border)] bg-[#0b1017] px-3 pt-8">
          {game && (
            <div
              className="pointer-events-none absolute left-3 right-3 border-t border-dashed border-amber-300/70"
              style={{ bottom: expectedBottom + 28 }}
            >
              <span className="absolute -top-5 right-0 text-[11px] text-amber-200">
                期望 {expected.toFixed(1)}
              </span>
            </div>
          )}
          <div className="flex min-w-max items-end gap-1" style={{ height: BAR_HEIGHT + 28 }}>
            {metrics.map((metric) => (
              <button
                key={metric.number}
                type="button"
                className="group flex w-7 flex-col items-center justify-end focus-visible:outline-none"
                onMouseEnter={() => setActiveMetric(metric)}
                onMouseLeave={() => setActiveMetric(null)}
                onFocus={() => setActiveMetric(metric)}
                onBlur={() => setActiveMetric(null)}
                aria-label={`${formatNumber(metric.number)}号，出现${metric.count}次`}
              >
                <span
                  className={cn(
                    'w-4 rounded-t-sm bg-[var(--primary)]/70 transition-colors group-hover:bg-[var(--primary)] group-focus-visible:bg-[var(--primary)]',
                    metric.zScore > 0.5 && 'bg-rose-400/80',
                    metric.zScore < -0.5 && 'bg-blue-400/75',
                  )}
                  style={{ height: Math.max((metric.count / maxCount) * BAR_HEIGHT, 2) }}
                />
                <span className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {formatNumber(metric.number)}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 min-h-9 text-xs text-muted-foreground" aria-live="polite">
          {activeMetric ? (
            <span>
              {formatNumber(activeMetric.number)} 号 · {activeMetric.count} 次 · 遗漏{' '}
              {activeMetric.omission} 期 · {getMetricState(activeMetric.zScore)}
            </span>
          ) : (
            <span className="text-slate-500">悬浮或聚焦柱体查看实际统计详情</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
