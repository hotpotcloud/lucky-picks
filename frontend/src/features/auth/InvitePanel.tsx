/** 已登录用户的邀请码生成与复制入口。 */

import { ChevronDown, Copy, KeyRound } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Notice } from '../../components/ui/feedback';
import { Input } from '../../components/ui/input';
import { useInvitePanelLogic } from './useInvitePanelLogic';

export const InvitePanel = () => {
  const logic = useInvitePanelLogic();

  return (
    <details className="relative max-w-full">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm text-muted-foreground hover:border-[var(--primary)]/50 hover:text-[var(--primary-hover)]">
        <KeyRound size={16} />
        邀请管理
        <ChevronDown size={14} className="ml-auto" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-3 rounded-md border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl">
        <div>
          <p className="m-0 text-sm font-medium text-[var(--foreground)]">生成邀请码</p>
          <p className="mb-0 mt-1 text-xs leading-5 text-muted-foreground">
            邀请码仅在当前面板展示，请及时复制。
          </p>
        </div>
        <Button
          className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
          disabled={logic.isLoading}
          onClick={() => void logic.handleGenerate()}
        >
          <KeyRound size={16} />
          {logic.isLoading ? '生成中...' : '生成邀请码'}
        </Button>
        {logic.inviteCode && (
          <div className="space-y-2">
            <Input
              className="font-mono"
              aria-label="邀请码"
              value={logic.inviteCode}
              readOnly
            />
            <code className="sr-only">{logic.inviteCode}</code>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void logic.handleCopy()}
            >
              <Copy size={16} />
              复制邀请码
            </Button>
          </div>
        )}
        {logic.error && <Notice tone="error">{logic.error}</Notice>}
        {logic.feedback && <Notice tone="success">{logic.feedback}</Notice>}
      </div>
    </details>
  );
};
