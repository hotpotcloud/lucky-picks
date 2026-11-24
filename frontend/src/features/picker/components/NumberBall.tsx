import { formatBall } from '../format';

/** 号码球展示组件属性。 */
interface NumberBallProps {
  /** 号码值，展示时补零。 */
  value: number;
  /** 颜色语义，红球/前区为 red，蓝球/后区为 blue。 */
  color: 'red' | 'blue';
  /** 尺寸，small 用于历史列表预览。 */
  size?: 'default' | 'small';
  /** 胆拖语义：banker 为胆码，drag 为拖码。 */
  variant?: 'banker' | 'drag';
}

/**
 * 只读号码球。
 * 颜色来自玩法区域配置，视觉样式集中在 index.css。
 */
const NumberBall = ({ value, color, size = 'default', variant }: NumberBallProps) => {
  const className = [
    'number-ball',
    `ball-${color}`,
    size === 'small' ? 'ball-small' : '',
    variant ? `ball-${variant}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={className}>{formatBall(value)}</span>;
};

export default NumberBall;
