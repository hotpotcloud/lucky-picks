import { Alert, Space, Tag, Typography } from 'antd';
import type { SelectionInfo } from '../generator';
import type { AreaKey, GameConfig, TicketNumbers } from '../types';
import NumberGrid from './NumberGrid';

/** 复式参数面板属性。 */
interface MultiplePanelProps {
  /** 彩种规则。 */
  game: GameConfig;
  /** 各区域已选号码。 */
  selections: TicketNumbers;
  /** 切换号码回调。 */
  onToggle: (areaKey: AreaKey, value: number) => void;
  /** 当前校验与组合信息。 */
  info: SelectionInfo;
}

/**
 * 复式选号面板：逐个区域展示选号网格，并实时反馈组合数与金额。
 */
const MultiplePanel = ({ game, selections, onToggle, info }: MultiplePanelProps) => (
  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    {game.areas.map((area) => {
      const selected = selections[area.key] ?? [];
      return (
        <div key={area.key}>
          <Typography.Text strong>
            {area.label}（已选 {selected.length}，至少 {area.count}）
          </Typography.Text>
          <div style={{ marginTop: 8 }}>
            <NumberGrid
              area={area}
              selected={selected}
              onToggle={(value) => onToggle(area.key, value)}
            />
          </div>
        </div>
      );
    })}

    {info.valid ? (
      <Space wrap>
        <Tag color="blue">共 {info.combinations} 注</Tag>
        <Tag color="gold">参考金额 {info.amount} 元</Tag>
      </Space>
    ) : (
      <Alert type="warning" showIcon message={info.error} />
    )}
  </Space>
);

export default MultiplePanel;
