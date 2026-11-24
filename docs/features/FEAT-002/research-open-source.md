# FEAT-002 开源项目调研：选号数据分析与选号

> 调研日期：2026-11-23；数据来自 GitHub 仓库 README 与 API（star、license、更新时间）。
> 选择标准：与红蓝玩法/前后玩法相关、近两年有更新、功能有可借鉴点；不评价「预测准确率」，因为开奖结果为独立随机事件。

## 1. 对比总表

| 项目 | Star | 语言/协议 | 类型 | 核心能力 | 可借鉴 | 局限 |
|---|---:|---|---|---|---|---|
| [Liang-yc/ssq](https://github.com/Liang-yc/ssq) | 294 | Python / MIT | 研究 | CNN+LSTM 预测红蓝玩法/前后玩法，公开负面结论 | 诚实评估、模型实验结构 | TF1.x 老旧；无产品化 |
| [yangboz/LotteryPrediction](https://github.com/yangboz/LotteryPrediction) | 292 | Jupyter / NOASSERTION | 教学 | 概率/独立事件/赌徒谬误 | 概率教育与风险提示 | 非产品，无数据管道 |
| [sinyu1012/Double-Color-Ball-AI](https://github.com/sinyu1012/Double-Color-Ball-AI) | 181 | Python / MIT | Web 展示 | 多模型预测对比、命中计算、暗色主题 | 多模型对比 UI、命中追踪 | 预测无验证；静态数据 |
| [AaronJny/lotto](https://github.com/AaronJny/lotto) | 102 | Python / 无 | 研究 | Keras RNN 预测前后玩法 + 回测 | 回测流程、实验说明 | Demo，无服务化 |
| [zxz0119/lottery-ai-simulator](https://github.com/zxz0119/lottery-ai-simulator) | 89 | Python / MIT | 桌面仪表盘 | 历史分析、模拟推荐、推荐历史/批次、OpenAI 兼容总结 | 推荐批次、报告、可复盘 | Electron 桌面；范围大 |
| [TheMelody/LotteryTrend](https://github.com/TheMelody/LotteryTrend) | 70 | Java / Apache-2.0 | Android | 红蓝玩法走势图 | 走势图布局、遗漏展示 | 原生 Android；年代久 |
| [BEWINDOWEB/lotterygrabber](https://github.com/BEWINDOWEB/lotterygrabber) | 51 | Shell / MIT | 爬虫 | 按开奖日定时抓取红蓝玩法/前后玩法 | 定时策略、数据文件格式 | Python2/Debian 旧；无校验 |
| [luhao-worker/tf-lottery](https://github.com/luhao-worker/tf-lottery) | 35 | Python / 无 | 研究 | AI 预测（前后玩法/排列3/排列5/七星类玩法） | 多玩法接入、实时通信 | TF1.15 过时；无验证 |
| [snjyor/lucky_ball](https://github.com/snjyor/lucky_ball) | 24 | Python / MIT | 自动化报告 | 每日抓取、频率/冷热、5 种推荐策略、Markdown 报告 | 策略预设、GitHub Actions 自动化 | 仅脚本/报告，无 API/UI |
| [youmu178/MachineSelection](https://github.com/youmu178/MachineSelection) | 24 | Java / 无 | 交互 Demo | 仿网易机选红蓝玩法 | 机选交互动效 | 仅 Demo |
| [Havils/LotteryTrend](https://github.com/Havils/LotteryTrend) | 19 | Java / 无 | Android | 红蓝玩法/前后玩法走势图、缩放、蓝球连线 | 双玩法走势图、手势交互 | 原生 Android |
| [17881055/UnionLotto](https://github.com/17881055/UnionLotto) | 16 | JS / 无 | 桌面统计 | Electron+React+BizCharts+MongoDB 统计图表 | 统计图表组织 | 技术栈旧、依赖 Mongo |
| [hzhou81/Miracle_Lottery](https://github.com/hzhou81/Miracle_Lottery) | 13 | Python / 无 | 研究 | BiLSTM+CRF，红蓝玩法/前后玩法/七乐类玩法，概率输出、复式方案 | 多玩法、概率输出、Actions | 无优于随机证据 |
| [616390260/daletou-predictor](https://github.com/616390260/daletou-predictor) | 12 | Python / 无 | 全链路实验 | 9 模型（含随机基线）、SQLite、walk-forward、覆盖实验、Vue3+Pages、Actions | 基线对比、回测、覆盖、自动化、诚实文案 | 仅前后玩法；复杂度高；未优于随机 |

## 2. 重点项目的具体借鉴点

### 2.1 616390260/daletou-predictor

- 同时跑随机基线、频率、贝叶斯、马尔可夫、XGBoost、LSTM、Transformer、遗传、集成。
- 明确把「理论覆盖 / 历史模拟 / 开奖前发布」分开，避免事后诸葛。
- 有 SQLite + 导出 JSON + Vue3 前端 + GitHub Actions 的完整链路。
- README 明确记录：重训后在 60 期隔离验证中未优于均匀概率基线；项目目的是「戳破预测幻觉」。
- **借鉴**：基线对比、walk-forward、覆盖组合、数据管道、诚实结论展示。
- **不照搬**：9 模型全量训练成本高；前后玩法单玩法；无标准 API 契约。

### 2.2 snjyor/lucky_ball

- GitHub Actions 每日抓取并生成分析报告。
- 5 种推荐：高频主导、均衡分布、中频优先、冷热结合、超高频。
- 报告包含奇偶、和值、跨度等指标。
- **借鉴**：策略命名与用户可理解的解释；报告导出；每日自动化。
- **不足**：没有交互式选号与全玩法；无回测。

### 2.3 sinyu1012/Double-Color-Ball-AI

- 多模型结果并排展示，自动计算命中情况，支持暗色主题与移动端。
- **借鉴**：模型/策略对比视图、命中追踪、主题与响应式。
- **不足**：静态数据、预测未做严格验证。

### 2.4 Liang-yc/ssq / AaronJny/lotto

- 用 LSTM/CNN/RNN 做序列预测，并公开「预测红球 0–2 个、不建议据此购买」的结论。
- **借鉴**：负面结果同样要记录；回测与实验说明；不要把模型输出包装成「推荐」。
- **不足**：TensorFlow 1.x，难维护；无工程化。

### 2.5 走势图类（TheMelody/Havils/UnionLotto）

- 走势图、遗漏、缩放、连线是用户熟悉的分析视图。
- **借鉴**：历史开奖表 + 号码走势/遗漏可视化；移动端手势。
- **不足**：原生或旧技术栈；不覆盖推荐与玩法。

### 2.6 数据抓取类（BEWINDOWEB/lotterygrabber、lucky_ball、daletou-predictor）

- 按开奖日定时抓取；数据文件简单（CSV/JSON/SQLite）。
- **借鉴**：按开奖日调度、失败重试、数据校验、增量更新。
- **不足**：旧环境、无 schema 校验、无多源纠错。

## 3. 竞品能力矩阵

| 能力 | Liang-yc | sinyu | daletou-predictor | lucky_ball | Trend 类 | 本项目 FEAT-002 目标 |
|---|---|---|---|---|---|---|
| 红蓝玩法 | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| 前后玩法 | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| 全玩法（复式/胆拖/追加/倍数） | ❌ | 部分 | 部分 | ❌ | ❌ | ✅ |
| 官方数据自动更新 | 手工 | 静态 | ✅ | ✅ | 手工 | ✅ |
| 统计/冷热/遗漏 | 部分 | 部分 | ✅ | ✅ | ✅ | ✅ |
| 推荐策略 | ML | ML | 9 模型 | 5 策略 | ❌ | 6 策略 + 覆盖 |
| 回测 vs 随机基线 | 部分 | 命中统计 | ✅ | ❌ | ❌ | ✅ |
| 标准 API | ❌ | ❌ | 内部 | ❌ | ❌ | ✅ OpenAPI |
| 全玩法规则校验 | ❌ | ❌ | 部分 | ❌ | ❌ | ✅ |
| 免费在线部署 | ❌ | ✅ | ✅ | ❌ | ❌ | ✅（前后端） |
| 免责声明/合规 | 部分 | 部分 | ✅ | ✅ | ❌ | ✅ 强制 |

## 4. 结论

1. **没有人证明能提高中奖概率**；做得最好的项目（daletou-predictor）反而在强调这一点。本项目应把「可验证、可复盘、透明」作为差异化。
2. 现有项目普遍缺三块：**官方全玩法规则引擎**、**机器可读 API 契约**、**策略 vs 随机基线的标准化回测**。这三点是 FEAT-002 的核心价值。
3. 走势图/遗漏/多模型对比/推荐批次/报告导出是成熟的体验能力，适合放到 FEAT-003。
4. 数据管道建议采用「GitHub Actions 定时抓取官方接口 → 规范化 JSON → 后端加载」；比运行时抓取更稳定、可审计，也避免免费后端冷启动时依赖外部接口。

## 5. 输出到 FEAT-003 的候选需求

见 `docs/features/FEAT-003/backlog.md`，按优先级与依赖整理。
