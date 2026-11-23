import { HISTORY_STORAGE_KEY, MAX_HISTORY_RECORDS } from '../features/lottery/constants';
import type { GameId, HistoryRecord, SelectionMode, TicketNumbers } from '../features/lottery/types';

/**
 * 本地历史存储。
 * 所有浏览器存储访问都包裹异常处理：存储不可用或数据损坏时降级，
 * 保证页面主流程（选号、生成）不受影响。
 */

/** 判断值是否为对象。 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** 校验号码集合的基本结构，避免损坏数据进入渲染层。 */
const isTicketNumbers = (value: unknown): value is TicketNumbers => {
  if (!isObject(value)) {
    return false;
  }
  return Object.values(value).every(
    (numbers) => Array.isArray(numbers) && numbers.every((item) => typeof item === 'number'),
  );
};

/** 校验单条历史记录结构。 */
const isHistoryRecord = (value: unknown): value is HistoryRecord => {
  if (!isObject(value)) {
    return false;
  }
  const gameIds: GameId[] = ['ssq', 'dlt'];
  const modes: SelectionMode[] = ['quick', 'multiple', 'banker'];
  return (
    typeof value.id === 'string' &&
    gameIds.includes(value.gameId as GameId) &&
    typeof value.gameName === 'string' &&
    modes.includes(value.mode as SelectionMode) &&
    Array.isArray(value.tickets) &&
    value.tickets.every(isTicketNumbers) &&
    typeof value.combinationCount === 'number' &&
    typeof value.createdAt === 'number'
  );
};

/**
 * 获取可用的 localStorage。
 * 某些隐私模式或浏览器策略下访问会抛错，此时返回 null。
 */
const getStorage = (): Storage | null => {
  try {
    const storage = window.localStorage;
    const probeKey = '__lucky_picks_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
};

/** 历史功能当前是否可用。 */
export const isHistoryAvailable = (): boolean => getStorage() !== null;

/**
 * 读取历史记录，按创建时间倒序，最多保留上限条数。
 * 数据损坏时清理异常数据并返回空数组。
 */
export const loadHistory = (): HistoryRecord[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('历史数据格式不是数组');
    }
    return parsed
      .filter(isHistoryRecord)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_HISTORY_RECORDS);
  } catch {
    // 数据损坏时直接清理，避免每次读取都失败
    try {
      storage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // 清理失败也不影响主流程
    }
    return [];
  }
};

/**
 * 覆盖写入历史记录。
 * @returns 是否写入成功；存储不可用时返回 false。
 */
export const saveHistory = (records: readonly HistoryRecord[]): boolean => {
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(records.slice(0, MAX_HISTORY_RECORDS)),
    );
    return true;
  } catch {
    return false;
  }
};

/**
 * 追加一条历史记录（新的在前），返回更新后的列表。
 * @param record 待保存记录
 */
export const addHistory = (record: HistoryRecord): HistoryRecord[] => {
  const current = loadHistory();
  const next = [record, ...current].slice(0, MAX_HISTORY_RECORDS);
  // 写入失败（存储不可用或超配额）时不误导调用方，返回原有列表
  return saveHistory(next) ? next : current;
};

/**
 * 删除指定历史记录，返回更新后的列表。
 * @param id 记录标识
 */
export const removeHistory = (id: string): HistoryRecord[] => {
  const next = loadHistory().filter((record) => record.id !== id);
  saveHistory(next);
  return next;
};

/** 清空全部历史记录。 */
export const clearHistory = (): HistoryRecord[] => {
  saveHistory([]);
  return [];
};
