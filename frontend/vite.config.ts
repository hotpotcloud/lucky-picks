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
  base: mode === 'production' ? '/lucky-picks/' : '/',
  build: {
    // React 与 Ant Design 体积较大，单独分包便于浏览器长期缓存
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          antd: ['antd', '@ant-design/icons'],
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
