/** 应用根组件：登录门禁 + 功能分区。 */

import { useState } from 'react';
import { Alert, Button, Card, Empty, Segmented, Space, Spin, Tag, Typography } from 'antd';
import { useAuth } from './features/auth/AuthContext';
import LoginPage from './features/auth/LoginPage';
import GameSwitcher from './features/picker/components/GameSwitcher';
import QuickPickPanel from './features/picker/components/QuickPickPanel';
import MultiplePanel from './features/picker/components/MultiplePanel';
import BankerPanel from './features/picker/components/BankerPanel';
import TicketList from './features/picker/components/TicketList';
import HistoryList from './features/picker/components/HistoryList';
import { usePicker } from './features/picker/hooks/usePicker';
import { useDraws, computeStats } from './features/data/useDraws';
import { FrequencyChart, OmissionTable, TrendGrid } from './features/data/Charts';
import RecommendPanel from './features/recommend/RecommendPanel';
import NumberBall from './features/picker/components/NumberBall';

/** 功能分区标识。 */
const TABS = [
  { label: '选号', value: 'picker' },
  { label: '推荐', value: 'recommend' },
  { label: '历史', value: 'history' },
  { label: '分析', value: 'analysis' },
  { label: '走势', value: 'trend' },
];

/**
 * 已登录后的主界面。
 */
const MainView = () => {
  const { user, signOut, offline } = useAuth();
  const picker = usePicker();
  const [tab, setTab] = useState('picker');
  const [windowSize, setWindowSize] = useState(100);
  const draws = useDraws(picker.gameId);
  const stats = computeStats(draws.draws, picker.gameId, windowSize);

  const panel = () => {
    if (picker.mode === 'multiple') {
      return (
        <MultiplePanel
          game={picker.game}
          selections={picker.selections}
          onToggle={picker.toggleSelection}
          info={picker.multipleInfo}
        />
      );
    }
    if (picker.mode === 'banker') {
      return (
        <BankerPanel
          game={picker.game}
          banker={picker.bankerNumbers}
          drag={picker.dragNumbers}
          selections={picker.selections}
          onCycle={picker.cycleBankerNumber}
          onToggle={picker.toggleSelection}
          info={picker.bankerInfo}
        />
      );
    }
    return (
      <QuickPickPanel
        count={picker.quickCount}
        strategy={picker.strategy}
        onCountChange={picker.setQuickCount}
        onStrategyChange={picker.setStrategy}
      />
    );
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Typography.Title level={2} style={{ marginBottom: 12 }}>
            Lucky Picks
          </Typography.Title>
          <Space wrap>
            {offline && <Tag color="orange">离线模式</Tag>}
            <Typography.Text>{user?.username}</Typography.Text>
            <Button size="small" onClick={() => void signOut()}>
              退出
            </Button>
          </Space>
        </Space>
        <Alert
          type="warning"
          showIcon
          message="免责声明"
          description="开奖结果为独立随机事件，本工具的选号建议仅供娱乐参考，不构成任何投注建议，也不承诺中奖。请理性参与。"
        />
      </header>

      <Segmented block options={TABS} value={tab} onChange={(value) => setTab(String(value))} />

      <div style={{ marginTop: 16 }}>
        {tab === 'picker' && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card title="选号">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <GameSwitcher value={picker.gameId} onChange={picker.selectGame} />
                <Segmented
                  block
                  options={[
                    { label: '机选', value: 'quick' },
                    { label: '复式', value: 'multiple' },
                    { label: '胆拖', value: 'banker' },
                  ]}
                  value={picker.mode}
                  onChange={(value) => picker.setMode(value as typeof picker.mode)}
                />
                {panel()}
                {picker.mode === 'quick' && !picker.activeInfo.valid && (
                  <Alert type="warning" showIcon message={picker.activeInfo.error} />
                )}
                <Button
                  type="primary"
                  size="large"
                  block
                  disabled={!picker.activeInfo.valid}
                  onClick={() => {
                    const result = picker.generate();
                    if (!result.ok) {
                      // 错误消息由面板内联展示
                    }
                  }}
                >
                  生成号码
                </Button>
              </Space>
            </Card>
            <Card title="结果">
              {picker.result ? (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="blue">{picker.game.name}</Tag>
                    <Tag>共 {picker.result.combinations} 注</Tag>
                    <Tag color="gold">{picker.result.amount} 元</Tag>
                  </Space>
                  <TicketList
                    game={picker.game}
                    tickets={picker.result.tickets}
                    combinations={picker.result.combinations}
                    analyze={picker.result.mode !== 'multiple'}
                  />
                </Space>
              ) : (
                <Empty description="尚未生成号码" />
              )}
            </Card>
            <Card title="本地历史">
              <HistoryList
                records={picker.history}
                onCopy={() => undefined}
                onDelete={(id) => {
                  picker.deleteHistory(id);
                }}
              />
            </Card>
          </Space>
        )}

        {tab === 'recommend' && (
          <Card title="智能推荐">
            <RecommendPanel game={picker.gameId} draws={draws.draws} />
          </Card>
        )}

        {tab === 'history' && (
          <Card title="历史开奖" extra={<Tag>{draws.source}</Tag>}>
            {draws.loading ? (
              <Spin />
            ) : draws.error ? (
              <Alert type="error" showIcon message={draws.error} />
            ) : (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Typography.Text>共 {draws.draws.length} 期，最新 {stats.latestIssue}</Typography.Text>
                <div className="trend-grid">
                  {draws.draws
                    .slice(-30)
                    .reverse()
                    .map((draw) => (
                      <div className="trend-row" key={draw.issue}>
                        <span className="trend-issue">{draw.date}</span>
                        <Space wrap size={2}>
                          {draw.main.map((number) => (
                            <NumberBall
                              key={number}
                              value={number}
                              color={picker.gameId === 'redblue' ? 'red' : 'blue'}
                              size="small"
                            />
                          ))}
                          {draw.extra.map((number) => (
                            <NumberBall key={`e-${number}`} value={number} color="blue" size="small" />
                          ))}
                        </Space>
                      </div>
                    ))}
                </div>
              </Space>
            )}
          </Card>
        )}

        {tab === 'analysis' && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card title="数据分析" extra={<Tag>{stats.window} 期</Tag>}>
              <Space wrap>
                <Typography.Text>窗口</Typography.Text>
                <Segmented
                  options={[50, 100, 200].map((value) => ({ label: value, value }))}
                  value={windowSize}
                  onChange={(value) => setWindowSize(Number(value))}
                />
              </Space>
              <FrequencyChart stats={stats} />
            </Card>
            <Card title="冷热与遗漏">
              <OmissionTable stats={stats} />
            </Card>
          </Space>
        )}

        {tab === 'trend' && (
          <Card title="号码走势">
            <TrendGrid draws={draws.draws} />
          </Card>
        )}
      </div>
    </div>
  );
};

/**
 * 应用入口：未登录显示登录页。
 */
const App = () => {
  const { user, ready } = useAuth();
  if (!ready) {
    return <Spin size="large" />;
  }
  return user ? <MainView /> : <LoginPage />;
};

export default App;
