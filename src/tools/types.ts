import type { IEditorService } from "../canvas/schema/interfaces";
import type { ID, Point } from "../canvas/schema/model";
import type { ToolType } from "../components/toolbar/Toolbar";

/**
 * 工具处理器接口
 *
 * 每种工具实现该接口，定义其在各种交互事件下的行为。
 *
 * 说明：
 * - point 始终是「场景坐标」下的点击/移动位置
 * - ev 是原生 PointerEvent，可用于计算 clientX/clientY 等
 */
export interface ToolHandler {
  /** 点击画布空白区域 */
  onCanvasPointerDown?: (
    ctx: ToolContext,
    point: Point,
    ev: PointerEvent,
  ) => void;
  /** 在画布上移动（拖拽过程中） */
  onCanvasPointerMove?: (
    ctx: ToolContext,
    point: Point,
    ev: PointerEvent,
  ) => void;
  /** 在画布上松开 */
  onCanvasPointerUp?: (
    ctx: ToolContext,
    point: Point,
    ev: PointerEvent,
  ) => void;
  /** 点击元素 */
  onElementPointerDown?: (
    ctx: ToolContext,
    id: ID,
    ev: PointerEvent,
  ) => void;
  /** 点击选中框 */
  onSelectionBoxPointerDown?: (
    ctx: ToolContext,
    selectedIds: ID[],
    ev: PointerEvent,
  ) => void;
  /** 键盘事件 */
  onKeyDown?: (
    ctx: ToolContext,
    ev: KeyboardEvent,
  ) => void;
  /** 右键菜单 */
  onContextMenu?: (
    ctx: ToolContext,
    ev: MouseEvent,
  ) => void;
  /** 该工具对应的鼠标光标 */
  cursor: string;
}

/**
 * 工具上下文
 *
 * 传递给工具处理器的依赖，包括编辑服务和工具切换函数
 */
export interface ToolContext {
  editor: IEditorService;
  setTool: (tool: ToolType) => void;
  /**
   * 设置画布平移预览偏移量（单位：屏幕像素）
   * - 仅供 pan 工具使用
   * - 传 null 表示清除预览
   */
  setPanPreview?: (offset: { dx: number; dy: number } | null) => void;
  /**
   * 显示消息提示
   */
  message: {
    success: (content: string) => void;
    error: (content: string) => void;
    warning: (content: string) => void;
    info: (content: string) => void;
  };
  /**
   * 元素层 DOM 引用，用于拖拽预览等性能优化
   */
  elementsLayerRef?: { current: HTMLElement | null };
  /**
   * 覆盖层 DOM 引用，用于选中框操作
   */
  overlayLayerRef?: { current: HTMLElement | null };
}
