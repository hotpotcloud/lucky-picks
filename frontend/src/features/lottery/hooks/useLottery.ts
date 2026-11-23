import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MAX_HISTORY_RECORDS,
  MAX_HISTORY_TICKETS,
  QUICK_PICK_MAX,
  QUICK_PICK_MIN,
  TICKET_PRICE,
} from '../constants';
import { GAME_CONFIGS } from '../config';
import {
  calculateBankerSelection,
  calculateMultipleSelection,
  generateBankerTickets,
  generateQuickTickets,
} from '../generator';
import { formatTicketText, formatTicketsText } from '../format';
import type {
  AreaKey,
  GameId,
  HistoryRecord,
  QuickStrategy,
  SelectionMode,
  TicketNumbers,
} from '../types';
import { LotteryError } from '../types';
import {
  isHistoryAvailable,
  loadHistory,
  saveHistory,
} from '../../../services/storage';

/** 一次生成的结果。复式与胆拖的 tickets 数量可能为 1 或多注。 */
export interface GeneratedResult {
  /** 生成模式。 */
  mode: SelectionMode;
  /** 号码列表。 */
  tickets: TicketNumbers[];
  /** 组合注数。 */
  combinations: number;
  /** 参考金额（元）。 */
  amount: number;
}

/** 动作返回结果，便于页面统一提示。 */
export interface ActionResult {
  /** 是否成功。 */
  ok: boolean;
  /** 失败时的中文原因。 */
  error?: string;
  /** 成功但需要提醒用户的信息，例如历史保存被截断。 */
  warning?: string;
}

/** 胆拖状态：主区胆码与拖码。 */
interface BankerState {
  banker: number[];
  drag: number[];
}

/** 生成记录唯一标识，优先使用浏览器原生 UUID。 */
const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/**
 * 选号页面状态与动作。
 * 组件只负责渲染，所有参数校验、生成与存储调用集中在本 Hook。
 */
export const useLottery = () => {
  const [gameId, setGameId] = useState<GameId>('ssq');
  const game = GAME_CONFIGS[gameId];

  const [mode, setModeState] = useState<SelectionMode>('quick');
  const [quickCount, setQuickCountState] = useState(1);
  const [strategy, setStrategyState] = useState<QuickStrategy>('random');
  const [selections, setSelections] = useState<TicketNumbers>({});
  const [bankerState, setBankerState] = useState<BankerState>({ banker: [], drag: [] });
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyAvailable, setHistoryAvailable] = useState(true);

  // 首次挂载时读取本地历史，并记录存储是否可用
  useEffect(() => {
    setHistory(loadHistory());
    setHistoryAvailable(isHistoryAvailable());
  }, []);

  const multipleInfo = useMemo(
    () => calculateMultipleSelection(game, selections),
    [game, selections],
  );
  const bankerInfo = useMemo(
    () => calculateBankerSelection(game, bankerState.banker, bankerState.drag, selections),
    [game, bankerState, selections],
  );

  /** 机选参数校验：注数必须是 1–10 的整数。 */
  const quickInfo = useMemo(() => {
    const valid =
      Number.isInteger(quickCount) &&
      quickCount >= QUICK_PICK_MIN &&
      quickCount <= QUICK_PICK_MAX;
    return {
      valid,
      error: valid
        ? undefined
        : `机选注数必须是 ${QUICK_PICK_MIN}–${QUICK_PICK_MAX} 的整数`,
      combinations: valid ? quickCount : 0,
      amount: valid ? quickCount * TICKET_PRICE : 0,
    };
  }, [quickCount]);

  /** 当前模式的参数校验信息，用于展示注数与金额。 */
  const activeInfo = useMemo(() => {
    if (mode === 'multiple') {
      return multipleInfo;
    }
    if (mode === 'banker') {
      return bankerInfo;
    }
    return quickInfo;
  }, [mode, multipleInfo, bankerInfo, quickInfo]);

  /** 切换彩种：清空所有选择与结果，避免跨彩种脏数据。 */
  const selectGame = useCallback((id: GameId) => {
    setGameId(id);
    setModeState('quick');
    setQuickCountState(1);
    setSelections({});
    setBankerState({ banker: [], drag: [] });
    setResult(null);
  }, []);

  /** 切换模式：保留已选号码，但清空旧结果。 */
  const setMode = useCallback((nextMode: SelectionMode) => {
    setModeState(nextMode);
    setResult(null);
  }, []);

  const setQuickCount = useCallback((count: number) => {
    setQuickCountState(count);
    setResult(null);
  }, []);

  const setStrategy = useCallback((nextStrategy: QuickStrategy) => {
    setStrategyState(nextStrategy);
    setResult(null);
  }, []);

  /** 复式与胆拖副区共用：切换某个号码的选中状态。 */
  const toggleSelection = useCallback((areaKey: AreaKey, value: number) => {
    setSelections((previous) => {
      const current = previous[areaKey] ?? [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value].sort((a, b) => a - b);
      return { ...previous, [areaKey]: next };
    });
    setResult(null);
  }, []);

  /**
   * 胆拖主区号码循环：未选 → 拖码 → 胆码 → 未选。
   * 保证胆码与拖码不重复，且两者始终升序。
   */
  const cycleBankerNumber = useCallback((value: number) => {
    setBankerState((previous) => {
      if (previous.banker.includes(value)) {
        return { ...previous, banker: previous.banker.filter((item) => item !== value) };
      }
      if (previous.drag.includes(value)) {
        return {
          banker: [...previous.banker, value].sort((a, b) => a - b),
          drag: previous.drag.filter((item) => item !== value),
        };
      }
      return { ...previous, drag: [...previous.drag, value].sort((a, b) => a - b) };
    });
    setResult(null);
  }, []);

  /** 按当前模式生成号码。 */
  const generate = useCallback((): ActionResult => {
    try {
      if (mode === 'quick') {
        const tickets = generateQuickTickets(game, quickCount, strategy);
        setResult({
          mode,
          tickets,
          combinations: quickCount,
          amount: quickCount * TICKET_PRICE,
        });
        return { ok: true };
      }

      if (mode === 'multiple') {
        const info = calculateMultipleSelection(game, selections);
        if (!info.valid) {
          return { ok: false, error: info.error ?? '复式参数不合法' };
        }
        setResult({ mode, tickets: [selections], combinations: info.combinations, amount: info.amount });
        return { ok: true };
      }

      const info = calculateBankerSelection(
        game,
        bankerState.banker,
        bankerState.drag,
        selections,
      );
      if (!info.valid) {
        return { ok: false, error: info.error ?? '胆拖参数不合法' };
      }
      const tickets = generateBankerTickets(
        game,
        bankerState.banker,
        bankerState.drag,
        selections,
      );
      setResult({ mode: 'banker', tickets, combinations: info.combinations, amount: info.amount });
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof LotteryError ? error.message : '生成失败，请稍后重试';
      return { ok: false, error: message };
    }
  }, [mode, game, quickCount, strategy, selections, bankerState]);

  /** 复制当前结果。 */
  const copyResult = useCallback(async (): Promise<ActionResult> => {
    if (!result) {
      return { ok: false, error: '尚未生成号码' };
    }
    const text =
      result.tickets.length === 1
        ? formatTicketText(game, result.tickets[0])
        : formatTicketsText(game, result.tickets);
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch {
      return { ok: false, error: '复制失败，请手动选择号码' };
    }
  }, [game, result]);

  /** 保存当前结果到本地历史。 */
  const saveResult = useCallback((): ActionResult => {
    if (!result) {
      return { ok: false, error: '尚未生成号码' };
    }
    if (!historyAvailable) {
      return { ok: false, error: '本地存储不可用，历史功能已禁用' };
    }
    const ticketsTruncated = result.tickets.length > MAX_HISTORY_TICKETS;
    const record: HistoryRecord = {
      id: createId(),
      gameId: game.id,
      gameName: game.name,
      mode: result.mode,
      tickets: result.tickets.slice(0, MAX_HISTORY_TICKETS),
      combinationCount: result.combinations,
      amount: result.amount,
      createdAt: Date.now(),
      ticketsTruncated,
    };
    const next = [record, ...history].slice(0, MAX_HISTORY_RECORDS);
    if (!saveHistory(next)) {
      // 写失败可能是临时配额问题，重新探测可写性，但不阻止用户继续重试
      setHistoryAvailable(isHistoryAvailable());
      return { ok: false, error: '保存失败，本地存储不可用或空间不足' };
    }
    setHistory(next);
    setHistoryAvailable(true);
    return {
      ok: true,
      warning: ticketsTruncated
        ? `已保存前 ${MAX_HISTORY_TICKETS} 注，完整结果请及时使用「复制」`
        : undefined,
    };
  }, [result, historyAvailable, game.id, game.name, history]);

  /** 删除单条历史，写失败时保留原列表并返回错误。 */
  const deleteHistory = useCallback(
    (id: string): ActionResult => {
      const next = history.filter((record) => record.id !== id);
      if (!saveHistory(next)) {
        setHistoryAvailable(isHistoryAvailable());
        return { ok: false, error: '删除失败，本地存储不可用' };
      }
      setHistory(next);
      return { ok: true };
    },
    [history],
  );

  /** 清空全部历史，写失败时不清空内存列表。 */
  const clearAllHistory = useCallback((): ActionResult => {
    if (!saveHistory([])) {
      setHistoryAvailable(isHistoryAvailable());
      return { ok: false, error: '清空失败，本地存储不可用' };
    }
    setHistory([]);
    return { ok: true };
  }, []);

  return {
    gameId,
    game,
    mode,
    quickCount,
    strategy,
    selections,
    bankerNumbers: bankerState.banker,
    dragNumbers: bankerState.drag,
    multipleInfo,
    bankerInfo,
    activeInfo,
    result,
    history,
    historyAvailable,
    selectGame,
    setMode,
    setQuickCount,
    setStrategy,
    toggleSelection,
    cycleBankerNumber,
    generate,
    copyResult,
    saveResult,
    deleteHistory,
    clearAllHistory,
  };
};
