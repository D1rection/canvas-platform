import type { ToolHandler } from "./types";

/**
 * 拖动工具（平移画布）
 *
 * - 按下并拖动：平移视口
 * - 后续可在这里实现拖拽逻辑
 */
export const panTool: ToolHandler = {
  cursor: "grab",

  // TODO: 实现拖拽平移视口
  // onCanvasPointerDown / onCanvasPointerMove / onCanvasPointerUp
};

