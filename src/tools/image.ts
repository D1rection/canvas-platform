import type { ToolHandler } from "./types";

/**
 * 图片工具
 *
 * - 点击画布：在该位置插入图片（后续实现）
 * - 创建后自动切回选择工具
 */
export const imageTool: ToolHandler = {
  cursor: "crosshair",

  onCanvasPointerDown: (ctx) => {
    // TODO: 实现图片插入逻辑（打开文件选择器等）
    ctx.setTool("select");
  },
};

