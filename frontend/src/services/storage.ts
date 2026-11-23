import { GAME_CONFIGS } from '../features/lottery/config';
import {
  HISTORY_STORAGE_KEY,
  MAX_HISTORY_RECORDS,
  MAX_TICKETS,
} from '../features/lottery/constants';
import type { GameId, HistoryRecord, SelectionMode, TicketNumbers } from '../features/lottery/types';

/**
 * 本地历史存储。
 * 所有浏览器存储访问都包裹异常处理：存储不可用或数据损坏时降级，
 * 保证页面主流程（选号、生成）不受影响。
 */

/** 判断值是否为对象。 */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * 校验号码集合：区域键必须属于对应彩种，号码必须为范围内整数且不重复。
 * 这样可拦截 NaN、超范围、未知区域等语义损坏的数据，避免渲染出垃圾内容。
 */
const isTicketNumbers = (value: unknown, gameId: GameId): value is TicketNumbers => {
  if (!isObject(value)) {
    return false;
  }
  const areas = GAME_CONFIGS[gameId].areas;
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return false;
  }
  return keys.every((key) => {
    const area = areas.find((item) => item.key === key);
    const numbers = value[key];
    if (!area || !Array.isArray(numbers) || numbers.length === 0) {
      return false;
    }
    const capacity = area.max - area.min + 1;
    return (
      numbers.length <= capacity &&
      numbers.every(
        (item) =>
          typeof item === 'number' &&
          Number.isInteger(item) &&
          item >= area.min &&
          item <= area.max,
      ) &&
      new Set(numbers).size === numbers.length
    );
  });
};

/** 校验单条历史记录结构。 */
const isHistoryRecord = (value: unknown): value is HistoryRecord => {
  if (!isObject(value)) {
    return false;
  }
  const gameIds: GameId[] = ['ssq', 'dlt'];
  const modes: SelectionMode[] = ['quick', 'multiple', 'banker'];
  const gameId = value.gameId as GameId;

  const combinationCount = value.combinationCount;
  const createdAt = value.createdAt;
  const amount = value.amount;

  return (
    typeof value.id === 'string' &&
    gameIds.includes(gameId) &&
    typeof value.gameName === 'string' &&
    modes.includes(value.mode as SelectionMode) &&
    Array.isArray(value.tickets) &&
    value.tickets.length > 0 &&
    value.tickets.length <= MAX_TICKETS &&
    value.tickets.every((ticket) => isTicketNumbers(ticket, gameId)) &&
    typeof combinationCount === 'number' &&
    Number.isInteger(combinationCount) &&
    combinationCount > 0 &&
    combinationCount <= MAX_TICKETS &&
    typeof createdAt === 'number' &&
    Number.isFinite(createdAt) &&
    createdAt > 0 &&
    (value.ticketsTruncated === undefined || typeof value.ticketsTruncated === 'boolean') &&
    (amount === undefined || (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0))
  );
};

/**
 * 获取 localStorage。
 * 隐私模式下访问属性本身可能抛错，此时返回 null。
 */
const getStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * 历史功能当前是否可写。
 * 用一次最小写入探测配额与只读策略；读操作不依赖该探测。
 */
export const isHistoryAvailable = (): boolean => {
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  try {
    const probeKey = '__lucky_picks_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
};

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
 * @returns 是否写入成功；存储不可用或空间不足时返回 false。
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
