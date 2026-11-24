import { describe, expect, it } from 'vitest';
import { FRONTBACK_CONFIG, REDBLUE_CONFIG } from './config';
import {
  calculateBankerSelection,
  calculateMultipleSelection,
  combinationCount,
  combinationsOf,
  generateBankerTickets,
  generateQuickTickets,
} from './generator';
import type { RandomSource } from './random';
import { SelectionError } from './types';

/** 确定性伪随机源，保证测试可复现。 */
const createSeededRandom = (seed: number): RandomSource => {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** 判断号码是否升序且不重复。 */
const isSortedUnique = (values: readonly number[]): boolean =>
  values.every((value, index) => index === 0 || value > values[index - 1]);

describe('combinationCount', () => {
  it('计算常见组合数', () => {
    expect(combinationCount(7, 6)).toBe(7);
    expect(combinationCount(6, 4)).toBe(15);
    expect(combinationCount(33, 6)).toBe(1107568);
    expect(combinationCount(1, 1)).toBe(1);
  });

  it('非法输入返回 0', () => {
    expect(combinationCount(5, 6)).toBe(0);
    expect(combinationCount(-1, 1)).toBe(0);
    expect(combinationCount(5, -1)).toBe(0);
  });
});

describe('generateQuickTickets（TC-001 / TC-002）', () => {
  it('红蓝玩法单注号码合法且升序', () => {
    const tickets = generateQuickTickets(REDBLUE_CONFIG, 1, 'random', createSeededRandom(1));
    expect(tickets).toHaveLength(1);
    const reds = tickets[0].red ?? [];
    const blues = tickets[0].blue ?? [];
    expect(reds).toHaveLength(6);
    expect(blues).toHaveLength(1);
    expect(isSortedUnique(reds)).toBe(true);
    expect(reds.every((value) => value >= 1 && value <= 33)).toBe(true);
    expect(blues[0]).toBeGreaterThanOrEqual(1);
    expect(blues[0]).toBeLessThanOrEqual(16);
  });

  it('前后玩法三注号码合法', () => {
    const tickets = generateQuickTickets(FRONTBACK_CONFIG, 3, 'random', createSeededRandom(2));
    expect(tickets).toHaveLength(3);
    for (const ticket of tickets) {
      const fronts = ticket.front ?? [];
      const backs = ticket.back ?? [];
      expect(fronts).toHaveLength(5);
      expect(backs).toHaveLength(2);
      expect(isSortedUnique(fronts)).toBe(true);
      expect(isSortedUnique(backs)).toBe(true);
      expect(fronts.every((value) => value >= 1 && value <= 35)).toBe(true);
      expect(backs.every((value) => value >= 1 && value <= 12)).toBe(true);
    }
  });

  it('机选注数 1 与 10 均成功（TC-004）', () => {
    expect(generateQuickTickets(REDBLUE_CONFIG, 1, 'random', createSeededRandom(4))).toHaveLength(1);
    expect(generateQuickTickets(REDBLUE_CONFIG, 10, 'random', createSeededRandom(5))).toHaveLength(10);
  });

  it('机选注数非法时抛出业务错误（TC-004）', () => {
    expect(() => generateQuickTickets(REDBLUE_CONFIG, 0, 'random')).toThrow(SelectionError);
    expect(() => generateQuickTickets(REDBLUE_CONFIG, 11, 'random')).toThrow(SelectionError);
  });

  it('均衡策略的奇偶与大小偏差不超过 2（TC-003）', () => {
    const tickets = generateQuickTickets(REDBLUE_CONFIG, 10, 'balanced', createSeededRandom(3));
    for (const ticket of tickets) {
      const reds = ticket.red ?? [];
      const odd = reds.filter((value) => value % 2 === 1).length;
      const even = reds.length - odd;
      const big = reds.filter((value) => value >= 17).length;
      const small = reds.length - big;
      expect(Math.abs(odd - even)).toBeLessThanOrEqual(2);
      expect(Math.abs(big - small)).toBeLessThanOrEqual(2);

      // 和值应接近理论中点，三区分布不应严重偏科
      const sum = reds.reduce((total, value) => total + value, 0);
      expect(Math.abs(sum - 102)).toBeLessThanOrEqual(30);
      const zones = [0, 0, 0];
      for (const value of reds) {
        zones[Math.min(2, Math.floor((value - 1) / 11))] += 1;
      }
      expect(Math.max(...zones) - Math.min(...zones)).toBeLessThanOrEqual(2);
    }
  });

  it('均衡策略不会让蓝球/后区退化为固定号码（P1 回归）', () => {
    const rng = createSeededRandom(11);
    const ssqTickets = [
      ...generateQuickTickets(REDBLUE_CONFIG, 10, 'balanced', rng),
      ...generateQuickTickets(REDBLUE_CONFIG, 10, 'balanced', rng),
    ];
    const ssqBlues = new Set(ssqTickets.map((ticket) => ticket.blue?.[0]));
    expect(ssqBlues.size).toBeGreaterThanOrEqual(3);

    const dltRng = createSeededRandom(12);
    const dltTickets = [
      ...generateQuickTickets(FRONTBACK_CONFIG, 10, 'balanced', dltRng),
      ...generateQuickTickets(FRONTBACK_CONFIG, 10, 'balanced', dltRng),
    ];
    const dltBacks = new Set(dltTickets.map((ticket) => (ticket.back ?? []).join('-')));
    expect(dltBacks.size).toBeGreaterThanOrEqual(5);
  });
});

describe('calculateMultipleSelection（TC-005 / TC-009）', () => {
  it('红蓝玩法 7 红 1 蓝为 7 注、14 元', () => {
    const info = calculateMultipleSelection(REDBLUE_CONFIG, {
      red: [1, 2, 3, 4, 5, 6, 7],
      blue: [8],
    });
    expect(info.valid).toBe(true);
    expect(info.combinations).toBe(7);
    expect(info.amount).toBe(14);
  });

  it('号码不足时校验失败', () => {
    const info = calculateMultipleSelection(REDBLUE_CONFIG, { red: [1, 2, 3], blue: [8] });
    expect(info.valid).toBe(false);
    expect(info.error).toContain('至少选择');
  });

  it('存在重复号或超范围号码时校验失败', () => {
    const duplicate = calculateMultipleSelection(REDBLUE_CONFIG, {
      red: [1, 1, 2, 3, 4, 5],
      blue: [8],
    });
    expect(duplicate.valid).toBe(false);

    const outOfRange = calculateMultipleSelection(REDBLUE_CONFIG, {
      red: [1, 2, 3, 4, 5, 34],
      blue: [8],
    });
    expect(outOfRange.valid).toBe(false);
  });

  it('前后玩法复式组合数正确', () => {
    const info = calculateMultipleSelection(FRONTBACK_CONFIG, {
      front: [1, 2, 3, 4, 5, 6],
      back: [1, 2, 3],
    });
    expect(info.valid).toBe(true);
    expect(info.combinations).toBe(6 * 3);
    expect(info.amount).toBe(36);
  });

  it('组合数超限时校验失败（TC-009）', () => {
    const info = calculateMultipleSelection(REDBLUE_CONFIG, {
      red: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      blue: [8],
    });
    expect(info.valid).toBe(false);
    expect(info.combinations).toBe(1716);
    expect(info.error).toContain('超过');
  });
});

describe('calculateBankerSelection / generateBankerTickets（TC-006 / TC-007 / TC-008）', () => {
  it('红蓝玩法 2 胆 6 拖 1 蓝为 15 注，且每注包含全部胆码', () => {
    const banker = [1, 2];
    const drag = [3, 4, 5, 6, 7, 8];
    const info = calculateBankerSelection(REDBLUE_CONFIG, banker, drag, { blue: [8] });
    expect(info.valid).toBe(true);
    expect(info.combinations).toBe(15);
    expect(info.amount).toBe(30);

    const tickets = generateBankerTickets(REDBLUE_CONFIG, banker, drag, { blue: [8] });
    expect(tickets).toHaveLength(15);
    for (const ticket of tickets) {
      const reds = ticket.red ?? [];
      expect(reds).toHaveLength(6);
      expect(reds).toEqual(expect.arrayContaining(banker));
      expect(isSortedUnique(reds)).toBe(true);
    }
  });

  it('胆码数量等于基础数量时被拦截（TC-007）', () => {
    const info = calculateBankerSelection(REDBLUE_CONFIG, [1, 2, 3, 4, 5, 6], [7, 8], { blue: [8] });
    expect(info.valid).toBe(false);
    expect(info.error).toContain('胆码必须少于');
  });

  it('前后玩法胆拖会展开后区组合', () => {
    const tickets = generateBankerTickets(FRONTBACK_CONFIG, [1], [2, 3, 4, 5, 6, 7], {
      back: [1, 2, 3],
    });
    // C(6,4) * C(3,2) = 15 * 3 = 45
    expect(tickets).toHaveLength(45);
    for (const ticket of tickets) {
      expect(ticket.front).toContain(1);
      expect(ticket.back).toHaveLength(2);
    }
  });

  it('拖码不足时被拦截（TC-008）', () => {
    const info = calculateBankerSelection(REDBLUE_CONFIG, [1], [2, 3], { blue: [8] });
    expect(info.valid).toBe(false);
    expect(info.error).toContain('拖码至少还需要');
  });
});

describe('combinationsOf', () => {
  it('枚举组合并遵守上限', () => {
    expect(combinationsOf([1, 2, 3, 4], 2, 100)).toHaveLength(6);
    expect(combinationsOf([1, 2, 3, 4], 2, 3)).toHaveLength(3);
    expect(combinationsOf([1, 2, 3], 0, 10)).toEqual([[]]);
    expect(combinationsOf([1, 2, 3], 4, 10)).toEqual([]);
  });
});
