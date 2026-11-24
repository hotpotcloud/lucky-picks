import { useState } from 'react';
import { Notice } from '../ui/feedback';
import HistoryList from '../../features/picker/components/HistoryList';
import { GAME_CONFIGS } from '../../features/picker/config';
import { formatTicketsText } from '../../features/picker/format';
import type { HistoryRecord } from '../../features/picker/types';
import { PanelFrame } from './PanelFrame';
import type { PickerState } from './types';

interface LocalHistoryPanelProps {
  picker: PickerState;
}

export const LocalHistoryPanel = ({ picker }: LocalHistoryPanelProps) => {
  const [feedback, setFeedback] = useState('');

  const handleCopy = async (record: HistoryRecord) => {
    try {
      await navigator.clipboard.writeText(formatTicketsText(GAME_CONFIGS[record.gameId], record.tickets));
      setFeedback('历史号码已复制');
    } catch {
      setFeedback('复制失败，请手动选择号码');
    }
  };

  const handleDelete = (id: string) => {
    const result = picker.deleteHistory(id);
    setFeedback(result.ok ? '历史记录已删除' : result.error || '删除失败');
  };

  return (
    <PanelFrame title="本地历史">
      {feedback && <Notice tone={feedback.includes('失败') ? 'error' : 'success'}>{feedback}</Notice>}
      <div className="mt-3">
        <HistoryList records={picker.history} onCopy={handleCopy} onDelete={handleDelete} />
      </div>
    </PanelFrame>
  );
};
