import type { QuickStrategy, SelectionMode } from './types';

/** 选号模式的中文展示名。 */
export const MODE_LABELS: Record<SelectionMode, string> = {
  quick: '机选',
  multiple: '复式',
  banker: '胆拖',
};

/** 机选策略的中文展示名。 */
export const STRATEGY_LABELS: Record<QuickStrategy, string> = {
  random: '随机',
  balanced: '均衡分布',
};
