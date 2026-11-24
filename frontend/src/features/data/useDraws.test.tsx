import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDraws } from './useDraws';
import { apiGet } from '../../api/client';

vi.mock('../../api/client');

describe('useDraws', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('只请求真实开奖记录接口，不回退静态快照', async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error('开奖记录加载失败'));
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const { result } = renderHook(() => useDraws('redblue'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiGet).toHaveBeenCalledWith('/api/v1/draws/redblue?limit=100&offset=0');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.draws).toEqual([]);
    expect(result.current.error).toBe('开奖记录加载失败');
  });

  it('按期号升序归一化接口结果', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      items: [
        { game: 'redblue', issue: '2026010', date: '2026-01-22', numbers: { red: [2], blue: [1] }, sales: null, pool: null },
        { game: 'redblue', issue: '2026002', date: '2026-01-04', numbers: { red: [1], blue: [2] }, sales: null, pool: null },
      ],
    });
    const { result } = renderHook(() => useDraws('redblue'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.draws.map((draw) => draw.issue)).toEqual(['2026002', '2026010']);
  });
});
