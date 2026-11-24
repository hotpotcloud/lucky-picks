/** 登录页：暗黑科技风。 */

import { Alert } from 'antd';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useAuth } from './AuthContext';

/**
 * 登录页面。
 */
const LoginPage = () => {
  const { signIn, offline } = useAuth();

  return (
    <div className="login-shell tech-bg">
      <div className="scanline" aria-hidden="true" />
      <Card className="login-card relative overflow-hidden">
        <div className="tech-corner tech-corner-tl" aria-hidden="true" />
        <div className="tech-corner tech-corner-br" aria-hidden="true" />
        <CardHeader>
          <CardTitle className="text-center">
            <span className="login-title">Lucky Picks</span>
            <span className="login-subtitle">SECURE ACCESS · 终端接入</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offline && <Alert type="info" showIcon message="离线模式 · 本地演示账号" />}
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void signIn(String(form.get('username')), String(form.get('password')));
            }}
          >
            <div className="space-y-1">
              <label className="text-xs tracking-widest text-cyan-300/80" htmlFor="username">
                账号 / USER
              </label>
              <Input id="username" name="username" defaultValue="admin" autoComplete="username" />
            </div>
            <div className="space-y-1">
              <label className="text-xs tracking-widest text-cyan-300/80" htmlFor="password">
                密码 / KEY
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue="888888"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" size="lg" className="w-full animate-pulse-glow">
              登 录 · CONNECT
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
