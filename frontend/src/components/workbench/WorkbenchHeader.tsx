import { Activity, Database, WifiOff } from 'lucide-react';
import { Badge } from '../ui/feedback';
import { Segmented } from '../ui/segmented';
import type { GameId } from '../../features/picker/types';
import type { DrawState } from './drawTypes';
import type { PickerState, WorkbenchTab } from './types';

/** 页面标题；不展示介绍性说明文字。 */
const PAGE_TITLE: Record<WorkbenchTab, string> = {
  picker: '选号工作台',
  recommend: '智能推荐',
  history: '历史数据',
  analysis: '数据分析',
};

interface WorkbenchHeaderProps {
  activeTab: WorkbenchTab;
  picker: PickerState;
  draws: DrawState;
}

export const WorkbenchHeader = ({ activeTab, picker, draws }: WorkbenchHeaderProps) => {
  const latest = draws.draws.at(-1);
  const pageTitle = PAGE_TITLE[activeTab];

  return (
    <section className="mb-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-3xl font-semibold text-foreground">{pageTitle}</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Segmented
            label="当前玩法"
            value={picker.gameId}
            onChange={(value) => picker.selectGame(value as GameId)}
            options={[
              { label: '红蓝玩法', value: 'redblue' },
              { label: '前后玩法', value: 'frontback' },
            ]}
          />
          <div className="flex min-h-10 items-center gap-3 rounded-md border border-border bg-secondary px-3">
            {draws.loading ? (
              <Activity className="size-4 animate-pulse text-primary" aria-hidden="true" />
            ) : draws.error ? (
              <WifiOff className="size-4 text-destructive" aria-hidden="true" />
            ) : (
              <Database className="size-4 text-primary" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">最新数据</span>
              <span className="block truncate text-xs font-medium text-foreground">
                {draws.loading ? '加载中' : draws.error ? '暂不可用' : latest?.issue || '暂无数据'}
              </span>
            </div>
            <Badge tone={draws.error ? 'error' : draws.loading ? 'info' : 'success'}>
              {draws.error ? '异常' : draws.loading ? '同步中' : draws.source || '已连接'}
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
};
