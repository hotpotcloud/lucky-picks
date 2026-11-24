import { describe, expect, it } from 'vitest';
import { REDBLUE_CONFIG, FRONTBACK_CONFIG } from './config';
import {
  buildRecommendationConstraints,
  createEmptyQuickConstraints,
  parseOptionalInteger,
} from './constraints';

describe('单式手动约束', () => {
  it('全部留空时不发送 constraints', () => {
    const result = buildRecommendationConstraints(
      createEmptyQuickConstraints(),
      REDBLUE_CONFIG.areas[0],
    );

    expect(result).toEqual({ valid: true });
  });

  it('按精确值构造后端约束', () => {
    const result = buildRecommendationConstraints(
      {
        oddCount: 3,
        bigCount: 3,
        sum: 103,
        zoneCounts: [2, 2, 2],
      },
      REDBLUE_CONFIG.areas[0],
    );

    expect(result).toEqual({
      valid: true,
      constraints: {
        oddEven: [3, 3],
        bigSmall: [3, 3],
        sumRange: [103, 103],
        zoneCounts: [2, 2, 2],
      },
    });
  });

  it('比例总和由当前玩法主区数量决定', () => {
    const result = buildRecommendationConstraints(
      {
        oddCount: 3,
        bigCount: 2,
        sum: null,
        zoneCounts: [2, 2, 2],
      },
      FRONTBACK_CONFIG.areas[0],
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('三区比例总和必须为 5');
  });

  it('和值超出当前玩法理论范围时拒绝', () => {
    const result = buildRecommendationConstraints(
      {
        oddCount: null,
        bigCount: null,
        sum: 1,
        zoneCounts: [null, null, null],
      },
      REDBLUE_CONFIG.areas[0],
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('和值必须在 21–183');
  });

  it('数字输入空串转 null，非整数由纯函数拒绝', () => {
    expect(parseOptionalInteger('')).toBeNull();
    expect(parseOptionalInteger('3')).toBe(3);
    expect(parseOptionalInteger('3.5')).toBeUndefined();
    expect(parseOptionalInteger('abc')).toBeUndefined();
  });

  it('三区数量不能超过当前分区可选号码容量', () => {
    const compactArea = {
      ...FRONTBACK_CONFIG.areas[0],
      min: 1,
      max: 9,
      count: 4,
    };
    const result = buildRecommendationConstraints(
      {
        oddCount: null,
        bigCount: null,
        sum: null,
        zoneCounts: [4, 0, 0],
      },
      compactArea,
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('一区最多可选 3 个号码');
  });
});
