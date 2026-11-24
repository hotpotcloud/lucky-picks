/** 邀请制登录与注册页面；默认隐藏，水印点击两次后缓慢出现。 */

import { useState } from 'react';
import { ArrowUpRight, Eye, EyeOff, TerminalSquare } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Notice } from '../../components/ui/feedback';
import { Input } from '../../components/ui/input';
import { useLoginPageLogic } from './useLoginPageLogic';

const LoginPage = () => {
  const logic = useLoginPageLogic();

  const [clickCount, setClickCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const handleWatermarkClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    if (nextCount >= 2) setIsVisible(true);
  };

  const watermark = (
    <button type="button" className="secret-caishen" aria-label="登录入口" onClick={handleWatermarkClick}>
      <img src={`${import.meta.env.BASE_URL}caishen-watermark.png`} alt="" />
    </button>
  );

  if (!isVisible) return <main className="login-shell">{watermark}</main>;

  return (
    <main className="min-h-screen bg-[#090c10] px-4 py-8 text-slate-100 sm:px-8 lg:grid lg:place-items-center">
      <div className="login-reveal w-full">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-700 bg-[#11161d] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden min-h-[580px] flex-col justify-between border-r border-slate-800 bg-[#0d1218] p-10 lg:flex">
          <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-emerald-300">
            <TerminalSquare size={20} />
            LUCKY PICKS
          </div>
          <div className="relative flex flex-1 items-center justify-center">
            <button type="button" className="secret-caishen-inline" aria-label="登录入口" onClick={handleWatermarkClick}>
              <img src={`${import.meta.env.BASE_URL}caishen-watermark.png`} alt="" />
            </button>
          </div>
        </section>
        <section className="flex min-h-[580px] items-center p-5 sm:p-10">
          <Card className="w-full border-0 bg-transparent shadow-none">
            <CardHeader className="px-0">
              <div className="mb-4 flex justify-center lg:hidden">
                <button
                  type="button"
                  className="secret-caishen-inline secret-caishen-inline--mobile"
                  aria-label="登录入口"
                  onClick={handleWatermarkClick}
                >
                  <img src={`${import.meta.env.BASE_URL}caishen-watermark.png`} alt="" />
                </button>
              </div>
              <div className="mb-5 flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-emerald-300 lg:hidden">
                <TerminalSquare size={18} />
                LUCKY PICKS
              </div>
              <CardTitle className="text-2xl text-slate-50">
                {logic.isRegistering ? '创建受邀账号' : '登录工作台'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {logic.error && <div className="mb-4"><Notice tone="error">{logic.error}</Notice></div>}
              <form className="space-y-4" onSubmit={(event) => void logic.handleSubmit(event)}>
                <label className="block space-y-2 text-sm text-slate-300" htmlFor="username">
                  <span>账号 / USER</span>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    minLength={logic.isRegistering ? 3 : undefined}
                    maxLength={64}
                    pattern={logic.isRegistering ? '[A-Za-z0-9_-]+' : undefined}
                    required
                  />
                </label>
                <label className="block space-y-2 text-sm text-slate-300" htmlFor="password">
                  <span>密码 / KEY</span>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={logic.isPasswordVisible ? 'text' : 'password'}
                      autoComplete={logic.isRegistering ? 'new-password' : 'current-password'}
                      minLength={logic.isRegistering ? 8 : undefined}
                      maxLength={128}
                      className="pr-12"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 hover:text-cyan-200"
                      aria-label={logic.isPasswordVisible ? '隐藏密码' : '显示密码'}
                      onClick={logic.togglePasswordVisibility}
                    >
                      {logic.isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                {logic.isRegistering && (
                  <label className="block space-y-2 text-sm text-slate-300" htmlFor="inviteCode">
                    <span>邀请码 / INVITE CODE</span>
                    <Input id="inviteCode" name="inviteCode" autoComplete="off" required />
                  </label>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  disabled={logic.isLoading}
                  aria-busy={logic.isLoading}
                  aria-label={logic.isRegistering ? '注册并登录' : '登录'}
                >
                  {logic.isLoading ? '处理中...' : logic.isRegistering ? '注册并登录' : '登录'}
                  {!logic.isLoading && <ArrowUpRight size={16} />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-slate-100"
                  disabled={logic.isLoading}
                  onClick={logic.handleModeChange}
                >
                  {logic.isRegistering ? '返回登录' : '注册账号'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
      </div>
    </main>
  );
};

export default LoginPage;
