import { GAME_CONFIGS, GAME_ORDER } from '../config';
import type { GameId } from '../types';
import { Segmented, Typography } from 'antd';

/** 玩法切换组件属性。 */
interface GameSwitcherProps {
  /** 当前玩法。 */
  value: GameId;
  /** 切换回调。 */
  onChange: (value: GameId) => void;
}

/**
 * 玩法切换与规则说明。
 * 使用 antd Segmented，避免自创切换控件。
 */
const GameSwitcher = ({ value, onChange }: GameSwitcherProps) => {
  const options = GAME_ORDER.map((id) => ({
    label: GAME_CONFIGS[id].name,
    value: id,
  }));
  const game = GAME_CONFIGS[value];

  return (
    <div>
      <Segmented
        block
        options={options}
        value={value}
        onChange={(next) => onChange(next as GameId)}
      />
      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
        {game.description}
      </Typography.Paragraph>
    </div>
  );
};

export default GameSwitcher;
