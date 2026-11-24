/** 配置驱动的号码走势矩阵。 */

import { Grid3X3, List, Lock, Rows3 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import type { GameConfig } from '../picker/types';
import {
  createNumberRange,
  formatNumber,
  getDrawNumbers,
  getPeriodOptions,
  getTrendArea,
  selectRecentDraws,
  type TrendArea,
  type TrendDensity,
  type TrendDetail,
} from './chartHelpers';
import type { DrawItem } from './useDraws';

interface TrendGridProps {
  draws: DrawItem[];
  game: GameConfig;
}

export const TrendGrid = ({ draws, game }: TrendGridProps) => {
  const [area, setArea] = useState<TrendArea>('main');
  const [density, setDensity] = useState<TrendDensity>('compact');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [period, setPeriod] = useState(30);
  const [lockedNumber, setLockedNumber] = useState<number | null>(null);
  const [detail, setDetail] = useState<TrendDetail | null>(null);
  const currentArea = getTrendArea(game, area);
  const numbers = useMemo(() => createNumberRange(currentArea), [currentArea]);
  const options = useMemo(() => getPeriodOptions(draws.length), [draws.length]);
  const recent = useMemo(() => selectRecentDraws(draws, period), [draws, period]);
  const cellSize = density === 'compact' ? 'h-8 w-8' : 'h-10 w-10';

  if (!draws.length) {
    return (
      <div className="rounded-md border border-[var(--border)] p-6 text-sm text-muted-foreground">
        暂无走势数据
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-[var(--border)] bg-[var(--card)]">
      <CardHeader className="gap-3 border-b border-[var(--border)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">号码走势</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">显示最近 {recent.length} 期实际数据</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {game.areas.map((gameArea, index) => {
              const areaValue = index === 0 ? 'main' : 'extra';
              return (
                <Button
                  key={gameArea.key}
                  type="button"
                  variant={area === areaValue ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setArea(areaValue)}
                >
                  {gameArea.label}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            期数
            <select
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2 text-[var(--foreground)]"
              value={Math.min(period, draws.length)}
              onChange={(event) => setPeriod(Number(event.target.value))}
            >
              {options.map((value) => (
                <option key={value} value={value}>{value} 期</option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDensity((value) => value === 'compact' ? 'comfortable' : 'compact')}
          >
            <Rows3 className="h-4 w-4" />
            {density === 'compact' ? '紧凑' : '舒适'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView((value) => value === 'grid' ? 'table' : 'grid')}
          >
            {view === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            {view === 'grid' ? '文本表格' : '走势矩阵'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {view === 'grid' ? (
          <TrendMatrix
            area={area}
            cellSize={cellSize}
            color={currentArea.color}
            draws={recent}
            lockedNumber={lockedNumber}
            numbers={numbers}
            onDetail={setDetail}
            onLock={setLockedNumber}
          />
        ) : (
          <TrendTextTable area={area} areaLabel={currentArea.label} draws={recent} />
        )}
        <div className="mt-3 min-h-8 text-xs text-muted-foreground" aria-live="polite">
          {detail
            ? `${detail.issue} · ${detail.date} · ${formatNumber(detail.number)} 号 · ${detail.isHit ? '命中' : '未命中'}`
            : `圆点表示命中；点击表头锁定号码列。${lockedNumber ? ` 已锁定 ${formatNumber(lockedNumber)} 号。` : ''}`}
        </div>
      </CardContent>
    </Card>
  );
};

interface TrendMatrixProps {
  area: TrendArea;
  cellSize: string;
  color: 'red' | 'blue';
  draws: DrawItem[];
  lockedNumber: number | null;
  numbers: number[];
  onDetail: (detail: TrendDetail | null) => void;
  onLock: (number: number | null) => void;
}

const TrendMatrix = (props: TrendMatrixProps) => (
  <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--input)]">
    <div className="min-w-max">
      <div className="sticky top-0 z-20 flex bg-[var(--card-raised)]">
        <div className="sticky left-0 z-30 flex w-28 shrink-0 items-center border-r border-[var(--border)] bg-[var(--card-raised)] px-3 text-xs text-muted-foreground">期号</div>
        {props.numbers.map((number) => (
          <button key={number} type="button" className={cn(props.cellSize, 'shrink-0 border-r border-[var(--border)] font-mono text-[11px] text-muted-foreground hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]', props.lockedNumber === number && 'bg-primary/10 text-primary')} onClick={() => props.onLock(props.lockedNumber === number ? null : number)} aria-pressed={props.lockedNumber === number}>
            {props.lockedNumber === number && <Lock className="mx-auto h-2.5 w-2.5" />}{formatNumber(number)}
          </button>
        ))}
      </div>
      {props.draws.map((draw, rowIndex) => (
        <div key={draw.issue} className={cn('group flex hover:bg-primary/[0.035]', (rowIndex + 1) % 10 === 0 && 'border-b border-[var(--border)]')}>
          <div className="sticky left-0 z-10 flex w-28 shrink-0 items-center border-r border-[var(--border)] bg-[var(--card)] px-3 font-mono text-xs text-muted-foreground group-hover:bg-[var(--accent)]">{draw.issue}</div>
          {props.numbers.map((number, columnIndex) => {
            const isHit = getDrawNumbers(draw, props.area).includes(number);
            return (
              <button key={number} type="button" className={cn(props.cellSize, 'shrink-0 border-r border-[var(--border)]/70 text-xs text-transparent hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]', (columnIndex + 1) % 5 === 0 && 'border-r-[var(--border)]', props.lockedNumber === number && 'bg-primary/[0.06]')} onMouseEnter={() => props.onDetail({ issue: draw.issue, date: draw.date, number, isHit })} onMouseLeave={() => props.onDetail(null)} onFocus={() => props.onDetail({ issue: draw.issue, date: draw.date, number, isHit })} onBlur={() => props.onDetail(null)}>
                {isHit && <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full font-mono font-semibold text-slate-950', props.color === 'red' ? 'bg-rose-400' : 'bg-blue-400')}>{formatNumber(number)}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  </div>
);

const TrendTextTable = ({ area, areaLabel, draws }: { area: TrendArea; areaLabel: string; draws: DrawItem[] }) => (
  <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
    <table className="w-full min-w-[520px] text-left text-sm">
      <thead className="bg-[var(--card-raised)] text-muted-foreground"><tr><th className="px-3 py-2">期号</th><th className="px-3 py-2">日期</th><th className="px-3 py-2">{areaLabel}</th></tr></thead>
      <tbody className="divide-y divide-[var(--border)]">{draws.map((draw) => <tr key={draw.issue} className="text-foreground"><td className="px-3 py-2 font-mono">{draw.issue}</td><td className="px-3 py-2">{draw.date}</td><td className="px-3 py-2 font-mono">{getDrawNumbers(draw, area).map(formatNumber).join(' ')}</td></tr>)}</tbody>
    </table>
  </div>
);
