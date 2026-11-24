# 项目规则（AI 常驻）

本仓库遵循团队《AI 辅助前后端研发流程》。流程模板与 skill 位于团队共享目录（研发流程仓库），本文件只声明本项目配置与命令。

## 团队配置

- 开发方式：垂直切片（当前 v1 为纯前端静态应用，无后端）
- 人员：一人全栈
- 专职角色：无（使用现有组件库，不自创样式；核心用例必须自动化）
- 部署：GitHub Pages（`main` 推送自动部署）
- 线上地址：https://hotpotcloud.github.io/lucky-picks/

按配置遵守：
- 一人全栈：AI 评审与实现必须用不同会话；AI 不得代替需求提出方确认需求或验收。
- 无专职角色：需求与验收由需求提出方确认；无设计稿时统一使用 Ant Design 5。
- 涉及鉴权、资金、数据迁移与删除、生产配置与密钥、对外 API 破坏性变更时，必须提醒人找第二人评审。

## 常用命令

- 安装依赖：`cd frontend && pnpm install`
- 开发：`cd frontend && pnpm dev`
- 术语检查：`cd frontend && pnpm check:terms`
- Lint：`cd frontend && pnpm lint`
- 类型检查：`cd frontend && pnpm typecheck`
- 测试：`cd frontend && pnpm test`
- 构建：`cd frontend && pnpm build`
- 契约校验：不适用（无后端与接口）

## 工作方式

1. 开工前先读 `docs/features/<FEAT>/` 下的任务卡及其引用文档，先输出实施计划，再改代码。
2. 只改任务卡规定的目录和文件，不顺手重构、不改格式、不动无关文件。
3. 先有测试再实现。完成标准是测试、lint、类型检查全部通过，并贴出命令和输出。
4. 引用的库、函数、配置项必须确认真实存在，不确定就说明，不要猜。
5. 单个任务有效改动不超过 400 行，超出时停下并建议拆分。
6. 特性文档放在 `docs/features/<FEAT>/`，标准及重量任务维护 `progress-frontend.md`。

## 必须先问人再执行

新增或升级依赖；改 CI 与构建配置；删除文件；改数据库结构；改契约；范围外改动。

## 术语规范（强约束）

- 项目内不得出现真实游戏名称及其等价写法；受限词清单与例外规则以 `frontend/scripts/check-terminology.mjs` 为准（中文受限字、对应英文写法、自撰同义表述均禁止）。
- 统一用中性术语：玩法 A = `红蓝玩法` / `Red-Blue`（标识符 `redblue`）；玩法 B = `前后玩法` / `Front-Back`（标识符 `frontback`）；品类用「选号」；官方来源用 `官方数据源 A` / `官方数据源 B`。
- 例外：第三方仓库名、官方域名、上游接口字段名等外部专有名词按原样引用。
- 提交前必须执行 `pnpm check:terms`；CI 会阻断。

## 禁止

- 修改、删除、跳过或弱化测试来让测试通过
- 提交密钥、凭据、生产数据；读取 `.env` 和密钥目录
- 操作生产环境；强制推送；绕过 CI 与评审
- 未经确认直接合并
- 接入真实开奖数据或第三方选号接口（需先确认来源与合规）

## 文档索引

- 架构：`docs/architecture.md`
- 规范：`docs/conventions.md`
- 当前特性：`docs/features/FEAT-001-number-advisor/`
- 设计中的特性：`docs/features/FEAT-002/`（历史数据、推荐算法、全玩法、Python 后端）
- 候选需求池：`docs/features/FEAT-003/backlog.md`
