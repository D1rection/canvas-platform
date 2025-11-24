## 项目简介

本项目是一个基于 **React + TypeScript + Vite** 的「画布类编辑器」实验项目，目标是实现一个类似 Figma / Canva 的简化版 MVP：

- 支持无限画布（平移 / 缩放）
- 支持基础图形（矩形 / 圆角矩形 / 圆形 / 三角形）
- 支持图片元素与简单滤镜
- 支持富文本（展示 + 编辑）
- 支持元素选中、拖拽移动、缩放、删除
- 支持本地持久化（刷新后恢复）

核心原则：**业务逻辑自己实现，不依赖 react-flow / konva / tldraw 等高级图库**，只允许使用 Pixi 这类基础渲染库。

---

## 目录结构与分层

与画布相关的代码都放在 `src/canvas` 下，按照「定义层 → 服务层 → 编辑层 → 渲染层 → 视图层」分层：

```text
src/
  ├── canvas/
  │   ├── schema/              # 定义层：数据结构 & 接口
  │   │   ├── model.ts         # Canvas 文档 & 元素 & 视口 & 选区等核心模型
  │   │   └── interfaces.ts    # IIDService / IStorageService / IEditorService / IRendererService 等接口
  │   ├── services/            # 服务层：纯功能服务（ID、存储、历史等）
  │   │   ├── id-service.ts    # ID 生成服务
  │   │   └── storage-service.ts# 持久化服务（MVP 可先 localStorage，将来换 IndexedDB）
  │   ├── editor/              # 编辑层：画布状态管理与业务逻辑
  │   │   └── editor.ts        # IEditorService 的闭包实现（维护 CanvasRuntimeState）
  │   ├── renderer/            # 渲染层：基于 Pixi / Canvas 的渲染实现
  │   │   └── pixi-renderer.ts # IRendererService 的实现骨架（事件转译 + 渲染）
  │   └── di/                  # IOC 容器：组装上述各层
  │       └── container.ts     # createCanvasContainer，用于页面初始化
  │
  ├── components/
  │   └── canvas/
  │       ├── CanvasView.tsx   # 视图层：挂载 renderer，连接 editor 事件
  │       └── Toolbar.tsx      # 工具栏：调用 editor 接口（增删改、缩放等）
  ├── pages/
  │   └── CanvasPage.tsx       # 页面级：使用 container，提供上下文
  ├── styles/
  │   └── globals.css
  ├── App.tsx
  └── main.tsx
```

### 定义层（`schema/`）

- `model.ts`
  - 定义所有核心数据结构：
    - `CanvasDocument`：画布文档（草稿）
    - `CanvasElement`：元素联合类型（`ShapeElement` / `ImageElement` / `TextElement` / `GroupElement`）
    - `ViewportState`：视口（场景坐标中的相机位置与缩放）
    - `SelectionState`：选区与文本选区
    - `CanvasRuntimeState`：运行时状态（文档 + 视口 + 选区）
    - `CanvasPersistedState`：持久化状态（文档 + 可选视口）
- `interfaces.ts`
  - 定义各层协作接口：
    - `IIDService`：ID 生成服务
    - `IStorageService`：持久化读写
    - `IEditorService`：画布编辑服务（视口 / 元素 / 选区等）
    - `RendererEventMap`：渲染层向外派发的交互事件
    - `IRendererService`：渲染服务接口

> 约定：**所有存入文档的几何信息（位置 / 宽高 / 变换）统一使用「场景坐标系」**，视口只是「场景上的窗口」；DOM / 屏幕坐标只在渲染/视图层短暂出现，不写入模型。

### 服务层（`services/`）

- `id-service.ts`
  - 函数式创建：`createIDService(prefix?: string): IIDService`
  - 实现可以基于时间戳 + 递增计数器，或替换为 UUID / 后端 ID。
- `storage-service.ts`
  - 函数式创建：`createStorageService(): IStorageService`
  - 负责 `loadState / saveState`，对接本地存储（MVP 可用 localStorage，将来可换 IndexedDB）。

服务层只依赖 `schema/`，不关心 React / Pixi 等具体技术。

### 编辑层（`editor/`）

- `editor.ts`
  - 函数式创建：`createEditorService(deps: EditorDependencies): IEditorService`
  - 内部用闭包维护一个可变的 `CanvasRuntimeState`，对外暴露：
    - 视口相关：`getState / subscribe / setViewport / moveViewport / resetViewport / zoomAt`
    - 元素相关：`addShape / updateElement / transformElement / deleteElement`
    - 选区相关：`setSelection / moveSelection / resetSelection / deleteSelection`
  - 在 `setState` 时同步调用 `storageService.saveState` 实现「自动保存」。

编辑层是所有业务规则的核心：**只操作模型，不直接触碰 DOM / Pixi**。

### 渲染层（`renderer/`）

- `pixi-renderer.ts`
  - 函数式创建：`createPixiRenderer(): IRendererService`
  - 负责：
    - `mount(container)` / `unmount()`：初始化 / 销毁 Pixi 实例
    - `render(state)`：根据 `CanvasRuntimeState` 绘制所有元素
    - `emit / on / off`：事件派发与订阅（`RendererEventMap`）
    - `resize(size)`：同步容器尺寸变化

推荐实践：

- 使用 Pixi v8 的事件系统（参考官方文档 [Events / Interaction](https://pixijs.com/8.x/guides/components/events)），将 `pointertap / globalpointermove / wheel` 等事件转成：
  - `elementClicked` / `elementDoubleClick`
  - `canvasClick`
  - `elementTransform`
  - `viewportPan` / `viewportZoom`
- 保证抛给上层的 `Point` 已经是「场景坐标」。

### IOC 容器（`di/`）

- `container.ts`
  - 入口：`createCanvasContainer(docID: ID)`
  - 负责：
    - 创建 `idService` / `storageService` / `editorService` / `rendererService`
    - 尝试用 `storageService.loadState(docID)` 恢复草稿
    - 返回一个 `CanvasContainer`，供页面层使用

---

## 开发与运行

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 启动开发环境

```bash
npm run dev
# 或
pnpm dev
```

访问 `http://localhost:5173`。

### 构建与预览

```bash
npm run build
npm run preview
```

---

## 协作规范

### 代码风格

- 一律使用 **TypeScript**。
- 公共类型、服务接口必须写 **JSDoc**（参考 `model.ts` / `interfaces.ts`）。
- 禁止在 React 组件中直接修改 `CanvasDocument`，一律通过 `IEditorService`。

### 依赖方向

- `schema/**`：不依赖本地其他模块。
- `services/**`：只依赖 `schema/**`。
- `editor/**`：依赖 `schema/**` 与 `services/**`，**不得依赖 React / Pixi**。
- `renderer/**`：依赖 `schema/**` 与 Pixi，**不得依赖 React**。
- React 组件只通过接口使用 `editorService` / `rendererService`，不直接操作文档。

