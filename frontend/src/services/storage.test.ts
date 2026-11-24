import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_STORAGE_KEY } from '../features/picker/constants';
import type { HistoryRecord } from '../features/picker/types';
import { isHistoryAvailable, loadHistory, saveHistory } from './storage';

/** 构造一条合法的历史记录用于测试。 */
const createRecord = (id: string, createdAt: number): HistoryRecord => ({
  id,
  gameId: 'redblue',
  gameName: '红蓝玩法',
  mode: 'quick',
  tickets: [{ red: [1, 2, 3, 4, 5, 6], blue: [7] }],
  combinationCount: 1,
  amount: 2,
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

  it('保存后可以读取，并按时间倒序', () => {
    expect(isHistoryAvailable()).toBe(true);
    expect(saveHistory([createRecord('a', 1), createRecord('b', 2)])).toBe(true);

    const records = loadHistory();
    expect(records).toHaveLength(2);
    expect(records[0].id).toBe('b');
    expect(records[1].id).toBe('a');
  });

  it('数据损坏时返回空数组并清理坏数据', () => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, 'not-json');
    expect(loadHistory()).toEqual([]);
    expect(window.localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });

  it('过滤结构或语义非法的记录（NaN、超范围、未知区域）', () => {
    const payload = JSON.stringify([
      createRecord('ok', 1),
      { ...createRecord('nan-count', 2), combinationCount: Number.NaN },
      { ...createRecord('bad-date', 3), createdAt: Number.NaN },
      {
        ...createRecord('out-of-range', 4),
        tickets: [{ red: [1, 2, 3, 4, 5, 99], blue: [7] }],
      },
      {
        ...createRecord('unknown-area', 5),
        tickets: [{ red: [1, 2, 3, 4, 5, 6], black: [7] }],
      },
    ]);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, payload);

    const records = loadHistory();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('ok');
  });

  it('存储只读时仍能读取已有数据，但不可写入（P2 回归）', () => {
    // 先正常写入，再模拟只读（setItem 抛错）
    saveHistory([createRecord('existing', 1)]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('read only');
    });

    expect(isHistoryAvailable()).toBe(false);
    expect(loadHistory()).toHaveLength(1);
    expect(saveHistory([createRecord('new', 2)])).toBe(false);
  });

  it('localStorage 完全不可用时降级（TC-015）', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(isHistoryAvailable()).toBe(false);
    expect(loadHistory()).toEqual([]);
    expect(saveHistory([createRecord('a', 1)])).toBe(false);
  });
});
