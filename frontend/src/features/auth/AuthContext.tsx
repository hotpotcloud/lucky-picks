/** 登录状态与动作。 */

import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { clearToken, getToken, hasBackend, login as apiLogin, logout as apiLogout, setToken } from '../../api/client';

/** 登录用户信息。 */
export interface AuthUser {
  id: number;
  username: string;
  role: string;
}

/** 鉴权上下文值。 */
interface AuthValue {
  user: AuthUser | null;
  ready: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  offline: boolean;
}

const OFFLINE_KEY = 'lucky-picks:offline-user';

/** 鉴权上下文。 */
const AuthContext = createContext<AuthValue | null>(null);

/**
 * 鉴权提供者。
 * 有后端时走真实登录；无后端（静态部署）时以本地演示账号登录，界面会标注离线模式。
 * @param props 子节点
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const offline = !hasBackend();

  /** 从本地存储恢复登录态（同步初始化，避免首帧闪烁）。 */
  const initialUser = (): AuthUser | null => {
    if (offline) {
      const raw = window.localStorage.getItem(OFFLINE_KEY);
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw) as AuthUser;
      } catch {
        return null;
      }
    }
    return getToken() ? { id: 0, username: 'admin', role: 'admin' } : null;
  };

  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const ready = true;

  const signIn = useCallback(
    async (username: string, password: string) => {
      if (offline) {
        if (username !== 'admin' || password !== '888888') {
          throw new Error('账号或密码不正确');
        }
        const demo = { id: 0, username, role: 'admin' };
        window.localStorage.setItem(OFFLINE_KEY, JSON.stringify(demo));
        setUser(demo);
        return;
      }
      const response = await apiLogin(username, password);
      setToken(response.token);
      setUser(response.user);
    },
    [offline],
  );

  const signOut = useCallback(async () => {
    if (offline) {
      window.localStorage.removeItem(OFFLINE_KEY);
    } else {
      await apiLogout();
      clearToken();
    }
    setUser(null);
  }, [offline]);

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut, offline }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 读取鉴权上下文。
 * @returns 鉴权值
 */
export const useAuth = (): AuthValue => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return value;
};
