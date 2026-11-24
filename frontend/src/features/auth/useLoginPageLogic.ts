import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from './AuthContext';

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;

export const useLoginPageLogic = () => {
  const { signIn, signUp } = useAuth();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateRegistration = (username: string, password: string, inviteCode: string) => {
    if (!USERNAME_PATTERN.test(username)) {
      return '账号需为 3-64 位字母、数字、下划线或短横线';
    }
    if (password.length < 8 || password.length > 128) {
      return '密码长度需为 8-128 位';
    }
    return inviteCode ? '' : '请输入邀请码';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username'));
    const password = String(form.get('password'));
    const inviteCode = String(form.get('inviteCode'));
    const validationError = isRegistering
      ? validateRegistration(username, password, inviteCode)
      : '';
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await (isRegistering
        ? signUp(username, password, inviteCode)
        : signIn(username, password));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : isRegistering ? '注册失败' : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = () => {
    setIsRegistering((value) => !value);
    setError('');
  };

  return {
    isPasswordVisible,
    isRegistering,
    isLoading,
    error,
    handleSubmit,
    handleModeChange,
    togglePasswordVisibility: () => setIsPasswordVisible((value) => !value),
  };
};
