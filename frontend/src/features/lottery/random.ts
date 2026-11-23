/**
 * 可注入随机源的随机工具。
 * 单测传入确定性随机源即可复现结果，业务代码使用 Math.random。
 */

/** 返回 [0, 1) 区间的随机数。 */
export type RandomSource = () => number;

/**
 * 生成 [min, max] 闭区间内的随机整数。
 * @param min 最小编号（含）
 * @param max 最大编号（含）
 * @param rng 随机源
 */
export const randomInt = (min: number, max: number, rng: RandomSource): number =>
  min + Math.floor(rng() * (max - min + 1));

/**
 * Fisher–Yates 洗牌，返回新数组，不修改入参。
 * @param items 原数组
 * @param rng 随机源
 */
export const shuffle = <T>(items: readonly T[], rng: RandomSource): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * 从 [min, max] 区间内不重复抽取 count 个号码，升序返回。
 * @param min 最小编号（含）
 * @param max 最大编号（含）
 * @param count 抽取个数
 * @param rng 随机源
 * @throws 当 count 超过区间容量时抛出错误，属于调用方参数错误。
 */
export const sampleDistinct = (
  min: number,
  max: number,
  count: number,
  rng: RandomSource,
): number[] => {
  const capacity = max - min + 1;
  if (count > capacity) {
    throw new Error(`抽取数量 ${count} 超过区间容量 ${capacity}`);
  }
  const pool = Array.from({ length: capacity }, (_, index) => min + index);
  return shuffle(pool, rng)
    .slice(0, count)
    .sort((a, b) => a - b);
};
