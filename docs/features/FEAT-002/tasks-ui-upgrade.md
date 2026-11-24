# UI 升级实施任务

依据：[UI 重构方案](ui-redesign.md) 与 `frontend/assets/design/number-workbench-design.png`。

用户已要求提交当前所有变动，再实施 UI 升级。基线提交为 `0a6780f`。最新约束：不打开浏览器、不运行测试；保留既有测试，不删除或弱化。只执行术语、lint、类型和构建等静态检查。

## 实施计划与允许范围

按以下小任务顺序推进，每项有效改动不超过 400 行，接近上限继续拆分并记录：

- UI-01：主题变量与基础控件。范围 `src/index.css`、`src/components/ui/{button,input,card}.tsx`；统一石墨黑与青绿主题。
- UI-02：基础状态和分段切换控件。范围 `src/components/ui/`；复用既有 Radix Slot，新增控件不安装依赖。
- UI-03：应用框架。范围 `src/App.tsx`、`src/components/workbench/`；顶部导航、玩法上下文、双栏工作台。
- UI-04：选号模式面板。范围 `src/features/picker/components/`；迁移现有 Ant Design UI 到本地 shadcn 组件，保留规则与回调。
- UI-05：号码与结果。范围同上；选中/胆拖状态、紧凑结果、复制保存和本地记录。
- UI-06：走势图基础。范围 `src/features/data/Charts.tsx` 与新增趋势组件；配置驱动号码范围、主附区和固定表头。
- UI-07：走势图交互。范围同上；期数/密度、行列定位、详情、文本替代与移动端内部滚动。
- UI-08：频率与遗漏。范围同上；号码刻度、期望线、详情和明细。
- UI-09：推荐与分析展示。范围 `src/features/recommend/RecommendPanel.tsx`、`src/features/stats/AiPanel.tsx`；仅迁移 UI，不改请求规则。
- UI-10：登录与邀请。范围 `src/features/auth/{LoginPage,InvitePanel}.tsx`；保持邀请制与真实 API，统一视觉。
- UI-11：入口与文档收尾。范围 `src/main.tsx`、本特性进度文档；移除不再使用的 Ant Design Provider，依赖暂保留。

## 验收边界

- 页面、控件统一使用本地 shadcn 基础设施；不新增依赖或改 CI/构建配置。
- 保留真实 API、邀请制、手动条件与业务计算，不顺带修改后端。
- 所有状态明确：加载、空结果、错误、复制与保存反馈。
- 主页面桌面双栏、移动单列；图表内部可滚动。
- 不因 UI 更换删除或弱化既有测试断言。未运行测试与视觉验收应如实记录。
