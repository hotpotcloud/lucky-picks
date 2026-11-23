import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * 每个用例结束后清理渲染树。
 * 由于未开启 vitest globals，Testing Library 不会自动注册清理逻辑，这里手动注册。
 */
afterEach(() => {
  cleanup();
});

/**
 * jsdom 缺失部分浏览器 API，Ant Design 的响应式观察器依赖 matchMedia。
 * 这里提供最小可用实现，避免组件测试因环境差异失败。
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/** ResizeObserver 最小桩实现。 */
class ResizeObserverStub {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

if (!('ResizeObserver' in window)) {
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverStub,
  });
}
