/** 四角水印：淡色财神图片，88px；登录后点击可触发隐藏互动。 */

import { useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { CaishenEggs } from '../features/auth/CaishenEggs';
import { useCaishenEggs } from '../features/auth/useCaishenEggs';

const CORNERS = [
  'wm-top-left',
  'wm-top-right',
  'wm-bottom-left',
  'wm-bottom-right',
];

/** 水印尺寸与边距，用于判断点击是否落在四角水印区域。 */
const WATERMARK_SIZE = 88;
const WATERMARK_INSET_X = 12;
const WATERMARK_INSET_Y = 8;
const WATERMARK_TOLERANCE = 8;

/**
 * 水印层组件。
 */
const Watermark = () => {
  const { user } = useAuth();
  const { eggs, spawnEgg } = useCaishenEggs();

  useEffect(() => {
    if (!user) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      // 不抢占按钮、链接、表单等真实交互控件的点击。
      if (
        target?.closest(
          'button, a, input, select, textarea, [role="button"], [contenteditable="true"]',
        )
      ) {
        return;
      }
      const left = WATERMARK_INSET_X;
      const right = window.innerWidth - WATERMARK_INSET_X - WATERMARK_SIZE;
      const top = WATERMARK_INSET_Y;
      const bottom = window.innerHeight - WATERMARK_INSET_Y - WATERMARK_SIZE;
      const within = (value: number, start: number) =>
        value >= start - WATERMARK_TOLERANCE &&
        value <= start + WATERMARK_SIZE + WATERMARK_TOLERANCE;
      const nearCorner = [
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom],
      ].some(
        ([x, y]) =>
          within(event.clientX, x) && within(event.clientY, y),
      );
      if (!nearCorner) {
        return;
      }
      spawnEgg(event.clientX, event.clientY);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [user, spawnEgg]);

  if (!user) {
    return (
      <div className="watermark-layer" aria-hidden="true">
        {CORNERS.map((corner) => (
          <img
            key={corner}
            src={`${import.meta.env.BASE_URL}caishen-watermark.png`}
            alt=""
            className={`watermark-img ${corner}`}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="watermark-layer" aria-hidden="true">
        {CORNERS.map((corner) => (
          <img
            key={corner}
            src={`${import.meta.env.BASE_URL}caishen-watermark.png`}
            alt=""
            className={`watermark-img ${corner}`}
          />
        ))}
      </div>
      <CaishenEggs eggs={eggs} />
    </>
  );
};

export default Watermark;
