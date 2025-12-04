import type {
  CanvasElement,
  CanvasPersistedState,
  CanvasRuntimeState,
  ID,
  ImageFilter,
  Point,
  ShapeKind,
  ShapeStyle,
  Size,
  TextSpan,
  TextStyle,
  Transform,
  ViewportState,
} from "./model";

/**
 * ID 生成服务
 *
 * 用于在创建新草稿文档 / 元素时生成唯一标识符。
 */
export interface IIDService {
  /**
   * 生成下一个可用的唯一 ID。
   *
   * @returns 新生成的 ID 字符串
   */
  generateNextID: () => ID;
}

/**
 * 画布持久化存储服务
 *
 * 负责将画布草稿文档及视口状态读写到IndexedDB。
 */
export interface IStorageService {
  /**
   * 读取指定草稿文档的持久化数据。
   *
   * @param docID 文档 ID
   * @returns 若存在则返回文档数据，否则返回 null
   */
  loadState(docID: ID): Promise<CanvasPersistedState | null>;

  /**
   * 保存指定草稿文档的持久化数据。
   *
   * @param docID 文档 ID
   * @param state 需要持久化的画布状态（文档 + 可选视口）
   */
  saveState(docID: ID, state: CanvasPersistedState): Promise<void>;
}

/**
 * 历史记录服务
 *
 * 管理 undo/redo 历史栈，与编辑层解耦。
 * 使用泛型设计，可用于任何状态类型。
 */
export interface IHistoryService<T> {
  /**
   * 记录一个快照到历史栈。
   *
   * @param snapshot 状态快照
   */
  push(snapshot: T): void;

  /**
   * 撤销，返回上一个快照。
   *
   * @param current 当前状态（用于 push 到 redo 栈）
   * @returns 上一个快照，如果没有则返回 null
   */
  undo(current: T): T | null;

  /**
   * 重做，返回下一个快照。
   *
   * @param current 当前状态（用于 push 到 undo 栈）
   * @returns 下一个快照，如果没有则返回 null
   */
  redo(current: T): T | null;

  /**
   * 是否可以撤销。
   */
  canUndo(): boolean;

  /**
   * 是否可以重做。
   */
  canRedo(): boolean;

  /**
   * 清空所有历史记录。
   */
  clear(): void;
}

/**
 * 画布编辑服务
 *
 * 统一管理 `CanvasRuntimeState`，对外暴露修改视口、元素、选区等编辑能力。
 */
export interface IEditorService {
  /**
   * 获取当前完整的运行时状态快照。
   *
   * @returns 当前的 `CanvasRuntimeState`
   */
  getState: () => CanvasRuntimeState;

  /**
   * 订阅状态变更。
   *
   * @param listener 状态变更回调
   * @returns 取消订阅函数
   */
  subscribe(listener: (state: CanvasRuntimeState) => void): () => void;

  /**
   * 设置当前视口状态。
   *
   * @param viewport 场景坐标系下的视口位置与缩放
   */
  setViewport(viewport: ViewportState): void;

  /**
   * 移动视口。
   *
   * @param delta 场景坐标系下的位移增量
   */
  moveViewport(delta: Point): void;

  /**
   * 将视口重置为默认状态。
   */
  resetViewport: () => void;

  /**
   * 以某个场景坐标点为中心进行缩放。
   *
   * @param point 场景坐标系中的缩放中心点
   * @param scaleFactor 缩放因子，>1 放大，<1 缩小
   */
  zoomAt(point: Point, scaleFactor: number): void;

  /**
   * 新增一个图形元素。
   *
   * @param payload 形状类型、样式、初始尺寸和可选初始位置等配置
   * @returns 新建元素的 ID
   */
  addShape(payload: {
    /** 图形类型（矩形 / 圆角矩形 / 圆形 / 三角形） */
    shape: ShapeKind;
    /** 可选的图形样式覆盖字段，未提供的使用默认值 */
    style?: Partial<ShapeStyle>;
    /** 可选的初始尺寸，未提供时由实现层决定默认大小 */
    size?: Size;
    /**
     * 可选的初始位置（场景坐标，表示图形左上角）
     * - 若未提供，则默认放置在当前视口中心附近
     */
    position?: Point;
  }): ID;

  /**
   * 更新单个元素的通用字段。
   *
   * @param id 目标元素 ID
   * @param patch 需要更新的字段集合（仅部分字段）
   */
  updateElement(id: ID, patch: Partial<CanvasElement>): void;

  /**
   * 更新单个元素的变换信息（位置、缩放、旋转等）。
   *
   * @param id 目标元素 ID
   * @param patch 需要更新的变换字段
   */
  transformElement(id: ID, patch: Partial<Transform>): void;

  /**
   * 删除单个元素。
   *
   * @param id 目标元素 ID
   */
  deleteElement(id: ID): void;

  /**
   * 设置当前选中的元素列表。
   *
   * @param ids 选中元素 ID 列表
   */
  setSelection(ids: ID[]): void;

  /**
   * 按场景坐标位移当前选中元素。
   *
   * @param delta 场景坐标系下的位移增量
   */
  moveSelection(delta: Point): void;

  /**
   * 清空当前选区。
   */
  resetSelection: () => void;

  /**
   * 删除当前选区中的所有元素。
   */
  deleteSelection: () => void;

  // ─────────────────────────────────────────────────────────────
  // 图片相关
  // ─────────────────────────────────────────────────────────────

  /**
   * 新增一个图片元素。
   *
   * @param payload 图片资源地址、原始尺寸、显示尺寸等配置
   * @returns 新建元素的 ID
   */
  addImage(payload: {
    /** 图片资源地址（URL / Base64 / Blob URL） */
    src: string;
    /** 图片原始尺寸（用于保持宽高比等场景） */
    naturalSize: Size;
    /** 可选的显示尺寸，未提供时使用 naturalSize */
    size?: Size;
    /** 可选的初始滤镜列表 */
    filters?: ImageFilter[];
  }): ID;

  /**
   * 更新图片元素的滤镜列表。
   *
   * @param id 目标图片元素 ID
   * @param filters 新的滤镜列表
   */
  updateImageFilters(id: ID, filters: ImageFilter[]): void;

  // ─────────────────────────────────────────────────────────────
  // 文本相关
  // ─────────────────────────────────────────────────────────────

  /**
   * 新增一个文本元素。
   *
   * @param payload 文本内容、样式等配置
   * @returns 新建元素的 ID
   */
  addText(payload: {
    x: number;
    y: number;
    lineHeight: number;
    spans: { text: string; style: { fontFamily: string; fontSize: number; color: string; background: string; }; }[];
    /** 初始文本内容 */
    content: string;
    /** 可选的文本样式覆盖字段 */
    style?: Partial<TextStyle>;
    /** 可选的对齐方式，默认 'left' */
    align?: 'left' | 'center' | 'right';
  }): ID;

  /**
   * 更新文本元素的内容（富文本片段）。
   *
   * @param id 目标文本元素 ID
   * @param spans 新的文本片段数组
   */
  updateTextContent(id: ID, spans: TextSpan[]): void;

  // ─────────────────────────────────────────────────────────────
  // 元素缩放
  // ─────────────────────────────────────────────────────────────

  /**
   * 缩放单个元素的尺寸。
   *
   * @param id 目标元素 ID
   * @param newSize 新的尺寸
   * @param anchor 缩放锚点（哪个角固定不动），默认 'nw'（左上角）
   */
  resizeElement(id: ID, newSize: Size, anchor?: 'nw' | 'ne' | 'sw' | 'se'): void;

  /**
   * 缩放当前选中的所有元素。
   *
   * @param factor 缩放因子，>1 放大，<1 缩小
   * @param anchor 缩放锚点
   */
  resizeSelection(factor: number, anchor?: 'nw' | 'ne' | 'sw' | 'se'): void;

  // ─────────────────────────────────────────────────────────────
  // 复制粘贴
  // ─────────────────────────────────────────────────────────────

  /**
   * 复制当前选中的元素到内部剪贴板。
   */
  copySelection(): void;

  /**
   * 粘贴剪贴板中的元素到画布。
   *
   * @param offset 可选的位置偏移（场景坐标），未提供时自动偏移一定距离
   * @param pointerPosition 鼠标位置（屏幕坐标）
   * @returns 新粘贴的元素 ID 列表
   */
  paste(offset?: Point, pointerPosition?: Point): ID[];

  // ─────────────────────────────────────────────────────────────
  // 悬停状态
  // ─────────────────────────────────────────────────────────────

  /**
   * 设置当前悬停的元素。
   *
   * @param id 悬停元素 ID，传 null 清除悬停状态
   */
  setHovered(id: ID | null): void;

  // ─────────────────────────────────────────────────────────────
  // 持久化
  // ─────────────────────────────────────────────────────────────

  /**
   * 检查是否存在持久化数据。
   *
   * @returns 是否存在可恢复的数据
   */
  hasPersistedState(): Promise<boolean>;

  /**
   * 从持久化存储加载状态并应用到当前编辑器。
   *
   * @returns 是否成功加载
   */
  loadPersistedState(): Promise<boolean>;

  /**
   * 清空持久化存储并重置为空画布。
   */
  clearPersistedState(): Promise<void>;

  // ─────────────────────────────────────────────────────────────
  // 撤销/重做
  // ─────────────────────────────────────────────────────────────

  /**
   * 撤销上一步操作。
   *
   * @returns 是否成功撤销
   */
  undo(): boolean;

  /**
   * 重做上一步撤销的操作。
   *
   * @returns 是否成功重做
   */
  redo(): boolean;

  /**
   * 是否可以撤销。
   */
  canUndo(): boolean;

  /**
   * 是否可以重做。
   */
  canRedo(): boolean;

  // ─────────────────────────────────────────────────────────────
  // 框选相关
  // ─────────────────────────────────────────────────────────────

  /**
   * 开始框选操作。
   *
   * @param startPoint 框选的起始点（场景坐标）
   */
  startMarqueeSelection(startPoint: Point): void;

  /**
   * 更新框选操作。
   *
   * @param currentPoint 框选的当前点（场景坐标）
   */
  updateMarqueeSelection(currentPoint: Point): void;

  /**
   * 完成框选操作，并根据框选范围选中相交的元素。
   *
   * @param endPoint 框选的结束点（场景坐标）
   * @returns 选中的元素ID数组
   */
  finishMarqueeSelection(endPoint: Point): ID[];

  /**
   * 取消框选操作。
   */
  cancelMarqueeSelection(): void;
}
