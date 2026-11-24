# AI 对话模块设计

- 状态：已实现（未提交）
- 关联：FEAT-002、AI 分析接入
- 日期：2026-11-24

## 1. 目标

在工作台内提供多轮 AI 对话，允许登录用户选择模型并配置自己的 API Key；未配置时使用服务端 `PWKEY`。对话只做统计解读、规则说明与软件使用问答，不承诺中奖或收益。

## 2. 组件选型

| 候选 | 结论 | 原因 |
|---|---|---|
| `assistant-ui`（`@assistant-ui/react`） | 采用 | React 18 兼容，提供线程、消息、输入框等无障碍原语；支持自定义运行时与 Markdown；社区成熟度高 |
| `@chatscope/chat-ui-kit-react` | 未采用 | Star 数量与维护活跃度不足，样式与现有暗黑主题整合成本高 |
| 自研聊天 UI | 未采用 | 需要自行处理滚动锚点、键盘提交、无障碍与流式状态，维护成本高 |

实现只引入核心运行时与 Markdown 渲染：

- `@assistant-ui/react@0.15.38`
- `@assistant-ui/react-markdown@0.14.26`

界面样式使用项目现有 shadcn 语义变量与 Tailwind，不引入第三方主题 CSS。

## 3. 前端结构

| 文件 | 职责 |
|---|---|
| `src/features/chat/ChatPanel.tsx` | 对话界面、运行时适配器、配置面板、清空与停止生成 |
| `src/features/chat/useChatSettings.ts` | 模型、密钥来源、用户 Key、系统提示词的本地持久化 |
| `src/api/client.ts` | `fetchAiChat`，复用登录令牌与统一错误解析 |
| `src/api/types.ts` | `ChatMessageDto`、`ChatReplyDto` |
| `src/index.css` | 对话布局、消息气泡、Markdown 排版、暗色高对比样式 |

### 3.1 运行时

- 使用 `useLocalRuntime` + 自定义 `ChatModelAdapter`。
- 适配器把 assistant-ui 消息转换为 `{ role, content }`，忽略 UI 内的 system 消息。
- 用户自定义系统提示词放在消息列表首位；服务端还会注入统一安全提示词。
- `abortSignal` 透传到 `fetch`，支持“停止生成”。
- 当前为非流式整段返回；Markdown 组件负责平滑呈现，后续可替换为 SSE。

### 3.2 配置与密钥

- 模型：默认 `deepseek-v4.1-flash`，可通过输入框与候选列表选择其它兼容模型。
- 密钥来源：`服务端` / `自带` 两种模式。
- 用户 Key 只写入 `sessionStorage`，关闭标签页清除；不写入 `localStorage`、不写入后端数据库。
- 模型与系统提示词写入 `localStorage`，便于下次打开继续使用。
- 界面明确提示自带 Key 仅保存在当前标签页。

### 3.3 交互

- 进入工作台顶部导航新增「AI 对话」Tab。
- 空会话提供三条快捷提问；点击后直接发起一轮对话。
- 发送：Enter；换行：Shift + Enter。
- 生成中显示状态与「停止」按钮；清空会中断当前生成并重置线程。
- 消息区内部滚动；页面整体不出现额外滚动冲突。

## 4. 后端接口

### 4.1 `POST /api/v1/ai/chat`

鉴权：Bearer 令牌。

请求：

```json
{
  "messages": [
    { "role": "user", "content": "解读最近 50 期的冷热分布" }
  ],
  "model": "deepseek-v4.1-flash",
  "apiKey": "用户可选的自带 Key"
}
```

约束：

- `messages` 1–40 条，单条 1–8000 字符。
- `role` 仅允许 `system` / `user` / `assistant`。
- `model` 最长 64，字符集 `[A-Za-z0-9._:/-]`。
- `apiKey` 1–512 字符，可省略；省略时使用服务端 `PWKEY`。
- 请求体禁止额外字段。

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "model": "deepseek-v4.1-flash",
    "content": "……",
    "disclaimer": "AI 输出仅供参考；开奖为独立随机事件，历史统计不改变下一期概率。"
  },
  "requestId": "…"
}
```

错误：

- `50302`：Key 缺失、上游失败或返回为空。
- `429`：对话限流（单来源 30 次/分钟，全局 90 次/分钟）。

### 4.2 安全约束

- 不接收任意 `baseUrl`，避免 SSRF；上游地址固定为服务端配置的兼容端点。
- Key、消息正文不写日志；日志只记录模型、状态码与请求结果。
- 服务端统一注入安全提示词，禁止收益承诺与“必中”类表述。
- Key 不落库、不进入响应。

## 5. 初始页 3D 场景

- 新增 `src/features/auth/TreasureScene.tsx`，使用纯 CSS 透视实现聚宝盆、盆沿金币堆、金币雨与光点。
- 金币参数固定配置，避免每次渲染随机跳动；只动画 `top` / `transform` / `opacity`。
- 初始页增加网格透视背景、描边字与品牌标识，仍不展示介绍性小字。
- 登录入口保持原暗号：连续点击右上角水印两次后展开登录框。
- `prefers-reduced-motion` 下关闭金币、光点与轨道动画。

## 6. 验证

- `pnpm typecheck`：通过。
- `pnpm lint`：0 error（2 条既有 Fast Refresh warning）。
- `pnpm check:terms`：通过。
- `pnpm build`：通过。

说明：按需求提出方要求，本次未运行单测、未打开浏览器做视觉验收。
