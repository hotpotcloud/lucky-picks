/**
 * API 客户端：携带登录令牌、统一错误映射。
 * VITE_API_BASE_URL 未配置时视为「离线模式」，由数据层回退到静态快照。
 */

import type { AiAnalysisDto, Envelope, LoginResponse } from './types';

/** 后端服务地址（未配置则为空）。 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** 本地保存令牌的键。 */
const TOKEN_KEY = 'lucky-picks:token';

/** 是否配置了后端服务。 */
export const hasBackend = (): boolean => API_BASE.length > 0;

/** 读取登录令牌。 */
export const getToken = (): string | null => window.localStorage.getItem(TOKEN_KEY);

/**
 * 保存登录令牌。
 * @param token 令牌字符串
 */
export const setToken = (token: string): void => {
  window.localStorage.setItem(TOKEN_KEY, token);
};

/** 清除登录令牌。 */
export const clearToken = (): void => {
  window.localStorage.removeItem(TOKEN_KEY);
};

/** 令牌失效错误。 */
export class UnauthorizedError extends Error {
  constructor() {
    super('未登录或令牌已失效');
    this.name = 'UnauthorizedError';
  }
}

/**
 * 登录请求。
 * @param username 账号
 * @param password 密码
 * @returns 登录响应
 */
export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = (await response.json()) as Envelope<LoginResponse>;
  if (!response.ok || body.code !== 0) {
    throw new Error(body.message || '登录失败');
  }
  return body.data;
};

/**
 * 退出登录（服务端令牌版本递增）。
 */
export const logout = async (): Promise<void> => {
  const token = getToken();
  if (!token || !API_BASE) {
    return;
  }
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // 退出时网络失败也要清除本地令牌
  }
};

/**
 * 调用受保护的 GET 接口。
 * @param path 接口路径（含 /api/v1 前缀）
 * @returns 接口的 data 字段
 */
export const apiGet = async <T>(path: string): Promise<T> => {
  const token = getToken();
  if (!token) {
    throw new UnauthorizedError();
  }
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) {
    throw new UnauthorizedError();
  }
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || body.code !== 0) {
    throw new Error(body.message || '请求失败');
  }
  return body.data;
};

/**
 * 调用受保护的 POST 接口。
 * @param path 接口路径
 * @param payload 请求体
 * @returns 接口的 data 字段
 */
export const apiPost = async <T>(path: string, payload: unknown): Promise<T> => {
  const token = getToken();
  if (!token) {
    throw new UnauthorizedError();
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (response.status === 401) {
    throw new UnauthorizedError();
  }
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || body.code !== 0) {
    throw new Error(body.message || '请求失败');
  }
  return body.data;
};

/**
 * 查询服务端 AI 是否配置。
 * @returns 是否可用
 */
export const fetchAiConfigured = async (): Promise<{ available: boolean }> =>
  apiGet<{ available: boolean }>('/api/v1/ai/configured');

/**
 * 生成 AI 统计分析。
 * @param game 玩法标识
 * @param window 统计窗口
 */
export const fetchAiAnalysis = async (game: string, window: number): Promise<AiAnalysisDto> =>
  apiGet<AiAnalysisDto>(`/api/v1/ai/analysis/${game}?window=${window}`);
