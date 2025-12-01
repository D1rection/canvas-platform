/**
 * 唯一标识符
 *
 * - 在整个文档中全局唯一
 * - 用于关联父子元素、引用根元素等
 * - 允许使用 `uuid`、雪花 ID 或时间戳等字符串形式生成，具体取决于services接口的实现
 */
export type ID = string;

/**
 * 二维平面上的点坐标
 *
 * - 所有坐标默认采用场景坐标系
 * - 场景坐标与视口无关，不随缩放和平移变化
 * - `x` 向右为正，`y` 向下为正
 */
export interface Point {
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
}

/**
 * 尺寸信息
 *
 * - 一般用于元素在画布场景中的宽高
 * - 单位与场景坐标一致，通常为逻辑像素（非真实屏幕像素）
 * - 一个场景单位在 scale = 1 时等于 1 px
 */
export interface Size {
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
}

/**
 * 元素在场景坐标系下的变换信息
 *
 * - 不直接包含尺寸，尺寸统一由 `Size` 描述
 * - 变换中心（旋转、缩放中心）后续可根据需要扩展
 */
export interface Transform {
  /**
   * 元素左上角在场景坐标系中的 X 坐标
   *
   * - 不随视口平移/缩放改变
   */
  x: number;
  /**
   * 元素左上角在场景坐标系中的 Y 坐标
   *
   * - 不随视口平移/缩放改变
   */
  y: number;
  /** 水平缩放比例，1 为原始大小，< 0 可以考虑表示镜像 */
  scaleX: number;
  /** 垂直缩放比例，1 为原始大小，< 0 可以考虑表示镜像 */
  scaleY: number;
  /**
   * 旋转角度
   *
   * - 中心点旋转
   * - 单位为度（deg）
   * - 顺时针为正
   */
  rotation: number;
}

/**
 * 画布视口状态
 *
 * - 描述「用户当前看到的区域」在无限画布场景中的位置与缩放
 * - 自身的 `x/y` 仍处于场景坐标系，用来表示视口相机在场景中的位置（左上角）
 * - 与鼠标事件中的屏幕/DOM 坐标（clientX/clientY）不同，这里不存任何屏幕坐标
 */
export interface ViewportState {
  /**
   * 视口在场景坐标系中的 X 偏移
   *
   * - 可以理解为「相机」左上角的位置
   */
  x: number;
  /**
   * 视口在场景坐标系中的 Y 偏移
   *
   * - 可以理解为「相机」左上角的位置
   */
  y: number;
  /**
   * 视口缩放比例
   *
   * - 1 为原始大小
   * - > 1 放大，< 1 缩小
   */
  scale: number;
}

/**
 * 画布元素的大类类型
 *
 * - `shape`：纯形状元素（矩形、圆形、三角形等）
 * - `text`：富文本元素
 * - `image`：位图图片元素
 * - `group`：组元素，用于多个元素的逻辑组合
 */
export type ElementType = "shape" | "text" | "image" | "group";

/**
 * 形状细分类型
 *
 * - `rect`：直角矩形
 * - `roundRect`：圆角矩形
 * - `circle`：圆形
 * - `triangle`：三角形
 */
export type ShapeKind = "rect" | "roundRect" | "circle" | "triangle";

/**
 * 图片滤镜类型
 *
 * - `grayscale`：灰度
 * - `brightness`：亮度
 * - `blur`：模糊
 */
export type ImageFilterType = "grayscale" | "brightness" | "blur";

/**
 * 单个图片滤镜配置
 */
export interface ImageFilter {
  /** 滤镜种类 */
  type: ImageFilterType;
  /**
   * 滤镜强度数值
   *
   * - 具体数值区间由渲染层约定，例如
   *   - `grayscale`：0 ~ 1
   *   - `brightness`：0 ~ 2
   *   - `blur`：0 ~ 20
   */
  value: number;
}

/**
 * 文本装饰效果
 *
 * - `underline`：下划线
 * - `lineThrough`：删除线
 */
export type TextDecoration = "underline" | "lineThrough";

/**
 * 形状样式定义
 *
 * 用于控制基础几何图形的视觉表现。
 */
export interface ShapeStyle {
  /** 填充颜色（背景色），如 `#ffffff` 或 `rgba(...)` */
  fill: string;
  /** 描边颜色 */
  strokeColor: string;
  /** 描边宽度，单位与坐标系一致 */
  strokeWidth: number;
  /**
   * 圆角半径
   *
   * - 对 [rect](file://f:\canvas-platform\src\tools\select.ts#L56-L56) 和 `triangle` 也生效
   * - 为 0 时表示不使用圆角
   */
  cornerRadius?: number;
}

/**
 * 文本样式定义
 *
 * - 可被整个文本元素使用，也可在 `TextSpan` 中做局部覆盖
 */
export interface TextStyle {
  /** 字体族名称，如 `Arial`、`PingFang SC` 等 */
  fontFamily: string;
  /** 字号，单位通常为像素（px） */
  fontSize: number;
  /** 文本颜色 */
  color: string;
  /** 文本背景色，可选 */
  background?: string;
  /** 是否加粗 */
  bold?: boolean;
  /** 是否斜体 */
  italic?: boolean;
  /** 文本装饰（下划线、删除线） */
  decorations?: TextDecoration;
}

/**
 * 所有画布元素的公共基础字段
 *
 * - 具体类型（形状、文本、图片、组）在各自子类型中扩展
 */
export interface ElementBase {
  /** 元素唯一 ID */
  id: ID;
  /** 元素类型（形状 / 文本 / 图片 / 组） */
  type: ElementType;
  /** 可选的人类可读名称，用于图层面板等场景 */
  name?: string;
  /** 元素在画布中的变换信息（位置 / 缩放 / 旋转） */
  transform: Transform;
  /** 是否可见，`false` 时不参与渲染与交互 */
  visible: boolean;
  /** 是否锁定，锁定后禁止被选中或编辑 */
  locked: boolean;
  /**
   * 父元素 ID
   *
   * - 对于被组包含的元素，`parentId` 指向 `GroupElement` 的 `id`
   * - 根元素没有父级时为 `undefined` 或 `null`
   */
  parentId?: ID | null;
  /**
   * 层级顺序
   *
   * - 数值越大，越靠上
   * - 在同一父级下用于排序
   */
  zIndex: number;
  /**
   * 元素透明度
   *
   * - 0 为完全透明
   * - 1 为完全不透明
   * - 默认为 1
   */
  opacity: number;
}

/**
 * 形状元素
 *
 * - 用于描述矩形、圆形、三角形等基础几何图形
 */
export interface ShapeElement extends ElementBase {
  /** 固定为 `shape`，用于类型收窄 */
  type: "shape";
  /** 形状种类，如矩形、圆形等 */
  shape: ShapeKind;
  /** 形状的视觉样式 */
  style: ShapeStyle;
  /** 形状尺寸（逻辑宽高） */
  size: Size;
}

/**
 * 图片元素
 *
 * - 支持 PNG / JPEG 等常见位图格式
 * - 支持简单滤镜效果（灰度、亮度、模糊等）
 */
export interface ImageElement extends ElementBase {
  /** 固定为 `image` */
  type: "image";
  /** 图片资源地址（URL 或本地路径） */
  src: string;
  /** 图片原始尺寸（未缩放前的宽高） */
  naturalSize: Size;
  /** 图片在画布中的显示尺寸 */
  size: Size;
  /** 应用在图片上的滤镜列表，按顺序叠加 */
  filters: ImageFilter[];
}

/**
 * 文本元素
 *
 * - 支持富文本（通过 `TextSpan` 划分不同样式片段）
 * - 支持段落级别的对齐方式与行高设置
 */
export interface TextElement extends ElementBase {
  /** 固定为 `text` */
  type: "text";
  /**
   * 文本片段数组
   *
   * - 每个 `TextSpan` 代表一段连续文本及其样式
   * - 不同 `span` 可拥有不同的样式（如局部加粗、变色等）
   */
  spans: TextSpan[];
  /**
   * 段落对齐方式
   *
   * - `left`：左对齐
   * - `center`：居中对齐
   * - `right`：右对齐
   */
  align: "left" | "center" | "right";
  /**
   * 行高
   *
   * - 可以是绝对像素值或相对于 `fontSize` 的倍数，具体由渲染层约定
   */
  lineHeight: number;
}

/**
 * 文本片段
 *
 * - 相当于富文本中的一个「Run」
 * - 每个片段可以拥有独立的 `TextStyle`
 */
export interface TextSpan {
  /** 文本内容 */
  text: string;
  /** 文本样式 */
  style: TextStyle;
}

/**
 * 组元素
 *
 * - 用于将多个元素打组，统一进行移动、缩放、旋转等操作
 * - 支持嵌套组（组的子元素中可以继续包含 `GroupElement`）
 */
export interface GroupElement extends ElementBase {
  /** 固定为 `group` */
  type: "group";
  /**
   * 子元素 ID 列表
   *
   * - 仅存储直接子元素
   * - 子元素的 `parentId` 应指向当前组的 `id`
   */
  childrenIds: ID[];
}

/**
 * 画布中所有可能出现的元素联合类型
 *
 * - 在运行时可通过 `element.type` 进行类型收窄
 */
export type CanvasElement =
  | ShapeElement
  | TextElement
  | ImageElement
  | GroupElement;

/**
 * 画布文档（草稿）数据结构
 *
 * - 描述一份完整的画布状态（不包含运行时 UI 状态）
 * - 可直接用于持久化存储（如 LocalStorage / IndexedDB / 服务端）
 */
export interface CanvasDocument {
  /** 文档唯一 ID */
  id: ID;
  /** 可选的文档标题（用于列表展示、历史记录等） */
  title?: string;
  /**
   * 以 ID 为 key 的元素字典
   *
   * - 存储画布中所有元素（包括被分组的子元素）
   * - 通过 `elements[id]` 即可快速访问某个元素
   */
  elements: Record<ID, CanvasElement>;
  /**
   * 根元素 ID 列表
   *
   * - 指定画布上顶层的元素顺序
   * - 其顺序通常与图层面板从下到上的顺序一致
   */
  rootElementIds: ID[];
  /** 文档创建时间（时间戳，毫秒） */
  createdAt: number;
  /** 文档最近一次更新时间（时间戳，毫秒） */
  updatedAt: number;
}

/**
 * 选区状态
 *
 * - 描述当前用户在画布上的选择与悬停信息
 * - 不属于持久化文档，而是运行时 UI 状态的一部分
 */
export interface SelectionState {
  /**
   * 当前选中的元素 ID 列表
   *
   * - 支持多选
   * - 顺序可以用于后续扩展（如主选中元素）
   */
  selectedIds: ID[];
  /**
   * 当前鼠标悬停的元素 ID（如果有）
   *
   * - 主要用于 hover 高亮等交互
   */
  hoveredId?: ID;
  /**
   * 文本编辑时的活动选区
   *
   * - 仅在编辑文本元素时存在
   * - 描述的是某个 `TextElement` 中某个 `TextSpan` 的光标/选区信息
   */
  activeTextRange?: {
    /** 目标文本元素 ID */
    elementId: ID;
    /** 目标 `TextSpan` 在 `spans` 数组中的下标 */
    spanIndex: number;
    /** 文本选区起始偏移（以字符为单位） */
    startOffset: number;
    /** 文本选区结束偏移（以字符为单位，左闭右开） */
    endOffset: number;
  } | null;
}

/**
 * 辅助线
 */
/* export interface GuideLine {
  id: ID;
  orientation: 'vertical' | 'horizontal';
  position: number;     
  type: 'snap' | 'custom';
} */

/**
 * 辅助线状态
 */
/* export interface GuidesState {
  activeGuides: GuideLine[];
} */

/**
 * 画布运行时状态
 *
 * - 组合了持久化的文档数据与非持久化的 UI 状态
 * - 一般作为画布编辑器的全局状态源（例如 Zustand 等）
 */
export interface CanvasRuntimeState {
  /** 当前编辑的文档（可持久化） */
  document: CanvasDocument;
  /** 当前视口状态（缩放、平移等） */
  viewport: ViewportState;
  /** 当前选区与文本编辑状态 */
  selection: SelectionState;
  // guides: GuidesState;

  /** 剪贴板状态 */
  clipboard: {
    elements: CanvasElement[];
    copiedAt: number; // 时间戳
  } | null;
}

/**
 * 画布持久化状态
 *
 * - 用于保存到本地存储（IndexedDB）
 * - 与 `CanvasRuntimeState` 的区别在于：只包含需要「跨会话保留」的字段
 * - 通常只需要持久化文档数据，视口是否持久化可以按services接口的实现决定
 */
export interface CanvasPersistedState {
  /**
   * 画布文档数据
   *
   * - 必须字段，描述画布中的所有元素及其结构
   * - 刷新页面或重新打开时，从这里恢复画布内容
   */
  document: CanvasDocument;
  /**
   * 可选的视口状态
   *
   * - 如果存在，则在恢复时同步恢复缩放与平移位置
   * - 如果省略，则使用默认视口（例如自动缩放到适配全部内容）
   */
  viewport?: ViewportState;
}
