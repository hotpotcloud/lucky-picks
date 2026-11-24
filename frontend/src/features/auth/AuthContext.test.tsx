import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import * as client from '../../api/client';

vi.mock('../../api/client');

const user = { id: 7, username: 'tester', role: 'user' };
const loginResponse = { token: 'token-1', expiredAt: 1, user };

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getToken).mockReturnValue(null);
  });

  it('存在令牌时通过 /auth/me 恢复真实用户，恢复期间保持未就绪', async () => {
    vi.mocked(client.getToken).mockReturnValue('token-1');
    vi.mocked(client.fetchCurrentUser).mockResolvedValue(user);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(client.fetchCurrentUser).toHaveBeenCalledTimes(1);
    expect(result.current.user).toEqual(user);
  });

  it('恢复失败时清理无效令牌且保持未登录', async () => {
    vi.mocked(client.getToken).mockReturnValue('expired-token');
    vi.mocked(client.fetchCurrentUser).mockRejectedValue(new client.UnauthorizedError());

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(client.clearToken).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });

  it('恢复遇到网络错误时保留令牌，避免把临时故障误判为过期', async () => {
    vi.mocked(client.getToken).mockReturnValue('token-1');
    vi.mocked(client.fetchCurrentUser).mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(client.clearToken).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('注册成功后保存令牌并直接登录', async () => {
    vi.mocked(client.register).mockResolvedValue(loginResponse);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.signUp('tester', 'password', 'invite-code');
    });

    expect(client.register).toHaveBeenCalledWith('tester', 'password', 'invite-code');
    expect(client.setToken).toHaveBeenCalledWith('token-1');
    expect(result.current.user).toEqual(user);
  });
});
