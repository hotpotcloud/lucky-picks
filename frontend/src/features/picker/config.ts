import type { GameConfig, GameId } from './types';

/**
 * 红蓝玩法规则：红球 1–33 选 6，蓝球 1–16 选 1。
 * 数组顺序即页面展示顺序，第一个区域为主区。
 */
export const REDBLUE_CONFIG: GameConfig = {
  id: 'redblue',
  name: '红蓝玩法',
  description: '红球 1–33 选 6 个，蓝球 1–16 选 1 个，每注 2 元。',
  areas: [
    { key: 'red', label: '红球', min: 1, max: 33, count: 6, color: 'red' },
    { key: 'blue', label: '蓝球', min: 1, max: 16, count: 1, color: 'blue' },
  ],
};

/**
 * 前后玩法规则：前区 1–35 选 5，后区 1–12 选 2。
 * 数组顺序即页面展示顺序，第一个区域为主区。
 */
export const FRONTBACK_CONFIG: GameConfig = {
  id: 'frontback',
  name: '前后玩法',
  description: '前区 1–35 选 5 个，后区 1–12 选 2 个，每注 2 元。',
  areas: [
    { key: 'front', label: '前区', min: 1, max: 35, count: 5, color: 'red' },
    { key: 'back', label: '后区', min: 1, max: 12, count: 2, color: 'blue' },
  ],
};

/** 全部玩法配置，key 为玩法标识。 */
export const GAME_CONFIGS: Record<GameId, GameConfig> = {
  redblue: REDBLUE_CONFIG,
  frontback: FRONTBACK_CONFIG,
};

/** 页面切玩法时的默认选项顺序。 */
export const GAME_ORDER: GameId[] = ['redblue', 'frontback'];
