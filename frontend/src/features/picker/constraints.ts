import type { BallArea } from './types';

/** 单式机选的可选手动条件。空值表示沿用策略默认行为。 */
export interface QuickConstraints {
  oddCount: number | null;
  bigCount: number | null;
  sum: number | null;
  zoneCounts: [number | null, number | null, number | null];
}

/** 推荐接口支持的主区精确约束。 */
export interface RecommendationConstraints {
  oddEven?: [number, number];
  bigSmall?: [number, number];
  sumRange?: [number, number];
  zoneCounts?: [number, number, number];
}

/** 约束转换结果。 */
export interface ConstraintBuildResult {
  valid: boolean;
  error?: string;
  constraints?: RecommendationConstraints;
}

/** 创建无手动覆盖的默认状态。 */
export const createEmptyQuickConstraints = (): QuickConstraints => ({
  oddCount: null,
  bigCount: null,
  sum: null,
  zoneCounts: [null, null, null],
});

/** 将 number 输入值转换为可选整数；undefined 表示格式非法。 */
export const parseOptionalInteger = (value: string): number | null | undefined => {
  if (value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
};

const isValidCount = (value: number | null, total: number): boolean =>
  value === null || (Number.isInteger(value) && value >= 0 && value <= total);

const getSumBounds = (area: BallArea): [number, number] => {
  const minimum = ((area.min + area.min + area.count - 1) * area.count) / 2;
  const maximum = ((area.max - area.count + 1 + area.max) * area.count) / 2;
  return [minimum, maximum];
};

const getZoneCapacities = (area: BallArea): [number, number, number] => {
  const zoneSize = Math.ceil((area.max - area.min + 1) / 3);
  const capacities: [number, number, number] = [0, 0, 0];
  for (let number = area.min; number <= area.max; number += 1) {
    const zoneIndex = Math.min(2, Math.floor((number - area.min) / zoneSize));
    capacities[zoneIndex] += 1;
  }
  return capacities;
};

/** 将页面输入转换为后端精确约束，并校验当前玩法可实现范围。 */
export const buildRecommendationConstraints = (
  values: QuickConstraints,
  primaryArea: BallArea,
): ConstraintBuildResult => {
  if (!isValidCount(values.oddCount, primaryArea.count)) {
    return { valid: false, error: `奇:偶数量必须在 0–${primaryArea.count} 之间` };
  }
  if (!isValidCount(values.bigCount, primaryArea.count)) {
    return { valid: false, error: `大:小数量必须在 0–${primaryArea.count} 之间` };
  }

  const [minimumSum, maximumSum] = getSumBounds(primaryArea);
  if (
    values.sum !== null &&
    (!Number.isInteger(values.sum) || values.sum < minimumSum || values.sum > maximumSum)
  ) {
    return { valid: false, error: `和值必须在 ${minimumSum}–${maximumSum} 之间` };
  }

  const filledZoneCounts = values.zoneCounts.filter((value) => value !== null);
  if (filledZoneCounts.length > 0 && filledZoneCounts.length < 3) {
    return { valid: false, error: '一区:二区:三区需要完整填写' };
  }
  if (
    filledZoneCounts.some(
      (value) => !Number.isInteger(value) || value < 0 || value > primaryArea.count,
    )
  ) {
    return { valid: false, error: `三区数量必须在 0–${primaryArea.count} 之间` };
  }
  if (
    filledZoneCounts.length === 3 &&
    filledZoneCounts.reduce((total, value) => total + value, 0) !== primaryArea.count
  ) {
    return { valid: false, error: `三区比例总和必须为 ${primaryArea.count}` };
  }
  if (filledZoneCounts.length === 3) {
    const zoneCapacities = getZoneCapacities(primaryArea);
    const exceededIndex = filledZoneCounts.findIndex(
      (value, index) => value > zoneCapacities[index],
    );
    if (exceededIndex >= 0) {
      return {
        valid: false,
        error: `${['一区', '二区', '三区'][exceededIndex]}最多可选 ${zoneCapacities[exceededIndex]} 个号码`,
      };
    }
  }

  const constraints: RecommendationConstraints = {};
  if (values.oddCount !== null) {
    constraints.oddEven = [values.oddCount, values.oddCount];
  }
  if (values.bigCount !== null) {
    constraints.bigSmall = [values.bigCount, values.bigCount];
  }
  if (values.sum !== null) {
    constraints.sumRange = [values.sum, values.sum];
  }
  if (filledZoneCounts.length === 3) {
    constraints.zoneCounts = filledZoneCounts as [number, number, number];
  }

  return Object.keys(constraints).length > 0
    ? { valid: true, constraints }
    : { valid: true };
};
