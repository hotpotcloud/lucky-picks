/** 已登录后的应用工作台，集中组合业务 Hook 与页面组件。 */

import { useState } from 'react';
import { ChatPanel } from '../../features/chat/ChatPanel';
import { computeStats, useDraws } from '../../features/data/useDraws';
import { usePicker } from '../../features/picker/hooks/usePicker';
import { AnalysisView } from './AnalysisView';
import { HistoryView } from './HistoryView';
import { PickerView } from './PickerView';
import { RecommendView } from './RecommendView';
import { WorkbenchHeader } from './WorkbenchHeader';
import { WorkbenchTopbar } from './WorkbenchTopbar';
import type { WorkbenchTab } from './types';

const DEFAULT_STATS_WINDOW = 100;

export const WorkbenchApp = () => {
  const picker = usePicker();
  const draws = useDraws(picker.gameId);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('picker');
  const [windowSize, setWindowSize] = useState(DEFAULT_STATS_WINDOW);
  const stats = computeStats(draws.draws, picker.gameId, windowSize);

  return (
    <div className="app-shell">
      <WorkbenchTopbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="w-full pt-2">
        {activeTab !== 'chat' && (
          <WorkbenchHeader activeTab={activeTab} picker={picker} draws={draws} />
        )}
        {activeTab === 'picker' && <PickerView picker={picker} draws={draws} />}
        {activeTab === 'recommend' && <RecommendView picker={picker} draws={draws.draws} />}
        {activeTab === 'history' && <HistoryView picker={picker} draws={draws} stats={stats} />}
        {activeTab === 'analysis' && (
          <AnalysisView
            picker={picker}
            stats={stats}
            windowSize={windowSize}
            onWindowChange={setWindowSize}
          />
        )}
        {activeTab === 'chat' && <ChatPanel />}
      </main>
    </div>
  );
};
