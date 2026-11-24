import { Copy, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge, EmptyState, Notice } from '../../../components/ui/feedback';
import { GAME_CONFIGS } from '../config';
import { TICKET_PRICE } from '../constants';
import { formatAmount } from '../format';
import { MODE_LABELS } from '../labels';
import type { HistoryRecord } from '../types';
import NumberBall from './NumberBall';

/** 历史记录列表属性。 */
interface HistoryListProps {
  /** 历史记录，按时间倒序。 */
  records: readonly HistoryRecord[];
  /** 复制记录回调。 */
  onCopy: (record: HistoryRecord) => void;
  /** 删除单条记录回调。 */
  onDelete: (id: string) => void;
}

/**
 * 本地历史列表：展示玩法、模式、时间、注数与首注号码，支持复制与删除。
 * 记录只保存在当前浏览器，不做任何上传。
 */
const HistoryList = ({ records, onCopy, onDelete }: HistoryListProps) => (
  <div className="space-y-2">
    {records.length === 0 ? (
      <EmptyState title="暂无本地记录" description="保存选号结果后会显示在这里。" />
    ) : null}
    {records.map((record) => {
      const game = GAME_CONFIGS[record.gameId];
      const preview = record.tickets[0];
      const handleDelete = () => {
        if (window.confirm('删除这条记录？')) {
          onDelete(record.id);
        }
      };

      return (
        <Card className="bg-[var(--input)]" key={record.id}>
          <CardContent className="space-y-3 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{record.gameName}</Badge>
                <Badge tone="neutral">{MODE_LABELS[record.mode]}</Badge>
                <time className="text-xs text-muted-foreground">
                  {new Date(record.createdAt).toLocaleString()}
                </time>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" type="button" onClick={() => onCopy(record)}>
                  <Copy className="size-3.5" aria-hidden="true" />
                  复制
                </Button>
                <Button
                  className="text-rose-300 hover:bg-rose-400/10"
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={handleDelete}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  删除
                </Button>
              </div>
            </div>
            {preview ? (
              <div className="flex flex-wrap gap-2">
                {game.areas.map((area) => (
                  <span className="ticket-area" key={area.key}>
                    <span className="text-xs text-muted-foreground">{area.label}</span>
                    {(preview[area.key] ?? []).map((value) => (
                      <NumberBall
                        key={`${area.key}-${value}`}
                        value={value}
                        color={area.color}
                        size="small"
                      />
                    ))}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              共 {record.combinationCount} 注 · 参考金额{' '}
              {formatAmount(record.amount ?? record.combinationCount * TICKET_PRICE)}
              {record.tickets.length > 1 ? '（首注预览）' : ''}
            </p>
            {record.ticketsTruncated ? (
              <Notice tone="warning">历史中仅保存前 {record.tickets.length} 注号码</Notice>
            ) : null}
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default HistoryList;
