import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import './index.css';

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
    <ConfigProvider locale={zhCN}>
      <AntdApp>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
);
