import { ZONE_COUNT, isBigNumber } from './analysis';
import {
  BALANCED_SAMPLE_SIZE,
  MAX_TICKETS,
  QUICK_PICK_MAX,
  QUICK_PICK_MIN,
  TICKET_PRICE,
} from './constants';
import type { RandomSource } from './random';
import { sampleDistinct } from './random';
import type { BallArea, GameConfig, QuickStrategy, TicketNumbers } from './types';
import { LotteryError } from './types';

/** 复式参数校验与组合信息。 */
export interface SelectionInfo {
  /** 是否通过校验。 */
  valid: boolean;
  /** 校验失败时的中文原因。 */
  error?: string;
  /** 组合注数。 */
  combinations: number;
  /** 参考金额（元）。 */
  amount: number;
}

/**
 * 计算组合数 C(n, k)。
 * 使用乘除交替计算，避免阶乘溢出；非法输入返回 0。
 */
export const combinationCount = (n: number, k: number): number => {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) {
    return 0;
  }
  const kk = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= kk; i += 1) {
    result = (result * (n - kk + i)) / i;
  }
  return Math.round(result);
};

/**
 * 枚举从 items 中取 k 个的全部组合。
 * @param items 候选号码（应已升序、去重）
 * @param k 每组个数
 * @param limit 最多枚举多少组，达到后停止，防止组合爆炸
 */
export const combinationsOf = <T>(items: readonly T[], k: number, limit: number): T[][] => {
  if (k < 0 || k > items.length || limit <= 0) {
    return [];
  }
  if (k === 0) {
    return [[]];
  }
  const result: T[][] = [];
  const current: T[] = [];

  const backtrack = (start: number): void => {
    if (result.length >= limit) {
      return;
    }
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    // 剩余可用数量不足以凑满 k 个时提前剪枝
    const remainingNeeded = k - current.length;
    for (let i = start; i <= items.length - remainingNeeded; i += 1) {
      current.push(items[i]);
      backtrack(i + 1);
      current.pop();
      if (result.length >= limit) {
        return;
      }
    }
  };

  backtrack(0);
  return result;
};

/** 校验号码数组是否非空、在区域范围内且无重复（顺序由调用方保证）。 */
const isLegalNumberSet = (area: BallArea, numbers: readonly number[]): boolean => {
  if (numbers.length === 0) {
    return false;
  }
  const seen = new Set<number>();
  for (const value of numbers) {
    if (!Number.isInteger(value) || value < area.min || value > area.max || seen.has(value)) {
      return false;
    }
    seen.add(value);
  }
  return true;
};

/**
 * 计算「均衡」策略下某个号码集合的偏差分。
 * 分数越小表示越接近目标：奇偶均衡、大小均衡、和值居中、三区均匀。
 */
const scoreBalancedCandidate = (area: BallArea, numbers: readonly number[]): number => {
  const { min, max, count } = area;
  const oddCount = numbers.filter((value) => value % 2 === 1).length;
  const bigCount = numbers.filter((value) => isBigNumber(area, value)).length;

  const targetHalf = count / 2;
  const parityDeviation = Math.abs(oddCount - targetHalf);
  const sizeDeviation = Math.abs(bigCount - targetHalf);

  // 和值目标：最小 count 个号码之和与最大 count 个号码之和的中点
  const minSum = ((min + (min + count - 1)) * count) / 2;
  const maxSum = ((max - count + 1 + max) * count) / 2;
  const idealSum = (minSum + maxSum) / 2;
  const actualSum = numbers.reduce((total, value) => total + value, 0);
  // 归一化到 0–1，再乘以权重 6，使其与奇偶/大小偏差量级接近
  const sumDeviation = (Math.abs(actualSum - idealSum) / (maxSum - minSum || 1)) * 6;

  // 三区分布：把号码范围三等分，统计每区个数，目标每区 count/ZONE_COUNT
  const zoneSize = Math.ceil((max - min + 1) / ZONE_COUNT);
  const zoneCounts = Array.from({ length: ZONE_COUNT }, () => 0);
  for (const value of numbers) {
    const zoneIndex = Math.min(
      ZONE_COUNT - 1,
      Math.floor((value - min) / zoneSize),
    );
    zoneCounts[zoneIndex] += 1;
  }
  const zoneDeviation = zoneCounts.reduce(
    (total, zoneCount) => total + Math.abs(zoneCount - count / ZONE_COUNT),
    0,
  );

  return parityDeviation + sizeDeviation + sumDeviation + zoneDeviation;
};

/**
 * 均衡策略采样：多次随机采样，取偏差分最小的候选。
 * 单测可通过注入确定性 rng 复现结果。
 */
const sampleBalanced = (area: BallArea, rng: RandomSource): number[] => {
  // 单号/双号区域（蓝球、大乐透后区）的「均衡」会退化成固定组合，
  // 因此小区域直接随机，避免出现永远只能选 08/09 或和值固定的配对。
  if (area.count <= 2) {
    return sampleDistinct(area.min, area.max, area.count, rng);
  }

  let best: number[] = [];
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < BALANCED_SAMPLE_SIZE; attempt += 1) {
    const candidate = sampleDistinct(area.min, area.max, area.count, rng);
    const score = scoreBalancedCandidate(area, candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
};

/**
 * 生成单注机选号码。
 * @param game 彩种规则
 * @param strategy 随机或均衡
 * @param rng 随机源
 */
export const generateQuickTicket = (
  game: GameConfig,
  strategy: QuickStrategy,
  rng: RandomSource = Math.random,
): TicketNumbers => {
  const numbers: TicketNumbers = {};
  for (const area of game.areas) {
    numbers[area.key] =
      strategy === 'balanced'
        ? sampleBalanced(area, rng)
        : sampleDistinct(area.min, area.max, area.count, rng);
  }
  return numbers;
};

/**
 * 生成多注机选号码。
 * @param game 彩种规则
 * @param count 注数，必须在 1–10 之间
 * @param strategy 随机或均衡
 * @param rng 随机源
 * @throws LotteryError 当注数非法时
 */
export const generateQuickTickets = (
  game: GameConfig,
  count: number,
  strategy: QuickStrategy,
  rng: RandomSource = Math.random,
): TicketNumbers[] => {
  if (!Number.isInteger(count) || count < QUICK_PICK_MIN || count > QUICK_PICK_MAX) {
    throw new LotteryError(`机选注数必须是 ${QUICK_PICK_MIN}–${QUICK_PICK_MAX} 的整数`);
  }
  return Array.from({ length: count }, () => generateQuickTicket(game, strategy, rng));
};

/**
 * 校验复式选号并计算组合数与金额。
 * @param game 彩种规则
 * @param selection 各区域已选号码
 */
export const calculateMultipleSelection = (
  game: GameConfig,
  selection: TicketNumbers,
): SelectionInfo => {
  let combinations = 1;

  for (const area of game.areas) {
    const numbers = selection[area.key] ?? [];
    // 先给出「数量不足」这种最常见、最可操作的原因，再检查范围与重复
    if (numbers.length < area.count) {
      return {
        valid: false,
        error: `${area.label}至少选择 ${area.count} 个号码`,
        combinations: 0,
        amount: 0,
      };
    }
    if (!isLegalNumberSet(area, numbers)) {
      return { valid: false, error: `${area.label}选择不合法`, combinations: 0, amount: 0 };
    }
    combinations *= combinationCount(numbers.length, area.count);
  }

  if (combinations > MAX_TICKETS) {
    return {
      valid: false,
      error: `组合数超过 ${MAX_TICKETS} 注，请减少所选号码`,
      combinations,
      amount: 0,
    };
  }

  return { valid: true, combinations, amount: combinations * TICKET_PRICE };
};

/**
 * 校验胆拖选号并计算组合数与金额。
 * 约定：第一个区域为胆拖区，其余区域按普通选号处理。
 * @param game 彩种规则
 * @param banker 胆码（仅主区）
 * @param drag 拖码（仅主区）
 * @param secondary 其余区域已选号码
 */
export const calculateBankerSelection = (
  game: GameConfig,
  banker: readonly number[],
  drag: readonly number[],
  secondary: TicketNumbers,
): SelectionInfo => {
  const [primary, ...restAreas] = game.areas;
  const uniqueBanker = new Set(banker);
  const uniqueDrag = new Set(drag);

  if (uniqueBanker.size !== banker.length || uniqueDrag.size !== drag.length) {
    return { valid: false, error: '胆码或拖码存在重复号码', combinations: 0, amount: 0 };
  }
  if (banker.length === 0) {
    return { valid: false, error: '请至少选择 1 个胆码', combinations: 0, amount: 0 };
  }
  if (!isLegalNumberSet(primary, banker)) {
    return { valid: false, error: `${primary.label}胆码选择不合法`, combinations: 0, amount: 0 };
  }
  if (banker.length >= primary.count) {
    return {
      valid: false,
      error: `胆码必须少于 ${primary.count} 个`,
      combinations: 0,
      amount: 0,
    };
  }
  for (const value of drag) {
    if (uniqueBanker.has(value)) {
      return { valid: false, error: '胆码与拖码不能重复', combinations: 0, amount: 0 };
    }
  }
  const needFromDrag = primary.count - banker.length;
  if (drag.length < needFromDrag) {
    return {
      valid: false,
      error: `${primary.label}拖码至少还需要 ${needFromDrag} 个`,
      combinations: 0,
      amount: 0,
    };
  }
  if (!isLegalNumberSet(primary, drag)) {
    return { valid: false, error: `${primary.label}拖码选择不合法`, combinations: 0, amount: 0 };
  }

  let combinations = combinationCount(drag.length, needFromDrag);
  for (const area of restAreas) {
    const numbers = secondary[area.key] ?? [];
    if (numbers.length < area.count) {
      return {
        valid: false,
        error: `${area.label}至少选择 ${area.count} 个号码`,
        combinations: 0,
        amount: 0,
      };
    }
    if (!isLegalNumberSet(area, numbers)) {
      return { valid: false, error: `${area.label}选择不合法`, combinations: 0, amount: 0 };
    }
    combinations *= combinationCount(numbers.length, area.count);
  }

  if (combinations > MAX_TICKETS) {
    return {
      valid: false,
      error: `组合数超过 ${MAX_TICKETS} 注，请减少拖码或其他区域号码`,
      combinations,
      amount: 0,
    };
  }

  return { valid: true, combinations, amount: combinations * TICKET_PRICE };
};

/**
 * 生成胆拖的全部组合号码。
 * @param game 彩种规则
 * @param banker 胆码（仅主区）
 * @param drag 拖码（仅主区）
 * @param secondary 其余区域已选号码
 * @throws LotteryError 参数非法或组合数超限时
 */
export const generateBankerTickets = (
  game: GameConfig,
  banker: readonly number[],
  drag: readonly number[],
  secondary: TicketNumbers,
): TicketNumbers[] => {
  const info = calculateBankerSelection(game, banker, drag, secondary);
  if (!info.valid) {
    throw new LotteryError(info.error ?? '胆拖参数不合法');
  }

  const [primary, ...restAreas] = game.areas;
  const needFromDrag = primary.count - banker.length;
  const primaryCombos = combinationsOf([...drag].sort((a, b) => a - b), needFromDrag, MAX_TICKETS);

  // 其余区域同样允许复选，逐区展开组合
  const secondaryCombosList = restAreas.map((area) => {
    const numbers = [...(secondary[area.key] ?? [])].sort((a, b) => a - b);
    return { area, combos: combinationsOf(numbers, area.count, MAX_TICKETS) };
  });

  const tickets: TicketNumbers[] = [];

  const buildSecondary = (index: number, partial: TicketNumbers): void => {
    if (index >= secondaryCombosList.length) {
      for (const primaryCombo of primaryCombos) {
        if (tickets.length >= MAX_TICKETS) {
          return;
        }
        const ticket: TicketNumbers = {
          ...partial,
          [primary.key]: [...banker, ...primaryCombo].sort((a, b) => a - b),
        };
        tickets.push(ticket);
      }
      return;
    }
    const { area, combos } = secondaryCombosList[index];
    for (const combo of combos) {
      buildSecondary(index + 1, { ...partial, [area.key]: [...combo] });
    }
  };

  buildSecondary(0, {});
  return tickets.slice(0, MAX_TICKETS);
};

