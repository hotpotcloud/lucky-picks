import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext');

/** 连续点击右上角水印两次，展开登录表单。 */
const revealLogin = () => {
  fireEvent.click(screen.getByRole('button', { name: '登录入口' }));
  fireEvent.click(screen.getByRole('button', { name: '登录入口' }));
};

describe('LoginPage', () => {
  const signIn = vi.fn();
  const signUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      ready: true,
      signIn,
      signUp,
      signOut: vi.fn(),
      offline: false,
    });
  });

  it('默认隐藏登录表单，点击水印两次后展示且不预填账号', () => {
    render(<LoginPage />);

    expect(screen.queryByRole('button', { name: '登录' })).not.toBeInTheDocument();
    revealLogin();

    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByLabelText('账号 / USER')).toHaveValue('');
    expect(screen.getByLabelText('密码 / KEY')).toHaveValue('');
  });

  it('可切换注册，提交期间显示 loading，成功后保持注册即登录流程', async () => {
    let resolveRegistration: (() => void) | undefined;
    signUp.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRegistration = resolve;
      }),
    );
    render(<LoginPage />);
    revealLogin();

    fireEvent.click(screen.getByRole('button', { name: '注册账号' }));
    fireEvent.change(screen.getByLabelText('账号 / USER'), { target: { value: 'tester' } });
    fireEvent.change(screen.getByLabelText('密码 / KEY'), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText('邀请码 / INVITE CODE'), {
      target: { value: 'invite-code' },
    });
    fireEvent.click(screen.getByRole('button', { name: '注册并登录' }));

    expect(signUp).toHaveBeenCalledWith('tester', 'password', 'invite-code');
    expect(screen.getByRole('button', { name: '注册并登录' })).toBeDisabled();

    resolveRegistration?.();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '注册并登录' })).toBeEnabled(),
    );
  });

  it('注册时按后端规则拦截非法账号', () => {
    render(<LoginPage />);
    revealLogin();
    fireEvent.click(screen.getByRole('button', { name: '注册账号' }));
    fireEvent.change(screen.getByLabelText('账号 / USER'), { target: { value: 'a b' } });
    fireEvent.change(screen.getByLabelText('密码 / KEY'), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText('邀请码 / INVITE CODE'), {
      target: { value: 'invite-code' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '注册并登录' }).closest('form')!);

    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByText('账号需为 3-64 位字母、数字、下划线或短横线')).toBeInTheDocument();
  });

  it('注册时邀请码必填', () => {
    render(<LoginPage />);
    revealLogin();
    fireEvent.click(screen.getByRole('button', { name: '注册账号' }));
    expect(screen.getByLabelText('邀请码 / INVITE CODE')).toBeRequired();
  });
});
