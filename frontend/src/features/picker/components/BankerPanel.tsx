import { Alert, Button, Space, Tag, Tooltip, Typography } from 'antd';
import type { SelectionInfo } from '../generator';
import type { AreaKey, GameConfig, TicketNumbers } from '../types';
import NumberGrid from './NumberGrid';

/** 胆拖参数面板属性。 */
interface BankerPanelProps {
  /** 玩法规则，第一个区域为胆拖区。 */
  game: GameConfig;
  /** 胆码。 */
  banker: readonly number[];
  /** 拖码。 */
  drag: readonly number[];
  /** 其余区域已选号码。 */
  selections: TicketNumbers;
  /** 主区号码循环切换回调。 */
  onCycle: (value: number) => void;
  /** 副区号码切换回调。 */
  onToggle: (areaKey: AreaKey, value: number) => void;
  /** 当前校验与组合信息。 */
  info: SelectionInfo;
  /** 机选填充回调。 */
  onQuickFill: () => void;
}

/**
 * 胆拖选号面板。
 * 主区号码通过点击循环切换「未选 → 拖码 → 胆码 → 未选」，其余区域按普通选号处理。
 */
const BankerPanel = ({
  game,
  banker,
  drag,
  selections,
  onCycle,
  onToggle,
  info,
  onQuickFill,
}: BankerPanelProps) => {
  const [primary, ...secondaryAreas] = game.areas;

  /** 返回主区号码的胆拖语义状态。 */
  const statusOf = (value: number): 'banker' | 'drag' | undefined => {
    if (banker.includes(value)) {
      return 'banker';
    }
    if (drag.includes(value)) {
      return 'drag';
    }
    return undefined;
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Button block onClick={onQuickFill}>
        机选填充
      </Button>
      <div>
        <Typography.Text strong>
          {primary.label}（胆码 {banker.length}，拖码 {drag.length}）
        </Typography.Text>
        <Space wrap size={4} style={{ marginLeft: 8 }}>
          <Tooltip title={`点击号码切换：未选 → 拖码 → 胆码 → 未选；胆码必须少于 ${primary.count} 个`}>
            <Tag color="gold">胆码</Tag>
          </Tooltip>
          <Tooltip title="未选中的号码可加入拖码">
            <Tag color="blue">拖码</Tag>
          </Tooltip>
        </Space>
        <div style={{ marginTop: 8 }}>
          <NumberGrid
            area={primary}
            selected={[]}
            statusOf={statusOf}
            onToggle={onCycle}
          />
        </div>
      </div>

      {secondaryAreas.map((area) => {
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
};

export default BankerPanel;
