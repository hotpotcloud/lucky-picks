# 架构概览

## 当前形态

Lucky Picks 是一个纯前端静态单页应用，无后端、无数据库、无鉴权。所有号码生成、组合计算与分布分析在浏览器内执行；用户主动保存的结果存放于 `localStorage`。

```mermaid
flowchart TB
  subgraph Browser
    Page[React 页面] --> Hook[useLottery Hook]
    Hook --> Core[纯函数核心]
    Hook --> Store[localStorage]
  end
  Build[Vite 构建产物] --> Pages[GitHub Pages]
```

## 代码分层

| 层 | 位置 | 职责 |
|---|---|---|
| 页面 | `frontend/src/App.tsx` | 组合布局、模式切换、结果与历史展示 |
| Hook | `frontend/src/features/lottery/hooks/` | 选号状态、参数校验、生成与保存动作 |
| 核心 | `frontend/src/features/lottery/*.ts` | 彩种配置、随机、组合、分析、格式化（纯函数） |
| 存储 | `frontend/src/services/storage.ts` | 历史读写、异常降级 |

## 关键约束

- 核心逻辑不得依赖 React 或浏览器 API，必须可独立单测。
- 前端不发起任何网络请求，不采集个人信息。
- 生成类函数必须校验参数并限制组合数量，避免浏览器卡死。
- UI 使用 Ant Design 5 现有组件，不自创视觉体系。

## 部署

GitHub Actions 在 `main` 推送后执行安装、测试、构建，并将 `frontend/dist` 发布到 GitHub Pages。线上地址：<https://hotpotcloud.github.io/lucky-picks/>。

## 后续演进

- FEAT-002（候选）：接入公开历史开奖数据，提供冷热号与遗漏值分析（需先确认数据来源与合规）。
- FEAT-003（候选）：增加分享图、号码对比、开奖结果核对。
