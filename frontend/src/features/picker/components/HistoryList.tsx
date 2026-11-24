import { Button, Empty, List, Popconfirm, Space, Tag, Typography } from 'antd';
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
  <List
    dataSource={[...records]}
    locale={{ emptyText: <Empty description="暂无历史记录" /> }}
    renderItem={(record) => {
      const game = GAME_CONFIGS[record.gameId];
      const preview = record.tickets[0];

      return (
        <List.Item
          actions={[
            <Button key="copy" type="link" size="small" onClick={() => onCopy(record)}>
              复制
            </Button>,
            <Popconfirm
              key="delete"
              title="删除这条记录？"
              onConfirm={() => onDelete(record.id)}
              okText="删除"
              cancelText="取消"
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>,
          ]}
        >
          <List.Item.Meta
            title={
              <Space wrap size={4}>
                <Tag color="blue">{record.gameName}</Tag>
                <Tag>{MODE_LABELS[record.mode]}</Tag>
                <Typography.Text type="secondary">
                  {new Date(record.createdAt).toLocaleString()}
                </Typography.Text>
              </Space>
            }
            description={
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {preview && (
                  <Space wrap size={2}>
                    {game.areas.map((area) => (
                      <span className="ticket-area" key={area.key}>
                        <Typography.Text type="secondary">{area.label}</Typography.Text>
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
                  </Space>
                )}
                <Typography.Text type="secondary">
                  共 {record.combinationCount} 注 · 参考金额{' '}
                  {formatAmount(record.amount ?? record.combinationCount * TICKET_PRICE)}
                  {record.tickets.length > 1 ? '（首注预览）' : ''}
                </Typography.Text>
                {record.ticketsTruncated && (
                  <Typography.Text type="warning">
                    历史中仅保存前 {record.tickets.length} 注号码
                  </Typography.Text>
                )}
              </Space>
            }
          />
        </List.Item>
      );
    }}
  />
);

export default HistoryList;
