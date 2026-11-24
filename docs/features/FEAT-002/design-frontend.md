# FEAT-002 设计（前端）：全玩法选号、数据、推荐与回测

- 关联需求：`docs/features/FEAT-002/requirement.md`
- 关联契约：`docs/contracts/openapi.yaml`
- 关联后端设计：`design-backend.md`
- 前端技术栈：React 18 + TypeScript 5 + Vite 5 + Ant Design 5（延续 FEAT-001）

## 1. 目标

在现有单页应用上扩展为「数据 + 选号 + 推荐 + 回测」工作台：

1. 全玩法选号（单式/复式/胆拖/追加/倍数），注数与金额实时准确。
2. 查看历史开奖、频率/遗漏/分布统计。
3. 生成可解释、可复现的推荐，并一键带入选号单。
4. 查看策略 vs 随机基线的回测结果。
5. 在后端不可用/冷启动时优雅降级。

## 2. 页面与导航

不新增路由库，使用 Ant Design `Tabs` + URL hash（`#/picker`、`#/recommend`、`#/draws`、`#/stats`、`#/backtest`、`#/rules`），刷新可恢复当前页。若后续需要深链/分享，再评估引入 React Router（需依赖审批）。

| Tab | 页面目的 | 核心内容 | 状态 |
|---|---|---|---|
| 选号工作台 | 手动/带入号码并校验 | 玩法、模式、分区选号、胆拖、追加、倍数、注数/金额 | loading（校验）、空、错误、成功 |
| 智能推荐 | 按策略生成建议 | 策略、窗口、注数、约束、seed、解释、一键带入 | loading、空、错误、额度/校验失败 |
| 历史开奖 | 查看官方开奖 | 最新一期、分页列表、来源/更新时间 | loading、空、错误、离线缓存 |
| 数据分析 | 号码画像 | 频率柱状、冷热榜、遗漏表、分布指标、卡方结论 | loading、空、样本不足、错误 |
| 回测 | 验证策略 | 策略 vs 随机、命中分布、ROI、置信区间、方法说明 | loading、样本不足、错误 |
| 玩法说明 | 规则与免责声明 | 全部玩法、金额上限、来源链接、风险提示 | 静态 |

## 3. 目录结构

```text
frontend/src/
├── app/
│   ├── App.tsx                  # 布局、Tabs、hash 同步
│   └── routes.ts                # Tab 定义（不引入路由库）
├── api/
│   ├── client.ts                # fetch 封装、超时、错误映射、requestId
│   ├── types.ts                 # 由 OpenAPI 生成（禁止手写重复类型）
│   └── endpoints.ts             # games/draws/stats/recommend/backtest
├── features/
│   ├── picker/
│   │   ├── config.ts            # 前端展示用规则（来自 /games，失败时内置只读快照）
│   │   ├── rules.ts             # 即时预校验（与后端同规则，最终以后端为准）
│   │   ├── bet.ts               # BetSelection 模型、注数/金额
│   │   ├── components/          # NumberGrid / BetSlip / AmountSummary / ...
│   │   └── hooks/useBetSlip.ts
│   ├── draws/
│   │   ├── components/DrawList.tsx
│   │   ├── components/LatestDraw.tsx
│   │   └── hooks/useDraws.ts
│   ├── stats/
│   │   ├── components/FrequencyChart.tsx
│   │   ├── components/OmissionTable.tsx
│   │   ├── components/DistributionCards.tsx
│   │   └── hooks/useStats.ts
│   ├── recommend/
│   │   ├── components/StrategyPicker.tsx
│   │   ├── components/ConstraintForm.tsx
│   │   ├── components/RecommendationList.tsx
│   │   ├── components/Explanation.tsx
│   │   └── hooks/useRecommendation.ts
│   ├── backtest/
│   │   ├── components/BacktestSummary.tsx
│   │   ├── components/RoiChart.tsx
│   │   └── hooks/useBacktest.ts
│   └── history/
│       └── ...                  # 复用 FEAT-001 本地历史，扩展金额快照
├── services/storage.ts          # 本地历史（升级 schema，兼容 v1）
└── shared/
    ├── hooks/useApiQuery.ts     # 轻量请求缓存/重试/取消
    └── components/AsyncState.tsx
```

## 4. 类型与契约

- `docs/contracts/openapi.yaml` 是唯一依据。
- 使用 `openapi-typescript` 生成 `src/api/types.ts`（新增 devDependency，需批准）；CI 校验生成文件无手改。
- 请求/响应类型只从生成文件导入，禁止手写重复类型。
- 若生成工具不可用，退化为手写类型 + 契约测试；必须在 MR 说明。

## 5. 选号工作台

### 5.1 状态模型

```ts
interface AreaSelection {
  key: AreaKey;            // red/blue/front/back
  numbers: number[];       // 普通选号（复式/单式）
  banker: number[];        // 胆码（胆拖模式）
}

interface BetSlip {
  game: GameId;
  mode: 'single' | 'multiple' | 'banker';
  multiplier: number;      // 1–99
  additional: boolean;     // 仅前后玩法
  areas: AreaSelection[];
}
```

### 5.2 交互

- 玩法切换：清空号码、模式回到单式、追加/倍数重置。
- 模式切换：
  - 单式：每区最多 `baseCount` 个，达到上限后点击新号替换最早选择（或提示）。
  - 复式：每区可选 `baseCount..range`，展示注数/金额。
  - 胆拖：主区/允许胆拖的区域用点击循环「未选 → 拖码 → 胆码 → 未选」；不支持胆拖的区域仍为普通复式。
- 前后玩法追加：Switch/Tag；金额展示「基本 X 元 + 追加 Y 元 = Z 元」。
- 倍数：InputNumber 1–99（1 表示不倍投），展示倍投后金额。
- 金额上限：超过官方上限时禁用「加入/保存/带入」，显示具体差额与建议（减少号码/降低倍数）。
- 前端即时校验与后端 `/bets/validate` 双重校验；后端错误优先展示。

### 5.3 页面规格

- 目的：让用户完成一注合法投注方案的组装。
- 数据：`/games` 规则，本地选择状态，`/bets/validate` 结果。
- 交互：选号、模式、追加、倍数、清空、校验、保存本地历史、复制。
- 状态：加载规则（骨架屏）、规则加载失败（只读内置快照 + 重试）、校验中（按钮 loading）、校验失败（就地 Alert）、成功（金额摘要）。
- 组件：`Segmented`, `InputNumber`, `Switch`, `Tag`, `Alert`, `Card`, `Space`, `Button`, `NumberGrid`, `AmountSummary`。
- 响应式：≥992px 左右分栏（选号 / 摘要+推荐），<992px 单列；360px 可用。

## 6. 智能推荐

- 表单：策略（6 个）、窗口（30/50/100/300）、注数（1–10）、约束（奇偶、大小、和值、跨度、连号、区间）、seed（可选）。
- 生成：POST `/recommendations`；展示 loading、错误（含 `RATE_LIMITED`/`DATA_UNAVAILABLE`）、空结果。
- 结果卡片：号码球、模式、注数、金额、策略说明、seed、数据版本、每个号码的解释（特征贡献条形）。
- 操作：复制、保存历史、一键带入工作台（按 mode 填充 areas/banker/multiplier/additional）、换一批（新 seed）。
- 免责声明固定在结果上方：历史统计不改变单注期望。

## 7. 历史开奖

- 最新一期卡片：期号、日期、号码、销售额/奖池（若有）、来源、更新时间。
- 列表：分页（每页 30）、按期号/日期筛选（前端筛选当前页或后端 offset；优先后端）。
- 离线：接口失败时读取内置 `public/data/` 快照（与后端同结构），显示「离线数据」标签。
- 号码球复用 FEAT-001 的 `NumberBall`。

## 8. 数据分析

- 频率柱状图：每个号码出现次数 + 期望线；热/冷用色区分（不仅靠颜色，附文字）。
- 冷热榜：Top/Bottom N，显示 z 分数。
- 遗漏表：当前遗漏、最大遗漏、平均遗漏、期望遗漏、遗漏比。
- 分布卡片：和值、跨度、奇偶、大小、三区、AC 值、连号。
- 卡方检验：χ²、df、p 值、结论文案（「与均匀分布无显著差异」/「历史偏离，但不代表未来」）。
- 样本不足（<30 期）时显示提示，不展示强结论。
- 图表库：优先 `@ant-design/charts`（与 AntD 一致）或轻量 SVG；新增依赖需批准。若不允许，使用纯 CSS/SVG 实现频率条与走势格。

## 9. 回测

- 参数：策略、窗口、回测期数（50/100/200）、注数、是否追加（前后玩法）。
- 展示：投入、回报、ROI、命中率、各奖级次数、与随机基线差值、置信区间、累计 ROI 折线。
- 固定文案：回测为历史模拟，不代表未来；样本不足时不下结论；浮动奖为估算。
- 若差值置信区间跨 0，展示「未发现优于随机基线的证据」。
- 加载可能较慢（免费实例）：显示进度提示与取消/重试。

## 10. API 客户端

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    const body = await res.json();
    if (!res.ok || body.code !== 0) throw new ApiError(body.code, body.message);
    return body.data as T;
  } finally {
    clearTimeout(timer);
  }
}
```

- 错误映射：网络/超时 →「服务唤醒中或网络异常」；`RATE_LIMITED` →「请求过于频繁」；`DATA_UNAVAILABLE` →「数据暂不可用，已展示缓存」；`INVALID_SELECTION` → 展示后端原因。
- 请求缓存：`useApiQuery` 内存缓存 + 手动刷新；统计数据 10 分钟内不重复拉取。
- 冷启动：首次请求超时 15s，失败后可重试；显示「免费服务可能正在唤醒（约 30 秒）」。

## 11. 本地历史升级

- `HistoryRecord` 扩展：`mode` 支持 `single|multiple|banker`，新增 `multiplier`、`additional`、`amount`、`combinations`、`dataVersion`、`strategy?`、`seed?`。
- 兼容 v1：读取旧记录时补默认值 `multiplier=1, additional=false`；写回新 schema。
- 单条最多保存 200 注预览的规则保留；金额用快照，不随后续调价变化。

## 12. 性能与可访问性

- 号码网格按钮加 `aria-label`（区域+号码+状态）、`aria-pressed`；胆码/拖码不仅靠颜色区分（加文字/Tag）。
- 图表提供文本摘要/表格替代；颜色对比度满足 WCAG AA。
- 长列表分页/虚拟化（如需）；推荐/回测结果分块渲染。
- 首屏按需加载重量级图表模块（动态 import），控制包体。
- 移动端 360px 无横向滚动；触控目标 ≥40px。

## 13. 依赖与构建

| 依赖 | 用途 | 是否新增 | 备注 |
|---|---|---|---|
| `@ant-design/charts` 或轻量 SVG | 统计/回测图表 | 待批准 | 若禁止则用 SVG/CSS |
| `openapi-typescript` | 契约生成类型 | 待批准 | 需 CI 校验 |
| 现有 AntD / React / Vite | 延续 | 否 | - |

- 环境变量：`VITE_API_BASE_URL`（Actions Variables 注入）。
- 构建：`pnpm build`；生产 base `/lucky-picks/`。
- 部署：GitHub Pages；后端地址指向 Render。
- 若后端未配置：构建仍成功，页面显示离线只读与「推荐/回测暂不可用」。

## 14. 测试策略

- 组件/ Hook 测试：模式切换、胆拖循环、金额上限、追加/倍数、错误映射、离线降级。
- 契约类型：生成类型与 mock 数据一致；API 客户端测试错误码。
- E2E（Playwright）：历史 → 统计 → 推荐 → 带入 → 校验 → 保存；后端不可用降级；360px。
- 门禁：lint、typecheck、test、build。

## 15. 本轮不动项

- 不引入路由框架（先 Tabs + hash）。
- 不重写 FEAT-001 的号码球/历史基础组件，只做扩展。
- 不自创视觉体系，继续 Ant Design 5。
- 不做账号、云同步、支付。
