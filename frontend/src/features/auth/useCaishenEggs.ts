/** 财神水印互动：点击水印时生成短暂漂浮的祝福文字。 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** 互动数据。 */
export interface CaishenEgg {
  id: number;
  x: number;
  y: number;
  text: string;
  special: boolean;
}

const BLESSINGS = [
  '财神到，好运来',
  '今日宜：机选一注',
  '心诚则灵，量力而行',
  '历史不改变概率，理性选号',
];

const SPECIAL_TEXT = '财神赐号：08 18 28（仅供娱乐）';

/** 同时保留的互动数量，避免连续点击时堆积。 */
const MAX_EGGS = 6;

/** 单个互动的展示时长（毫秒）。 */
const EGG_LIFETIME = 1600;

/**
 * 管理财神水印互动。
 * 每点击 5 次触发一次“财神赐号”，其余点击随机展示一句祝福。
 */
export const useCaishenEggs = () => {
  const [eggs, setEggs] = useState<CaishenEgg[]>([]);
  const sequence = useRef(0);
  const clickCount = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const spawnEgg = useCallback((x: number, y: number) => {
    clickCount.current += 1;
    const special = clickCount.current % 5 === 0;
    const text = special
      ? SPECIAL_TEXT
      : BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
    const egg: CaishenEgg = {
      id: sequence.current,
      x,
      y,
      text,
      special,
    };
    sequence.current += 1;

    setEggs((previous) => [...previous.slice(-(MAX_EGGS - 1)), egg]);
    const timer = window.setTimeout(() => {
      setEggs((previous) => previous.filter((item) => item.id !== egg.id));
    }, EGG_LIFETIME);
    timers.current.push(timer);
  }, []);

  return { eggs, spawnEgg };
};
