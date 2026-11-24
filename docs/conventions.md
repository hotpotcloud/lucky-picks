# 代码与提交规范

## 分支

- 新特性：`feat/FEAT-xxx-简述`
- 修复：`fix/ISSUE-xxx-简述`
- 紧急修复：`hotfix/ISSUE-xxx-简述`

## 提交信息

- 格式：`<类型>(<范围>): <描述> [FEAT-xxx]`
- 类型：feat、fix、refactor、test、docs、chore
- 示例：`feat(frontend): 实现机选与结果分析 [FEAT-001]`

## 代码风格

- 前端：ESLint 9 flat config + TypeScript 严格模式；Prettier 兼容排布。
- 命名：组件 `PascalCase`，函数与变量 `camelCase`，常量 `UPPER_SNAKE_CASE`，类型 `PascalCase`。
- 注释：导出函数、类型字段、复杂算法必须有中文注释，说明用途、参数、返回值与边界。
- 不使用 `any`；确需规避第三方类型问题时使用 `unknown` 并收窄。
- 数字与字符串字面量集中到 `constants.ts`，禁止散落魔法值。

## 术语规范（强约束）

项目内不得出现真实游戏名称及其等价写法；受限词清单与例外规则以 `frontend/scripts/check-terminology.mjs` 为准，统一使用中性术语：

| 场景 | 规范用词 |
|---|---|
| 玩法 A | `红蓝玩法` / `Red-Blue`，标识符 `redblue` |
| 玩法 B | `前后玩法` / `Front-Back`，标识符 `frontback` |
| 品类 | 选号 / number picking / number advisor |
| 官方来源 | `官方数据源 A` / `官方数据源 B` |

- 适用范围：代码、注释、界面文案、文档、提交信息、仓库描述与 Pages 元数据。
- 例外：第三方仓库名、官方域名、上游接口字段名等外部专有名词按原样引用。
- 强制校验：`cd frontend && pnpm check:terms`，CI 同样执行，失败即阻断。

## 验证门禁

- `cd frontend && pnpm check:terms`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`
- `cd frontend && pnpm test`
- `cd frontend && pnpm build`

全部通过才可提交与部署。

## MR / 部署

- 有效改动不超过 400 行，超出拆分；绿地项目的首次初始化允许按「文档 / 前端实现 / CI」三次提交，并在 MR 中说明例外原因。
- MR 描述需包含：目标、范围、验证命令与输出、关联 FEAT/TC、AI 参与说明。
- PR 与 `main` 推送均执行 CI 门禁；仅 `main` 推送触发部署。
- 部署由 `main` 分支的 GitHub Actions 自动完成；无人工生产操作。
- 建议在 GitHub 为 `main` 开启分支保护，要求 `verify` 检查通过后才能合并。
