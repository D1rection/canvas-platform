import type {
  CanvasElement,
  CanvasPersistedState,
  CanvasRuntimeState,
  ID,
  Point,
  ShapeKind,
  ShapeStyle,
  Size,
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
   * @param payload 形状类型、样式和初始尺寸等配置
   * @returns 新建元素的 ID
   */
  addShape(payload: {
    /** 图形类型（矩形 / 圆角矩形 / 圆形 / 三角形） */
    shape: ShapeKind;
    /** 可选的图形样式覆盖字段，未提供的使用默认值 */
    style?: Partial<ShapeStyle>;
    /** 可选的初始尺寸，未提供时由实现层决定默认大小 */
    size?: Size;
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
}