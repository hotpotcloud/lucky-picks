/** 登录页：Ethereal Glass 暗黑科技风（无装饰性循环动效）。 */

import { Alert } from 'antd';
import { useState } from 'react';
import { Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useAuth } from './AuthContext';

/**
 * 登录页面。
 */
const LoginPage = () => {
  const { signIn, offline } = useAuth();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="login-shell">
      <div className="login-bezel">
        <div className="login-inner">
          <div className="eyebrow">SECURE ACCESS · 终端接入</div>
          <Card className="login-card">
            <CardHeader>
              <CardTitle className="text-center">
                <span className="login-title">Lucky Picks</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {offline && <Alert type="info" showIcon message="离线模式 · 本地演示账号" />}
              {error && <Alert type="error" showIcon message={error} closable onClose={() => setError('')} />}
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void signIn(String(form.get('username')), String(form.get('password'))).catch(
                    (cause: unknown) => {
                      setError(cause instanceof Error ? cause.message : '登录失败');
                    },
                  );
                }}
              >
                <div className="space-y-1">
                  <label className="field-label" htmlFor="username">
                    账号 / USER
                  </label>
                  <Input id="username" name="username" defaultValue="admin" autoComplete="username" />
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
                      defaultValue="888888"
                      autoComplete="current-password"
                      className="pr-12"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={visible ? '隐藏密码' : '显示密码'}
                      onClick={() => setVisible((value) => !value)}
                    >
                      {visible ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" size="lg" className="login-cta group">
                  <span>登 录</span>
                  <span className="cta-icon">
                    <ArrowUpRight size={16} strokeWidth={1.5} />
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
