import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_STORAGE_KEY } from '../features/lottery/constants';
import type { HistoryRecord } from '../features/lottery/types';
import {
  addHistory,
  clearHistory,
  isHistoryAvailable,
  loadHistory,
  removeHistory,
  saveHistory,
} from './storage';

/** 构造一条历史记录用于测试。 */
const createRecord = (id: string, createdAt: number): HistoryRecord => ({
  id,
  gameId: 'ssq',
  gameName: '双色球',
  mode: 'quick',
  tickets: [{ red: [1, 2, 3, 4, 5, 6], blue: [7] }],
  combinationCount: 1,
  createdAt,
});

describe('storage（TC-012 / TC-015）', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('保存、读取、删除与清空', () => {
    expect(isHistoryAvailable()).toBe(true);

    const first = addHistory(createRecord('a', 1));
    expect(first).toHaveLength(1);

    const second = addHistory(createRecord('b', 2));
    expect(second).toHaveLength(2);
    // 新记录在前
    expect(second[0].id).toBe('b');

    const afterRemove = removeHistory('b');
    expect(afterRemove).toHaveLength(1);
    expect(loadHistory()[0].id).toBe('a');

    expect(clearHistory()).toEqual([]);
    expect(loadHistory()).toEqual([]);
  });

  it('数据损坏时返回空数组并清理坏数据', () => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, 'not-json');
    expect(loadHistory()).toEqual([]);
    expect(window.localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });

  it('过滤结构非法的记录', () => {
    const payload = JSON.stringify([
      createRecord('ok', 1),
      { id: 123, gameId: 'unknown' },
    ]);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, payload);
    const records = loadHistory();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('ok');
  });

  it('localStorage 不可用时降级（TC-015）', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(isHistoryAvailable()).toBe(false);
    expect(loadHistory()).toEqual([]);
    expect(saveHistory([createRecord('a', 1)])).toBe(false);
    expect(addHistory(createRecord('a', 1))).toEqual([]);
  });
});
