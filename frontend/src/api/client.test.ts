import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, getToken, login, register, setToken, UnauthorizedError } from './client';
import { derivePasswordDigest } from './passwordDigest';

const loginResponse = {
  token: 'token-1',
  expiredAt: 1,
  user: { id: 1, username: 'tester', role: 'user' },
};

describe('API 客户端', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('未配置 API 基址时默认请求同源接口', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 0, message: 'ok', data: loginResponse, requestId: 'request-1' }),
        { status: 200 },
      ),
    );

    await login('tester', 'password');
    const passwordDigest = await derivePasswordDigest('tester', 'password');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'tester', passwordDigest }),
      }),
    );
  });

  it('邀请注册携带邀请码并返回 LoginResponse', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 0, message: 'ok', data: loginResponse, requestId: 'request-2' }),
        { status: 200 },
      ),
    );

    await expect(register('tester', 'password', 'invite-code')).resolves.toEqual(loginResponse);
    const passwordDigest = await derivePasswordDigest('tester', 'password');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          username: 'tester',
          passwordDigest,
          passwordLength: 8,
          inviteCode: 'invite-code',
        }),
      }),
    );
  });

  it('登录请求体不包含明文密码', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 0, message: 'ok', data: loginResponse, requestId: 'request-3' }),
        { status: 200 },
      ),
    );

    await login('tester', 'secret-password');

    const body = String(fetchMock.mock.calls[0]?.[1]?.body ?? '');
    expect(body).not.toContain('secret-password');
    expect(body).toContain('passwordDigest');
  });

  it('受保护接口返回 401 时统一清除过期令牌', async () => {
    setToken('expired-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));

    await expect(apiGet('/api/v1/auth/me')).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getToken()).toBeNull();
  });

  it('同源代理返回 502 HTML 时给出明确排查提示', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>bad gateway</html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    await expect(login('tester', 'password')).rejects.toThrow(
      '应用同源 API 不可用，请检查后端服务或代理配置',
    );
  });
});
