# Canvas Platform

基于 React + TypeScript + Vite 的画布编辑器，目标是实现类似 Figma / Canva 的简化版 MVP。

核心原则：业务逻辑自行实现，不依赖 react-flow / konva / tldraw 等高级图库。

## 功能

- 无限画布（平移 / 缩放）
- 基础图形（矩形 / 圆形 / 三角形）
- 元素选中、拖拽、删除
- 本地持久化（IndexedDB）
- 工具策略模式

## 项目结构

```
src/
├── canvas/
│   ├── schema/          # 数据模型与接口定义
│   ├── services/        # ID 生成、持久化等服务
│   ├── editor/          # 状态管理与业务逻辑
│   ├── renderer/        # DOM 渲染组件
│   │   ├── elements/    # 元素渲染（RectShape 等）
│   │   ├── overlay/     # 覆盖层（SelectionBox 等）
│   │   └── index.ts     # 统一导出
│   └── di/              # IOC 容器
├── components/
│   ├── canvas/          # CanvasView（渲染 + 事件上抛）
│   └── toolbar/         # 工具栏
├── tools/               # 工具策略（select / pan / rect 等）
├── types/               # 全局类型声明
├── styles/              # 全局样式
├── App.tsx              # 应用入口
└── main.tsx             # React 挂载点
```

## 架构

**分层**：定义层 → 服务层 → 编辑层 → 渲染层 → 视图层

**依赖方向**：`schema ← services ← editor ← renderer ← components ← App`

- `schema`：不依赖其他模块
- `services`：只依赖 schema
- `editor`：依赖 schema + services，不依赖 React
- `renderer`：依赖 schema + React，不调用 editor
  - `elements/`：元素渲染组件，每种元素类型一个文件
  - `overlay/`：覆盖层组件，选中框、辅助线等交互反馈
- `tools`：依赖 schema + editor 接口
- `components / App`：组装所有层

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build
```

## 新增元素类型

1. 在 `schema/model.ts` 中定义元素类型
2. 在 `renderer/elements/` 下创建渲染组件
3. 在 `renderer/elements/index.ts` 中导出
4. 在 `components/canvas/CanvasView.tsx` 中注册渲染
5. 在 `tools/` 下创建工具处理器
6. 在 `tools/index.ts` 中注册到 `toolRegistry`
7. 在 `components/toolbar/Toolbar.tsx` 中添加按钮

## 新增覆盖层效果

1. 在 `renderer/overlay/` 下创建组件
2. 在 `renderer/overlay/index.ts` 中导出
3. 在 `components/canvas/CanvasView.tsx` 的 `overlayLayer` 中使用

## 规范

- 使用 TypeScript，公共接口写 JSDoc
- 禁止在组件中直接修改 CanvasDocument，通过 editorService 操作
- 渲染组件只做渲染，业务逻辑放在工具层或编辑层
- 场景坐标存入模型，DOM 坐标仅在渲染时计算

## License

MIT
