/** 登录状态与动作。 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  clearToken,
  fetchCurrentUser,
  getToken,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  setToken,
  UnauthorizedError,
} from '../../api/client';

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
  signUp: (username: string, password: string, inviteCode: string) => Promise<void>;
  signOut: () => Promise<void>;
  offline: boolean;
}

/** 鉴权上下文。 */
const AuthContext = createContext<AuthValue | null>(null);

/**
 * 鉴权提供者。
 * 通过真实接口登录、注册，并使用 /auth/me 恢复已有会话。
 * @param props 子节点
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(() => !getToken());

  useEffect(() => {
    if (!getToken()) {
      return;
    }
    let cancelled = false;
    void fetchCurrentUser()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof UnauthorizedError) {
          clearToken();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyLoginResponse = useCallback(
    (response: Awaited<ReturnType<typeof apiLogin>>) => {
      setToken(response.token);
      setUser(response.user);
    },
    [],
  );

  const signIn = useCallback(async (username: string, password: string) => {
    applyLoginResponse(await apiLogin(username, password));
  }, [applyLoginResponse]);

  const signUp = useCallback(async (username: string, password: string, inviteCode: string) => {
    applyLoginResponse(await apiRegister(username, password, inviteCode));
  }, [applyLoginResponse]);

  const signOut = useCallback(async () => {
    await apiLogout();
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signUp, signOut, offline: false }}>
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
