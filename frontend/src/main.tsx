import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import './index.css';
import Watermark from './components/Watermark';

/**
 * 应用入口：挂载 React 根节点，注入 Ant Design 中文语言包与 App 上下文
 * （App 上下文用于让 message 等静态方法获得主题与国际化支持）。
 */
const container = document.getElementById('root');

if (!container) {
  throw new Error('未找到 #root 挂载节点，请检查 index.html');
}

createRoot(container).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#22d3ee',
          colorBgBase: '#050b14',
          colorBgContainer: 'rgba(13, 27, 46, 0.55)',
          colorText: '#e2f4ff',
          colorBorder: 'rgba(56, 189, 248, 0.22)',
          borderRadius: 10,
        },
      }}
    >
      <AntdApp>
        <AuthProvider>
          <Watermark />
          <App />
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
);
