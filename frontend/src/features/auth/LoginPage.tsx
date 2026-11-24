/** 登录与注册页面。 */

import { Alert } from 'antd';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useAuth } from './AuthContext';

/**
 * 登录页面，默认展示登录表单并支持切换注册。
 */
const LoginPage = () => {
  const { signIn, signUp } = useAuth();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username'));
    const password = String(form.get('password'));
    const inviteCode = String(form.get('inviteCode'));
    if (isRegistering && !/^[A-Za-z0-9_-]{3,64}$/.test(username)) {
      setError('账号需为 3-64 位字母、数字、下划线或短横线');
      return;
    }
    if (isRegistering && (password.length < 8 || password.length > 128)) {
      setError('密码长度需为 8-128 位');
      return;
    }
    if (isRegistering && !inviteCode) {
      setError('请输入邀请码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await (isRegistering
        ? signUp(username, password, inviteCode)
        : signIn(username, password));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : isRegistering ? '注册失败' : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-bezel">
        <div className="login-inner">
          <div className="eyebrow">SECURE ACCESS · 终端接入</div>
          <div className="login-reveal">
              <Card className="login-card">
                <CardHeader>
                  <CardTitle className="text-center">
                    <span className="login-title">Lucky Picks</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert
                      type="error"
                      showIcon
                      message={error}
                      closable
                      onClose={() => setError('')}
                    />
                  )}
                  <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                    <div className="space-y-1">
                      <label className="field-label" htmlFor="username">
                        账号 / USER
                      </label>
                      <Input
                        id="username"
                        name="username"
                        autoComplete="username"
                        minLength={isRegistering ? 3 : undefined}
                        maxLength={64}
                        pattern={isRegistering ? '[A-Za-z0-9_-]+' : undefined}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="field-label" htmlFor="password">
                        密码 / KEY
                      </label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={visible ? 'text' : 'password'}
                          autoComplete={isRegistering ? 'new-password' : 'current-password'}
                          minLength={isRegistering ? 8 : undefined}
                          maxLength={128}
                          className="pr-12"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          aria-label={visible ? '隐藏密码' : '显示密码'}
                          onClick={() => setVisible((value) => !value)}
                        >
                          {visible ? (
                            <EyeOff size={18} strokeWidth={1.5} />
                          ) : (
                            <Eye size={18} strokeWidth={1.5} />
                          )}
                        </button>
                      </div>
                    </div>
                    {isRegistering && (
                      <div className="space-y-1">
                        <label className="field-label" htmlFor="inviteCode">
                          邀请码 / INVITE CODE
                        </label>
                        <Input
                          id="inviteCode"
                          name="inviteCode"
                          autoComplete="off"
                          required
                        />
                      </div>
                    )}
                    <Button
                      type="submit"
                      size="lg"
                      className="login-cta group"
                      disabled={loading}
                      aria-busy={loading}
                      aria-label={isRegistering ? '注册并登录' : '登录'}
                    >
                      <span>{isRegistering ? '注册并登录' : '登 录'}</span>
                      <span className="cta-icon">
                        <ArrowUpRight size={16} strokeWidth={1.5} />
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={loading}
                      onClick={() => {
                        setIsRegistering((value) => !value);
                        setError('');
                      }}
                    >
                      {isRegistering ? '返回登录' : '注册账号'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
