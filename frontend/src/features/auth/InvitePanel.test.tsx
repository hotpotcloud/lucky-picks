import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitePanel } from './InvitePanel';
import { apiPost } from '../../api/client';

vi.mock('../../api/client');

describe('InvitePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('已登录用户可生成并复制邀请码', async () => {
    vi.mocked(apiPost).mockResolvedValue({ code: 'invite-123' });
    render(<InvitePanel />);

    fireEvent.click(screen.getByRole('button', { name: '生成邀请码' }));
    await screen.findByText('invite-123');
    expect(apiPost).toHaveBeenCalledWith('/api/v1/auth/invitations', {});

    fireEvent.click(screen.getByRole('button', { name: '复制邀请码' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('invite-123'));
  });
});
