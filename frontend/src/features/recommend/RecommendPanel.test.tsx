import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecommendPanel from './RecommendPanel';
import { apiPost } from '../../api/client';

vi.mock('../../api/client');

describe('RecommendPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('生成推荐始终请求真实推荐接口', async () => {
    vi.mocked(apiPost).mockResolvedValue({
      game: 'redblue',
      strategy: 'balanced',
      mode: 'single',
      window: 100,
      seed: null,
      bets: [],
      dataVersion: 'v1',
    });
    render(<RecommendPanel game="redblue" draws={[]} />);

    fireEvent.click(screen.getByRole('button', { name: '生成推荐' }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith('/api/v1/recommendations', {
        game: 'redblue',
        mode: 'single',
        strategy: 'balanced',
        window: 100,
        count: 3,
        seed: undefined,
      }),
    );
    expect(screen.queryByText(/离线模式|本地简化策略/)).not.toBeInTheDocument();
  });
});
