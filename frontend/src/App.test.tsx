import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';

/** 以与生产入口一致的 Provider 包裹渲染应用。 */
const renderApp = () =>
  render(
    <ConfigProvider locale={zhCN}>
      <AntdApp>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>,
  );

describe('App 交互（TC-013 / TC-014）', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('lucky-picks:token', 'token-1');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/me')) {
        return new Response(
          JSON.stringify({
            code: 0,
            message: 'ok',
            data: { id: 1, username: 'tester', role: 'user' },
            requestId: 'auth-me',
          }),
          { status: 200 },
        );
      }
      if (url.includes('/api/v1/draws/')) {
        return new Response(
          JSON.stringify({
            code: 0,
            message: 'ok',
            data: { items: [] },
            requestId: 'draws',
          }),
          { status: 200 },
        );
      }
      throw new Error(`未 mock 的请求：${url}`);
    });
  });

  it('首页不展示误导性文案（TC-014）', async () => {
    renderApp();
    await screen.findByText('tester');
    expect(screen.queryByText(/必中|预测中奖/)).not.toBeInTheDocument();
    expect(screen.getAllByText('选号').length).toBeGreaterThan(0);
  });

  it('复式号码不足时禁用生成，补齐后按组合注数生成（TC-005）', async () => {
    renderApp();
    await screen.findByText('tester');

    fireEvent.click(screen.getByRole('radio', { name: '复式' }));
    expect(screen.getByText('红球至少选择 6 个号码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成号码' })).toBeDisabled();

    const redGrid = screen.getByRole('group', { name: '红球选号' });
    for (let index = 0; index < 7; index += 1) {
      fireEvent.click(within(redGrid).getAllByRole('button')[index]);
    }
    const blueGrid = screen.getByRole('group', { name: '蓝球选号' });
    fireEvent.click(within(blueGrid).getAllByRole('button')[0]);

    expect(screen.getAllByText('共 7 注').length).toBeGreaterThan(0);
    const generate = screen.getByRole('button', { name: '生成号码' });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);

    expect(screen.getAllByText('参考金额 14 元').length).toBeGreaterThan(0);
  });

  it('切换玩法后清空已选号码并回到机选（TC-013）', async () => {
    renderApp();
    await screen.findByText('tester');

    fireEvent.click(screen.getByRole('radio', { name: '复式' }));
    const redGrid = screen.getByRole('group', { name: '红球选号' });
    fireEvent.click(within(redGrid).getAllByRole('button')[0]);
    expect(screen.getByText(/红球（已选 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: '前后玩法' }));

    // 切换后回到机选模式，展示前后玩法规则
    expect(screen.getByText('机选注数')).toBeInTheDocument();
    expect(screen.getByText('前后玩法').closest('.ant-segmented-item')).toHaveClass(
      'ant-segmented-item-selected',
    );

    // 再切回复式，确认旧的红色号码确实被清空
    fireEvent.click(screen.getByRole('radio', { name: '复式' }));
    expect(screen.getByText(/前区（已选 0/)).toBeInTheDocument();
    expect(screen.queryByText(/红球（已选/)).not.toBeInTheDocument();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  });
});
