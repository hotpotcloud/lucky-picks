/** 财神水印互动浮层。 */

import type { CaishenEgg } from './useCaishenEggs';

interface CaishenEggsProps {
  eggs: CaishenEgg[];
}

/** 渲染漂浮祝福；装饰层不拦截点击，也不进入无障碍树。 */
export const CaishenEggs = ({ eggs }: CaishenEggsProps) => (
  <div className="caishen-egg-layer" aria-hidden="true">
    {eggs.map((egg) => (
      <span
        key={egg.id}
        className={egg.special ? 'caishen-egg is-special' : 'caishen-egg'}
        style={{ left: egg.x, top: egg.y }}
      >
        {egg.text}
      </span>
    ))}
  </div>
);
