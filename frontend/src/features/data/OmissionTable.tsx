/** 冷热与遗漏本地表格。 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { formatNumber, getMetricState } from './chartHelpers';
import type { StatsResult } from './useDraws';

interface OmissionTableProps {
  stats: StatsResult;
}

const PAGE_SIZE = 10;

export const OmissionTable = ({ stats }: OmissionTableProps) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(stats.metrics.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = useMemo(
    () => stats.metrics.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [safePage, stats.metrics],
  );

  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[var(--card-raised)] text-xs text-muted-foreground">
              <tr>
                {['号码', '出现次数', '当前遗漏', 'z 分数', '状态'].map((label) => (
                  <th key={label} scope="col" className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((metric) => {
                const state = getMetricState(metric.zScore);
                return (
                  <tr key={metric.number} className="text-[var(--foreground)] hover:bg-[var(--card-raised)]">
                    <td className="px-4 py-3 font-mono text-cyan-200">
                      {formatNumber(metric.number)}
                    </td>
                    <td className="px-4 py-3">{metric.count}</td>
                    <td className="px-4 py-3">{metric.omission}</td>
                    <td className="px-4 py-3 font-mono">{metric.zScore.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded px-2 py-1 text-xs',
                          state === '偏热' && 'bg-rose-400/10 text-rose-300',
                          state === '偏冷' && 'bg-blue-400/10 text-blue-300',
                          state === '常态' && 'bg-[var(--card-raised)] text-muted-foreground',
                        )}
                      >
                        {state}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
          <span className="text-xs text-muted-foreground">
            第 {safePage}/{pageCount} 页 · 共 {stats.metrics.length} 个号码
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              aria-label="上一页"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={safePage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              aria-label="下一页"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
