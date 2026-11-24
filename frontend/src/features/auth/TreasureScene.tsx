/** 初始页 3D 聚宝盆场景：纯 CSS 透视与金币雨，不引入额外渲染依赖。 */

import type { CSSProperties } from 'react';

/** 金币下落参数，使用确定性配置避免每次渲染跳动。 */
const COINS = [
  { x: '16%', size: 20, delay: '0s', duration: '3.8s', drift: '-14px' },
  { x: '27%', size: 14, delay: '1.4s', duration: '4.4s', drift: '10px' },
  { x: '38%', size: 24, delay: '0.7s', duration: '4.1s', drift: '-6px' },
  { x: '48%', size: 17, delay: '2.3s', duration: '3.6s', drift: '12px' },
  { x: '57%', size: 22, delay: '0.2s', duration: '4.6s', drift: '-12px' },
  { x: '66%', size: 15, delay: '1.8s', duration: '3.9s', drift: '8px' },
  { x: '75%', size: 25, delay: '0.9s', duration: '4.3s', drift: '-10px' },
  { x: '84%', size: 18, delay: '2.8s', duration: '3.7s', drift: '14px' },
  { x: '33%', size: 12, delay: '3.2s', duration: '4.8s', drift: '6px' },
  { x: '70%', size: 13, delay: '3.6s', duration: '4.2s', drift: '-8px' },
];

/** 盆沿金币堆叠位置。 */
const PILE = [
  { x: '35%', y: '58%', size: 20, rotate: '-18deg' },
  { x: '45%', y: '50%', size: 24, rotate: '12deg' },
  { x: '55%', y: '56%', size: 22, rotate: '-8deg' },
  { x: '64%', y: '62%', size: 18, rotate: '20deg' },
  { x: '50%', y: '66%', size: 26, rotate: '0deg' },
];

/** 光点位置。 */
const SPARKLES = [
  { x: '12%', y: '32%', delay: '0s' },
  { x: '23%', y: '18%', delay: '1.2s' },
  { x: '78%', y: '24%', delay: '0.5s' },
  { x: '88%', y: '40%', delay: '1.8s' },
  { x: '32%', y: '70%', delay: '2.2s' },
  { x: '68%', y: '74%', delay: '0.9s' },
];

/** 自定义 CSS 变量类型。 */
type CoinStyle = CSSProperties & {
  '--coin-x': string;
  '--coin-size': string;
  '--coin-delay': string;
  '--coin-duration': string;
  '--coin-drift': string;
};

/**
 * 聚宝盆场景。
 */
export const TreasureScene = () => (
  <div className="treasure-scene" aria-hidden="true">
    <div className="treasure-orbit" />
    <div className="treasure-halo" />

    <div className="coin-rain">
      {COINS.map((coin, index) => (
        <span
          key={`coin-${index}`}
          className="falling-coin"
          style={
            {
              '--coin-x': coin.x,
              '--coin-size': `${coin.size}px`,
              '--coin-delay': coin.delay,
              '--coin-duration': coin.duration,
              '--coin-drift': coin.drift,
            } as CoinStyle
          }
        >
          <span className="coin-face" />
        </span>
      ))}
    </div>

    <div className="treasure-bowl">
      <div className="bowl-rim">
        <div className="bowl-inner">
          {PILE.map((coin, index) => (
            <span
              key={`pile-${index}`}
              className="pile-coin"
              style={{
                left: coin.x,
                top: coin.y,
                width: `${coin.size}px`,
                height: `${coin.size}px`,
                transform: `translate(-50%, -50%) rotate(${coin.rotate})`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="bowl-body">
        <span className="bowl-shine" />
        <span className="bowl-emblem">LP</span>
      </div>
      <div className="bowl-foot" />
      <div className="bowl-shadow" />
    </div>

    <div className="treasure-sparkles">
      {SPARKLES.map((sparkle, index) => (
        <span
          key={`sparkle-${index}`}
          className="treasure-sparkle"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            animationDelay: sparkle.delay,
          }}
        />
      ))}
    </div>
  </div>
);

export default TreasureScene;
