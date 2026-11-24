import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiPost } from '../../../api/client';
import { loadHistory } from '../../../services/storage';
import { usePicker } from './usePicker';

vi.mock('../../../api/client', () => ({
  apiPost: vi.fn(),
}));

const mockedApiPost = vi.mocked(apiPost);

describe('usePicker 生产路径（TC-011 / TC-012）', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedApiPost.mockResolvedValue({
      game: 'redblue',
      strategy: 'random',
      mode: 'single',
      window: 100,
      seed: null,
      dataVersion: '20260001',
      bets: [
        {
          mode: 'single',
          areas: [
            { key: 'red', numbers: [1, 2, 3, 4, 5, 6], banker: [] },
            { key: 'blue', numbers: [7], banker: [] },
          ],
          combinations: 1,
          baseAmount: 2,
          additionalAmount: 0,
          totalAmount: 2,
          explanation: [],
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('生成、保存、删除与清空历史', async () => {
    const { result } = renderHook(() => usePicker());

    await act(async () => {
      expect((await result.current.generate()).ok).toBe(true);
    });
    expect(result.current.result?.tickets).toHaveLength(1);

    act(() => {
      expect(result.current.saveResult().ok).toBe(true);
    });
    expect(result.current.history).toHaveLength(1);
    expect(loadHistory()).toHaveLength(1);

    const id = result.current.history[0].id;
    act(() => {
      expect(result.current.deleteHistory(id).ok).toBe(true);
    });
    expect(result.current.history).toHaveLength(0);
    expect(loadHistory()).toHaveLength(0);

    await act(async () => {
      expect((await result.current.generate()).ok).toBe(true);
      expect(result.current.saveResult().ok).toBe(true);
    });
    act(() => {
      expect(result.current.clearAllHistory().ok).toBe(true);
    });
    expect(result.current.history).toHaveLength(0);
    expect(loadHistory()).toHaveLength(0);
  });

  it('胆拖超过 200 注时保存会被截断并返回警告（P1 回归）', async () => {
    const { result } = renderHook(() => usePicker());

    act(() => result.current.setMode('banker'));
    // 第 1 个号码点击两次成为胆码
    act(() => result.current.cycleBankerNumber(1));
    act(() => result.current.cycleBankerNumber(1));
    // 2–11 共 10 个拖码，C(10,5)=252 注
    for (let value = 2; value <= 11; value += 1) {
      act(() => result.current.cycleBankerNumber(value));
    }
    act(() => result.current.toggleSelection('blue', 1));

    await act(async () => {
      expect((await result.current.generate()).ok).toBe(true);
    });
    expect(result.current.result?.tickets).toHaveLength(252);

    let warning: string | undefined;
    act(() => {
      const saved = result.current.saveResult();
      expect(saved.ok).toBe(true);
      warning = saved.warning;
    });
    expect(warning).toContain('前 200 注');
    expect(result.current.history[0].tickets).toHaveLength(200);
    expect(result.current.history[0].ticketsTruncated).toBe(true);
  });

  it('存储写失败时保存返回错误且不假装成功', async () => {
    const { result } = renderHook(() => usePicker());
    await act(async () => {
      expect((await result.current.generate()).ok).toBe(true);
    });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    act(() => {
      const saved = result.current.saveResult();
      expect(saved.ok).toBe(false);
      expect(saved.error).toContain('保存失败');
    });
    expect(result.current.history).toHaveLength(0);
  });

  it('复制成功与失败路径', async () => {
    const { result } = renderHook(() => usePicker());
    await act(async () => {
      expect((await result.current.generate()).ok).toBe(true);
    });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    await act(async () => {
      const copied = await result.current.copyResult();
      expect(copied.ok).toBe(false);
      expect(copied.error).toContain('复制失败');
    });

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    await act(async () => {
      expect((await result.current.copyResult()).ok).toBe(true);
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('红球'));
  });

  it('单式通过真实推荐接口发送可选精确约束', async () => {
    const { result } = renderHook(() => usePicker());

    act(() => {
      result.current.setQuickConstraints({
        oddCount: 3,
        bigCount: 3,
        sum: 103,
        zoneCounts: [2, 2, 2],
      });
    });
    await act(async () => {
      expect((await result.current.generate()).ok).toBe(true);
    });

    expect(mockedApiPost).toHaveBeenCalledWith('/api/v1/recommendations', {
      game: 'redblue',
      mode: 'single',
      strategy: 'random',
      window: 100,
      count: 1,
      constraints: {
        oddEven: [3, 3],
        bigSmall: [3, 3],
        sumRange: [103, 103],
        zoneCounts: [2, 2, 2],
      },
    });
  });

  it('未填写约束时省略 constraints，切换玩法清空手动条件', async () => {
    const { result } = renderHook(() => usePicker());

    await act(async () => {
      expect((await result.current.generate()).ok).toBe(true);
    });
    expect(mockedApiPost).toHaveBeenLastCalledWith('/api/v1/recommendations', {
      game: 'redblue',
      mode: 'single',
      strategy: 'random',
      window: 100,
      count: 1,
    });

    act(() => {
      result.current.setQuickConstraints({
        oddCount: 3,
        bigCount: null,
        sum: null,
        zoneCounts: [null, null, null],
      });
      result.current.selectGame('frontback');
    });
    expect(result.current.quickConstraints).toEqual({
      oddCount: null,
      bigCount: null,
      sum: null,
      zoneCounts: [null, null, null],
    });
  });

  it('接口失败时保留明确错误且不生成本地结果', async () => {
    mockedApiPost.mockRejectedValueOnce(new Error('历史数据不足，无法按该窗口生成推荐'));
    const { result } = renderHook(() => usePicker());

    await act(async () => {
      const generated = await result.current.generate();
      expect(generated).toEqual({
        ok: false,
        error: '历史数据不足，无法按该窗口生成推荐',
      });
    });
    expect(result.current.result).toBeNull();
  });
});
