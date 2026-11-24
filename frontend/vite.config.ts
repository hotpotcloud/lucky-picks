import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vite / Vitest 配置。
 * - 生产构建使用 `/lucky-picks/` 作为基础路径，匹配 GitHub Pages 项目页。
 * - 测试环境使用 jsdom，并加载 Testing Library 的 jest-dom 断言扩展。
 */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages 项目页部署在子路径下，本地开发保持根路径。
  // 服务器独立部署时设置 VITE_BASE_PATH=/；GitHub Pages 保持 /lucky-picks/
  base: process.env.VITE_BASE_PATH ?? (mode === 'production' ? '/lucky-picks/' : '/'),
  server: {
    // 本地开发保持浏览器同源请求，由 Vite 转发到固定本机后端端口。
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.SERVICE_PORT ?? '1688'}`,
      },
    },
  },
  build: {
    // React 与 Ant Design 体积较大，单独分包便于浏览器长期缓存
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // 用函数按模块路径分包，确保 react/react-dom/scheduler 及其运行时
        // 真正进入独立 chunk；antd 与 rc-* 组件库单独一份，便于长期缓存。
        manualChunks: (id) => {
          // 统一路径分隔符，避免 Windows 下反斜杠导致分包失效
          const normalized = id.replace(/\\/g, '/');
          const parts = normalized.split('/');
          if (!parts.includes('node_modules')) {
            return undefined;
          }
          if (
            parts.includes('react') ||
            parts.includes('react-dom') ||
            parts.includes('scheduler')
          ) {
            return 'react';
          }
          if (
            parts.includes('antd') ||
            parts.includes('@ant-design') ||
            parts.includes('@rc-component') ||
            parts.some((part) => part.startsWith('rc-'))
          ) {
            return 'antd';
          }
          // Three.js 只服务于首页 3D 场景，独立分包后随懒加载按需下载。
          if (parts.includes('three')) {
            return 'three';
          }
          return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Ant Design 组件在 jsdom 中渲染较重，放宽单个用例超时时间
    testTimeout: 20000,
  },
}));
