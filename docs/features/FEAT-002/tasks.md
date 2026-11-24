# FEAT-002 任务拆分

> 开发方式：分端开发（建议，待确认）。后端、前端任务卡独立，引用同一份契约与 TC；单任务有效改动 ≤400 行、≤10 个文件。
> 依赖顺序：S01 → B01 → B02/B03 → B04 → B05/B06 → B07 → F01 → F02/F03/F04 → F05 → F06 → F07 → D01。
> 验证命令（实现后落到 AGENTS.md）：后端 `ruff check . && pyright && pytest`；前端 `pnpm lint && pnpm typecheck && pnpm test && pnpm build`。

## T00 术语规范化迁移（已完成）

- 目标：全仓库去除受限字样，统一为中性术语，并加装自动校验。
- 关联：REQ-116 / TC-121
- 依赖：无
- 端：共享
- 可修改范围：全仓库文本文件、`frontend/scripts/check-terminology.mjs`、`.github/workflows/deploy.yml`
- 内容：目录与标识符重命名（玩法模块目录改为 `features/picker`、页面状态 Hook 改为 `usePicker`、业务异常改为 `SelectionError`、玩法标识统一为 `redblue` / `frontback`）；界面文案、文档、README、契约描述改写；新增术语检查脚本并接入 CI。
- 验收：`pnpm check:terms` 通过；lint、typecheck、test、build 通过；线上页面无受限字样。
- 状态：已完成（见 `docs/features/FEAT-002/README.md` 记录）

## S01 契约与共享类型

- 目标：定稿 OpenAPI 契约，生成前端类型，建立后端契约测试骨架。
- 关联：FEAT-002 / TC-103–TC-107、TC-117
- 依赖：无
- 端：共享
- 可修改范围：`docs/contracts/openapi.yaml`、`frontend/src/api/types.ts`（生成）、`frontend/package.json`（openapi-typescript，需批准）、`backend/tests/contract/**`
- 验收：契约包含全部端点/错误码/示例；`openapi-typescript` 生成成功；契约测试可在空实现上运行并失败（TDD）。
- 禁止：不实现业务逻辑；不手写与契约重复的类型。

## B01 后端脚手架与基础设施

- 目标：FastAPI 可启动，统一响应、错误码、requestId、日志、配置、健康检查就绪。
- 关联：TC-118
- 依赖：S01
- 端：后端
- 可修改范围：`backend/app/{main.py,common/**,config/**,middleware/**,utils/**}`、`backend/{requirements.txt,pyproject.toml,.env.example}`、`backend/tests/api_test/test_health.py`
- 验收：`/health` 返回 200；错误响应结构一致；`ruff`、`pyright`、`pytest` 通过。
- 禁止：不接数据库、不写业务规则。

## B02 规则引擎（全玩法）

- 目标：红蓝玩法/前后玩法全部投注模式的合法性、组合数、金额、上限校验。
- 关联：TC-103、TC-104、TC-105、TC-106、TC-107
- 依赖：B01
- 端：后端
- 可修改范围：`backend/app/games/**`、`backend/app/utils/combinatorics.py`、`backend/tests/unit_test/test_rules*.py`
- 验收：参数化测试覆盖单式/复式/胆拖/追加/倍数/边界/非法；金额与官方一致；错误码明确。
- 禁止：不实现推荐/统计；不做数据抓取。

## B03 数据适配器与抓取任务

- 目标：抓取官方红蓝玩法/前后玩法数据，规范化、校验、去重、写入 JSON 与 SQLite。
- 关联：TC-101、TC-102
- 依赖：B01
- 端：后端
- 可修改范围：`backend/app/draws/adapters/**`、`backend/app/draws/{service,crud,schemas}.py`、`backend/app/db/**`、`backend/scripts/fetch_draws.py`、`backend/data/**`、`backend/tests/fixtures/**`、`backend/tests/unit_test/test_adapters*.py`、`.github/workflows/update-draws.yml`
- 验收：fixture 解析正确；重复抓取幂等；失败不覆盖旧数据；Actions 可手动触发；`data/meta.json` 含版本/来源/更新时间。
- 禁止：不访问非官方来源；不提交密钥；不高频抓取。

## B04 开奖查询与统计接口

- 目标：实现 `/games`、`/draws`、`/draws/latest`、`/stats`。
- 关联：TC-108、TC-109、TC-117
- 依赖：B02、B03
- 端：后端
- 可修改范围：`backend/app/games/views.py`、`backend/app/draws/views.py`、`backend/app/stats/**`、`backend/tests/unit_test/test_stats*.py`、`backend/tests/api_test/test_draws_stats*.py`
- 验收：统计公式与 fixture 手工结果一致；分页/筛选正确；响应符合契约；缓存生效。
- 禁止：不在请求中实时抓取外部接口。

## B05 推荐服务

- 目标：实现 6 种策略、约束、加权采样、解释、复式/胆拖推荐、seed 复现。
- 关联：TC-110、TC-111、TC-112、TC-113、TC-114
- 依赖：B04
- 端：后端
- 可修改范围：`backend/app/recommend/**`、`backend/tests/unit_test/test_recommend*.py`、`backend/tests/api_test/test_recommend.py`
- 验收：36 组玩法×策略×模式全部合法；同 seed 一致；解释可读；金额上限；p95 达标。
- 禁止：不训练 ML 模型；不引入未批准依赖。

## B06 回测服务

- 目标：walk-forward 回测、随机基线、奖级判定、ROI/命中率/置信区间。
- 关联：TC-115、TC-116
- 依赖：B02、B04
- 端：后端
- 可修改范围：`backend/app/backtest/**`、`backend/app/games/prizes.py`、`backend/tests/unit_test/test_backtest*.py`、`backend/tests/api_test/test_backtest.py`
- 验收：合成数据结果与手工一致；不穿越未来数据；样本不足提示；浮动奖标记估算。
- 禁止：不做在线训练；不把回测包装成预测。

## B07 部署与运维

- 目标：Docker 构建、Render 部署、CORS/限流/日志、健康检查。
- 关联：TC-118、TC-120
- 依赖：B05、B06
- 端：后端
- 可修改范围：`backend/Dockerfile`、`backend/requirements.txt`、`backend/app/config/**`、`backend/app/middleware/**`、`.github/workflows/deploy-backend.md`（操作说明）
- 验收：镜像可构建；Render 健康检查通过；CORS 只允许指定域名；限流生效；冷启动有文档。
- 禁止：不提交密钥；不开启公网写接口。

## F01 API 客户端与契约类型

- 目标：前端接入生成类型、请求封装、错误映射、离线快照。
- 关联：TC-117、TC-120
- 依赖：S01、B04
- 端：前端
- 可修改范围：`frontend/src/api/**`、`frontend/src/shared/hooks/useApiQuery.ts`、`frontend/src/shared/components/AsyncState.tsx`、`frontend/vite.config.ts`（dev 代理）
- 验收：类型无手改；错误码映射完整；超时/重试/取消可用。
- 禁止：不手写重复类型；不在组件内散落 fetch。

## F02 全玩法选号工作台

- 目标：单式/复式/胆拖/追加/倍数、注数与金额、校验、带入。
- 关联：TC-103–TC-107、TC-113、TC-121
- 依赖：F01、B02
- 端：前端
- 可修改范围：`frontend/src/features/picker/**`、`frontend/src/app/App.tsx`、`frontend/src/index.css`
- 验收：全玩法可操作；金额与后端一致；错误就地提示；360px 可用。
- 禁止：不改推荐/统计模块；不引入路由库。

## F03 历史开奖与统计页面

- 目标：最新/历史列表、频率/冷热/遗漏/分布/卡方展示。
- 关联：TC-108、TC-109、TC-120
- 依赖：F01、B04
- 端：前端
- 可修改范围：`frontend/src/features/draws/**`、`frontend/src/features/stats/**`、`frontend/public/data/**`（离线快照）
- 验收：数据与接口一致；离线可用；图表有文本替代；样本不足提示。
- 禁止：不在前端重新实现统计公式（除展示格式化）。

## F04 推荐页面

- 目标：策略/窗口/约束/seed 表单、推荐结果、解释、复制/保存/带入。
- 关联：TC-110–TC-114
- 依赖：F01、B05
- 端：前端
- 可修改范围：`frontend/src/features/recommend/**`、`frontend/src/features/history/**`
- 验收：结果合法可复现；解释可读；一键带入正确；loading/错误/空状态完整。
- 禁止：不展示「必中」类文案；不在前端伪造推荐。

## F05 回测页面

- 目标：参数、汇总、基线对比、置信区间、累计 ROI。
- 关联：TC-115、TC-116
- 依赖：F01、B06
- 端：前端
- 可修改范围：`frontend/src/features/backtest/**`
- 验收：指标与接口一致；样本不足提示；方法论文案固定。
- 禁止：不把回测结果解释为未来预测。

## F06 部署与集成

- 目标：前端 API 地址注入、离线降级、E2E、GitHub Pages 部署。
- 关联：TC-119、TC-120
- 依赖：F02–F05、B07
- 端：前端
- 可修改范围：`.github/workflows/deploy.yml`、`frontend/vite.config.ts`、`frontend/src/app/App.tsx`、`frontend/e2e/**`
- 验收：Pages 线上可用；后端地址可配置；E2E 主流程通过；后端不可用降级正确。
- 禁止：不提交生产密钥；不在 CI 中依赖真实外部接口。

## D01 文档、验收与 AGENTS 更新

- 目标：更新架构/规范/AGENTS 命令与团队配置，补齐验收记录与 FEAT-003 清单。
- 关联：全部
- 依赖：F06、B07
- 端：共享
- 可修改范围：`docs/architecture.md`、`docs/conventions.md`、`AGENTS.md`、`docs/features/FEAT-002/**`、`docs/features/FEAT-003/backlog.md`
- 验收：文档与实现一致；验收记录含命令与结果；FEAT-003 清单可执行。
- 禁止：不把未实现能力写成已完成。

## 估算

| 端 | 任务数 | 预估有效改动 |
|---|---|---|
| 共享 | 1 | ~300 行（契约/类型/测试骨架） |
| 后端 | 7 | ~1800 行（含测试） |
| 前端 | 6 | ~1500 行（含测试） |
| 文档 | 1 | ~300 行 |
| 合计 | 15 | ~3900 行，预计 3–5 个迭代 |

> 每个任务单独 MR；若单任务超 400 行，拆成「实现」与「测试/文档」两个 MR。
