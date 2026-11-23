import { fireEvent, render, screen, within } from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

/** 以与生产入口一致的 Provider 包裹渲染应用。 */
const renderApp = () =>
  render(
    <ConfigProvider locale={zhCN}>
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>,
  );

describe('App 交互（TC-013 / TC-014）', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('展示免责声明且不含误导性文案（TC-014）', () => {
    renderApp();
    expect(screen.getByText('免责声明')).toBeInTheDocument();
    expect(screen.getByText(/仅供娱乐参考/)).toBeInTheDocument();
    expect(screen.queryByText(/必中|预测中奖/)).not.toBeInTheDocument();
  });

  it('复式号码不足时禁用生成，补齐后按组合注数生成（TC-005）', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('radio', { name: '复式' }));
    expect(screen.getByText('红球至少选择 6 个号码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成号码' })).toBeDisabled();

    const redGrid = screen.getByRole('group', { name: '红球选号' });
    for (const value of ['01', '02', '03', '04', '05', '06', '07']) {
      fireEvent.click(within(redGrid).getByRole('button', { name: value }));
    }
    const blueGrid = screen.getByRole('group', { name: '蓝球选号' });
    fireEvent.click(within(blueGrid).getByRole('button', { name: '01' }));

    expect(screen.getAllByText('共 7 注').length).toBeGreaterThan(0);
    const generate = screen.getByRole('button', { name: '生成号码' });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);

    expect(screen.getAllByText('参考金额 14 元').length).toBeGreaterThan(0);
  });

  it('切换彩种后清空已选号码并回到机选（TC-013）', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('radio', { name: '复式' }));
    const redGrid = screen.getByRole('group', { name: '红球选号' });
    fireEvent.click(within(redGrid).getByRole('button', { name: '01' }));
    expect(screen.getByText(/红球（已选 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: '大乐透' }));

    // 切换后回到机选模式，展示大乐透规则
    expect(screen.getByText('机选注数')).toBeInTheDocument();
    expect(screen.getByText(/前区 1–35 选 5/)).toBeInTheDocument();
    expect(screen.queryByText(/红球（已选/)).not.toBeInTheDocument();
  });
});
