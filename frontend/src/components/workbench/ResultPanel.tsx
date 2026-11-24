import { useState } from 'react';
import { Bookmark, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge, EmptyState, Notice } from '../ui/feedback';
import TicketList from '../../features/picker/components/TicketList';
import type { ActionResult } from '../../features/picker/hooks/usePicker';
import { PanelFrame } from './PanelFrame';
import type { PickerState } from './types';

interface ResultPanelProps {
  picker: PickerState;
}

interface ResultFeedback {
  tone: 'error' | 'warning' | 'success';
  message: string;
}

const toFeedback = (result: ActionResult, successMessage: string): ResultFeedback => {
  if (!result.ok) {
    return { tone: 'error', message: result.error || '操作失败，请稍后重试' };
  }
  if (result.warning) {
    return { tone: 'warning', message: result.warning };
  }
  return { tone: 'success', message: successMessage };
};

export const ResultPanel = ({ picker }: ResultPanelProps) => {
  const [feedback, setFeedback] = useState<ResultFeedback | null>(null);

  const handleCopy = async () => {
    setFeedback(toFeedback(await picker.copyResult(), '号码已复制'));
  };

  const handleSave = () => {
    setFeedback(toFeedback(picker.saveResult(), '已保存到本地历史'));
  };

  return (
    <PanelFrame title="生成结果">
      {!picker.result ? (
        <EmptyState title="尚未生成号码" />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{picker.game.name}</Badge>
            <Badge tone="neutral">{picker.result.combinations} 注</Badge>
            <Badge tone="warning">{picker.result.amount} 元</Badge>
          </div>
          <div className="max-h-[520px] overflow-y-auto pr-1">
            <TicketList
              game={picker.game}
              tickets={picker.result.tickets}
              combinations={picker.result.combinations}
              analyze={picker.result.mode !== 'multiple'}
            />
          </div>
          {feedback && <Notice tone={feedback.tone}>{feedback.message}</Notice>}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => void handleCopy()}>
              <Copy className="size-4" aria-hidden="true" />
              复制结果
            </Button>
            <Button onClick={handleSave}>
              <Bookmark className="size-4" aria-hidden="true" />
              保存结果
            </Button>
          </div>
        </div>
      )}
    </PanelFrame>
  );
};
