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
import { GAME_CONFIGS } from './features/picker/config';
import { usePicker } from './features/picker/hooks/usePicker';
import { MODE_LABELS } from './features/picker/labels';
import { formatAmount, formatTicketText, formatTicketsText } from './features/picker/format';
import type { HistoryRecord, SelectionMode } from './features/picker/types';
import GameSwitcher from './features/picker/components/GameSwitcher';
import QuickPickPanel from './features/picker/components/QuickPickPanel';
import MultiplePanel from './features/picker/components/MultiplePanel';
import BankerPanel from './features/picker/components/BankerPanel';
import TicketList from './features/picker/components/TicketList';
import HistoryList from './features/picker/components/HistoryList';

/** 选号模式切换项。 */
const MODE_OPTIONS: { label: string; value: SelectionMode }[] = [
  { label: MODE_LABELS.quick, value: 'quick' },
  { label: MODE_LABELS.multiple, value: 'multiple' },
  { label: MODE_LABELS.banker, value: 'banker' },
];

/**
 * 应用根组件：只负责布局、消息提示与面板组合，
 * 所有选号状态与校验逻辑集中在 usePicker。
 */
const App = () => {
  const picker = usePicker();
  const { message } = AntdApp.useApp();

  /** 生成号码并提示结果。 */
  const handleGenerate = () => {
    const result = picker.generate();
    if (result.ok) {
      message.success(`已生成 ${picker.activeInfo.combinations} 注号码`);
    } else {
      message.error(result.error);
    }
  };

  /** 复制当前结果。 */
  const handleCopy = async () => {
    const result = await picker.copyResult();
    if (result.ok) {
      message.success('号码已复制到剪贴板');
    } else {
      message.error(result.error);
    }
  };

  /** 保存当前结果到本地历史；被截断时用警告提示而不是静默成功。 */
  const handleSave = () => {
    const result = picker.saveResult();
    if (!result.ok) {
      message.error(result.error);
      return;
    }
    if (result.warning) {
      message.warning(result.warning);
    } else {
      message.success('已保存到本地历史');
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
      if (record.ticketsTruncated) {
        message.warning('该历史仅保存了部分号码，已复制已保存部分');
      } else {
        message.success('历史号码已复制');
      }
    } catch {
      message.error('复制失败，请手动选择号码');
    }
  };

  /** 按当前模式渲染参数面板。 */
  const renderPanel = () => {
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

  const generateDisabled = !picker.activeInfo.valid;

  return (
    <div className="app-shell">
      <header className="app-header">
        <Typography.Title level={2} style={{ marginBottom: 12 }}>
          Lucky Picks
        </Typography.Title>
        <Alert
          type="warning"
          showIcon
          message="免责声明"
          description="开奖结果为独立随机事件，本工具的选号建议仅供娱乐参考，不构成任何投注建议，也不承诺中奖。请理性参与。"
        />
      </header>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="选号设置">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <GameSwitcher value={picker.gameId} onChange={picker.selectGame} />
              <Segmented
                block
                options={MODE_OPTIONS}
                value={picker.mode}
                onChange={(next) => picker.setMode(next as SelectionMode)}
              />
              {renderPanel()}
              {picker.mode === 'quick' && !picker.activeInfo.valid && (
                <Alert type="warning" showIcon message={picker.activeInfo.error} />
              )}
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
                <Button size="small" disabled={!picker.result} onClick={handleCopy}>
                  复制
                </Button>
                <Button
                  size="small"
                  type="primary"
                  disabled={!picker.result || !picker.historyAvailable}
                  onClick={handleSave}
                >
                  保存到历史
                </Button>
              </Space>
            }
          >
            {picker.result ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="blue">{picker.game.name}</Tag>
                  <Tag>{MODE_LABELS[picker.result.mode]}</Tag>
                  <Tag color="gold">共 {picker.result.combinations} 注</Tag>
                  <Tag color="gold">参考金额 {formatAmount(picker.result.amount)}</Tag>
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
        </Col>
      </Row>

      <Card
        title="本地历史"
        style={{ marginTop: 16 }}
        extra={
          <Popconfirm
            title="清空全部历史记录？"
            onConfirm={() => {
              const result = picker.clearAllHistory();
              if (result.ok) {
                message.success('历史记录已清空');
              } else {
                message.error(result.error);
              }
            }}
            okText="清空"
            cancelText="取消"
            disabled={picker.history.length === 0}
          >
            <Button size="small" danger disabled={picker.history.length === 0}>
              清空历史
            </Button>
          </Popconfirm>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {!picker.historyAvailable && (
            <Alert
              type="warning"
              showIcon
              message="本地存储不可用"
            />
          )}
          <HistoryList
            records={picker.history}
            onCopy={handleCopyRecord}
            onDelete={(id) => {
              const result = picker.deleteHistory(id);
              if (result.ok) {
                message.success('记录已删除');
              } else {
                message.error(result.error);
              }
            }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default App;
