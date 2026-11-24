import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './features/auth/AuthContext';
import './index.css';
import Watermark from './components/Watermark';

/**
 * 应用入口：挂载 React 根节点，主题由本地 shadcn 变量统一提供。
 */
const container = document.getElementById('root');

if (!container) {
  throw new Error('未找到 #root 挂载节点，请检查 index.html');
}

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <Watermark />
      <App />
    </AuthProvider>
  </StrictMode>,
);
