# FEAT-001 任务拆分

> 开发方式：垂直切片（单人全栈、纯前端）。每个任务独立提交、可独立回滚；有效改动按估算控制，超出时拆分。
> 依赖顺序：01 → 02 → 03 → 04 → 05 → 06。

## TASK-FEAT-001-01 前端工程脚手架

- 目标：建立可运行、可测试、可构建的 React + TS + Ant Design 工程。
- 关联：FEAT-001 / TC-004、TC-014（后续任务验证）
- 依赖任务：无
- 端：前端
- 可修改范围：`frontend/package.json`、`frontend/index.html`、`frontend/vite.config.ts`、`frontend/tsconfig*.json`、`frontend/eslint.config.js`、`frontend/src/main.tsx`、`frontend/src/App.tsx`、`frontend/src/index.css`、`frontend/src/vite-env.d.ts`
- 禁止事项：不写业务逻辑；不引入路由与状态管理库；不新增未列出的依赖。
- 验收标准：
  - `pnpm install`、`pnpm lint`、`pnpm typecheck`、`pnpm build` 通过。
  - 页面渲染标题与免责声明占位。
- 验证命令：`cd frontend && pnpm lint && pnpm typecheck && pnpm build`

## TASK-FEAT-001-02 彩票核心逻辑与单元测试

- 目标：实现彩种配置、随机与均衡机选、复式/胆拖组合、号码分析与格式化，全部纯函数。
- 关联：FEAT-001 / TC-001、TC-002、TC-003、TC-005、TC-006、TC-007、TC-008、TC-009、TC-010、TC-011
- 依赖任务：TASK-FEAT-001-01
- 端：前端
- 可修改范围：`frontend/src/features/lottery/{types,config,constants,random,generator,analysis,format}.ts`、对应 `*.test.ts`、`frontend/src/services/storage.ts`、`storage.test.ts`
- 禁止事项：不引入随机库、组合库；不访问网络；不修改 UI 文件。
- 验收标准：上述 TC 的单测全部通过；`pnpm test` 通过。
- 验证命令：`cd frontend && pnpm test`

## TASK-FEAT-001-03 机选页面与结果展示

- 目标：完成彩种切换、机选参数、生成结果与分析展示。
- 关联：FEAT-001 / TC-001、TC-002、TC-003、TC-004、TC-010、TC-013、TC-014、TC-016
- 依赖任务：TASK-FEAT-001-02
- 端：前端
- 可修改范围：`frontend/src/App.tsx`、`frontend/src/features/lottery/hooks/**`、`frontend/src/features/lottery/components/{GameSwitcher,QuickPickPanel,TicketList,NumberBall}.tsx`、`frontend/src/index.css`
- 禁止事项：不实现复式/胆拖逻辑；不改核心生成函数。
- 验收标准：机选 1–10 注可用；非法参数禁用并提示；切换彩种清空选择。
- 验证命令：`cd frontend && pnpm lint && pnpm typecheck && pnpm test`

## TASK-FEAT-001-04 复式与胆拖页面

- 目标：完成复式、胆拖两种模式的号码选择、组合/金额实时预览与超限拦截。
- 关联：FEAT-001 / TC-005、TC-006、TC-007、TC-008、TC-009
- 依赖任务：TASK-FEAT-001-03
- 端：前端
- 可修改范围：`frontend/src/features/lottery/components/{MultiplePanel,BankerPanel}.tsx`、`frontend/src/features/lottery/hooks/**`、`frontend/src/App.tsx`
- 禁止事项：不改动机选算法与分析模块。
- 验收标准：复式与胆拖的注数、金额与手工计算一致；超限或非法组合被拦截。
- 验证命令：`cd frontend && pnpm lint && pnpm typecheck && pnpm test`

## TASK-FEAT-001-05 复制与本地历史

- 目标：支持复制号码、保存历史、删除单条与清空，并在存储异常时降级。
- 关联：FEAT-001 / TC-011、TC-012、TC-015
- 依赖任务：TASK-FEAT-001-04
- 端：前端
- 可修改范围：`frontend/src/features/lottery/components/HistoryList.tsx`、`frontend/src/features/lottery/hooks/**`、`frontend/src/services/storage.ts`、`frontend/src/App.tsx`
- 禁止事项：不上传数据到任何服务器；不引入云端存储。
- 验收标准：复制、保存、刷新保留、删除、清空均可用；存储异常不导致白屏。
- 验证命令：`cd frontend && pnpm lint && pnpm typecheck && pnpm test`

## TASK-FEAT-001-06 部署与文档收尾

- 目标：配置 GitHub Pages 自动部署，补齐项目文档并完成上线验证。
- 关联：FEAT-001 / 全部核心用例（线上冒烟）
- 依赖任务：TASK-FEAT-001-05
- 端：共享（CI 配置与文档）
- 可修改范围：`.github/workflows/deploy.yml`、`README.md`、`docs/features/FEAT-001-lottery-advisor/**`、`docs/architecture.md`、`docs/conventions.md`
- 禁止事项：不在仓库中提交任何密钥；不修改业务代码行为。
- 验收标准：`main` 推送后 Actions 部署成功，线上地址可访问且主流程可用。
- 验证命令：`gh run watch`；浏览器访问线上地址
