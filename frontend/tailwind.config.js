/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // 禁用 preflight，避免 Tailwind 重置样式影响 Ant Design 组件。
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050b14',
          panel: 'rgba(13, 27, 46, 0.55)',
          border: 'rgba(56, 189, 248, 0.22)',
          cyan: '#22d3ee',
          blue: '#3b82f6',
          glow: 'rgba(34, 211, 238, 0.35)',
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        glow: '0 0 24px rgba(34, 211, 238, 0.25)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'scan-line': 'scanLine 4s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(34,211,238,0.2)' },
          '50%': { boxShadow: '0 0 32px rgba(34,211,238,0.55)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
