import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind 类名并处理冲突。
 * @param inputs 类名片段
 * @returns 合并后的类名
 */
export const cn = (...inputs: Array<string | false | null | undefined>): string =>
  twMerge(clsx(inputs));
