/** 已登录用户的邀请码生成与复制入口。 */

import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { apiPost } from '../../api/client';

/** 邀请码创建响应。 */
interface InvitationResponse {
  code: string;
}

/** 已登录用户生成并复制邀请码。 */
export const InvitePanel = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setFeedback('');
    try {
      const response = await apiPost<InvitationResponse>('/api/v1/auth/invitations', {});
      setInviteCode(response.code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '邀请码生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setError('');
      setFeedback('邀请码已复制');
    } catch {
      setFeedback('');
      setError('复制失败，请手动复制邀请码');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={loading} onClick={() => void handleGenerate()}>
        {loading ? '生成中...' : '生成邀请码'}
      </Button>
      {inviteCode && (
        <>
          <Input
            className="w-48 font-mono"
            aria-label="邀请码"
            value={inviteCode}
            readOnly
          />
          <Button variant="outline" onClick={() => void handleCopy()}>
            复制邀请码
          </Button>
        </>
      )}
      {(error || feedback) && (
        <span
          role="alert"
          className={error ? 'text-sm text-red-400' : 'text-sm text-cyan-300'}
        >
          {error || feedback}
        </span>
      )}
    </div>
  );
};
