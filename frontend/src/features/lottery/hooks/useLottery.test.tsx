import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadHistory } from '../../../services/storage';
import { useLottery } from './useLottery';

describe('useLottery 生产路径（TC-011 / TC-012）', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('生成、保存、删除与清空历史', () => {
    const { result } = renderHook(() => useLottery());

    act(() => {
      expect(result.current.generate().ok).toBe(true);
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

    act(() => {
      expect(result.current.generate().ok).toBe(true);
      expect(result.current.saveResult().ok).toBe(true);
    });
    act(() => {
      expect(result.current.clearAllHistory().ok).toBe(true);
    });
    expect(result.current.history).toHaveLength(0);
    expect(loadHistory()).toHaveLength(0);
  });

  it('胆拖超过 200 注时保存会被截断并返回警告（P1 回归）', () => {
    const { result } = renderHook(() => useLottery());

    act(() => result.current.setMode('banker'));
    // 第 1 个号码点击两次成为胆码
    act(() => result.current.cycleBankerNumber(1));
    act(() => result.current.cycleBankerNumber(1));
    // 2–11 共 10 个拖码，C(10,5)=252 注
    for (let value = 2; value <= 11; value += 1) {
      act(() => result.current.cycleBankerNumber(value));
    }
    act(() => result.current.toggleSelection('blue', 1));

    act(() => {
      expect(result.current.generate().ok).toBe(true);
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

  it('存储写失败时保存返回错误且不假装成功', () => {
    const { result } = renderHook(() => useLottery());
    act(() => {
      expect(result.current.generate().ok).toBe(true);
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
    const { result } = renderHook(() => useLottery());
    act(() => {
      expect(result.current.generate().ok).toBe(true);
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
});
