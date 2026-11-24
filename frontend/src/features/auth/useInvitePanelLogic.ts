import { useState } from 'react';
import { apiPost } from '../../api/client';

interface InvitationResponse {
  code: string;
}

export const useInvitePanelLogic = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setFeedback('');
    try {
      const response = await apiPost<InvitationResponse>('/api/v1/auth/invitations', {});
      setInviteCode(response.code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '邀请码生成失败');
    } finally {
      setIsLoading(false);
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

  return { inviteCode, error, feedback, isLoading, handleGenerate, handleCopy };
};
