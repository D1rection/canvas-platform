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
}

