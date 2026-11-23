import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  Empty,
  Popconfirm,
  Row,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd';
import { GAME_CONFIGS } from './features/lottery/config';
import { useLottery } from './features/lottery/hooks/useLottery';
import { MODE_LABELS } from './features/lottery/labels';
import { formatTicketText, formatTicketsText } from './features/lottery/format';
import type { HistoryRecord, SelectionMode } from './features/lottery/types';
import GameSwitcher from './features/lottery/components/GameSwitcher';
import QuickPickPanel from './features/lottery/components/QuickPickPanel';
import MultiplePanel from './features/lottery/components/MultiplePanel';
import BankerPanel from './features/lottery/components/BankerPanel';
import TicketList from './features/lottery/components/TicketList';
import HistoryList from './features/lottery/components/HistoryList';

/** 选号模式切换项。 */
const MODE_OPTIONS: { label: string; value: SelectionMode }[] = [
  { label: MODE_LABELS.quick, value: 'quick' },
  { label: MODE_LABELS.multiple, value: 'multiple' },
  { label: MODE_LABELS.banker, value: 'banker' },
];

/**
 * 应用根组件：只负责布局、消息提示与面板组合，
 * 所有选号状态与校验逻辑集中在 useLottery。
 */
const App = () => {
  const lottery = useLottery();
  const { message } = AntdApp.useApp();

  /** 生成号码并提示结果。 */
  const handleGenerate = () => {
    const result = lottery.generate();
    if (result.ok) {
      message.success(`已生成 ${lottery.activeInfo.combinations} 注号码`);
    } else {
      message.error(result.error);
    }
  };

  /** 复制当前结果。 */
  const handleCopy = async () => {
    const result = await lottery.copyResult();
    if (result.ok) {
      message.success('号码已复制到剪贴板');
    } else {
      message.error(result.error);
    }
  };

  /** 保存当前结果到本地历史。 */
  const handleSave = () => {
    const result = lottery.saveResult();
    if (result.ok) {
      message.success('已保存到本地历史');
    } else {
      message.error(result.error);
    }
  };

  /** 复制历史记录中的号码。 */
  const handleCopyRecord = async (record: HistoryRecord) => {
    const game = GAME_CONFIGS[record.gameId];
    const text =
      record.tickets.length === 1
        ? formatTicketText(game, record.tickets[0])
        : formatTicketsText(game, record.tickets);
    try {
      await navigator.clipboard.writeText(text);
      message.success('历史号码已复制');
    } catch {
      message.error('复制失败，请手动选择号码');
    }
  };

  /** 按当前模式渲染参数面板。 */
  const renderPanel = () => {
    if (lottery.mode === 'multiple') {
      return (
        <MultiplePanel
          game={lottery.game}
          selections={lottery.selections}
          onToggle={lottery.toggleSelection}
          info={lottery.multipleInfo}
        />
      );
    }
    if (lottery.mode === 'banker') {
      return (
        <BankerPanel
          game={lottery.game}
          banker={lottery.bankerNumbers}
          drag={lottery.dragNumbers}
          selections={lottery.selections}
          onCycle={lottery.cycleBankerNumber}
          onToggle={lottery.toggleSelection}
          info={lottery.bankerInfo}
        />
      );
    }
    return (
      <QuickPickPanel
        count={lottery.quickCount}
        strategy={lottery.strategy}
        onCountChange={lottery.setQuickCount}
        onStrategyChange={lottery.setStrategy}
      />
    );
  };

  const generateDisabled = lottery.mode !== 'quick' && !lottery.activeInfo.valid;

  return (
    <div className="app-shell">
      <header className="app-header">
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Lucky Picks · 幸运选号
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          为双色球、大乐透生成号码建议，支持机选、复式、胆拖与号码分布分析。
        </Typography.Paragraph>
        <Alert
          type="warning"
          showIcon
          message="免责声明"
          description="彩票开奖是独立随机事件，本工具的选号建议仅供娱乐参考，不构成投注建议，也不承诺中奖。请理性购彩。"
        />
      </header>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="选号设置">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <GameSwitcher value={lottery.gameId} onChange={lottery.selectGame} />
              <Segmented
                block
                options={MODE_OPTIONS}
                value={lottery.mode}
                onChange={(next) => lottery.setMode(next as SelectionMode)}
              />
              {renderPanel()}
              <Button
                type="primary"
                size="large"
                block
                disabled={generateDisabled}
                onClick={handleGenerate}
              >
                生成号码
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            title="生成结果"
            extra={
              <Space wrap>
                <Button size="small" disabled={!lottery.result} onClick={handleCopy}>
                  复制
                </Button>
                <Button
                  size="small"
                  type="primary"
                  disabled={!lottery.result || !lottery.historyAvailable}
                  onClick={handleSave}
                >
                  保存到历史
                </Button>
              </Space>
            }
          >
            {lottery.result ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="blue">{lottery.game.name}</Tag>
                  <Tag>{MODE_LABELS[lottery.result.mode]}</Tag>
                  <Tag color="gold">共 {lottery.result.combinations} 注</Tag>
                  <Tag color="gold">参考金额 {lottery.result.amount} 元</Tag>
                </Space>
                <TicketList
                  game={lottery.game}
                  tickets={lottery.result.tickets}
                  combinations={lottery.result.combinations}
                />
              </Space>
            ) : (
              <Empty description="尚未生成号码，请在左侧设置参数后点击「生成号码」" />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="本地历史"
        style={{ marginTop: 16 }}
        extra={
          <Popconfirm
            title="清空全部历史记录？"
            onConfirm={() => {
              lottery.clearAllHistory();
              message.success('历史记录已清空');
            }}
            okText="清空"
            cancelText="取消"
            disabled={lottery.history.length === 0}
          >
            <Button size="small" danger disabled={lottery.history.length === 0}>
              清空历史
            </Button>
          </Popconfirm>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {!lottery.historyAvailable && (
            <Alert
              type="warning"
              showIcon
              message="本地存储不可用"
              description="当前浏览器禁用了本地存储，历史记录功能已停用，选号与生成不受影响。"
            />
          )}
          <Typography.Text type="secondary">
            历史记录仅保存在当前浏览器，不会上传到任何服务器。
          </Typography.Text>
          <HistoryList
            records={lottery.history}
            onCopy={handleCopyRecord}
            onDelete={(id) => {
              lottery.deleteHistory(id);
              message.success('记录已删除');
            }}
          />
        </Space>
      </Card>

      <footer className="app-footer">
        <Typography.Text type="secondary">
          Lucky Picks 仅提供随机与均衡选号建议，不销售彩票、不代购、不提供任何中奖承诺。
        </Typography.Text>
      </footer>
    </div>
  );
};

export default App;
