import type { ToolHandler } from "./types";

/**
 * 文本工具
 *
 * - 点击画布：在该位置创建文本框（后续实现）
 * - 创建后自动切回选择工具
 */
export const textTool: ToolHandler = {
  cursor: "crosshair",

  onCanvasPointerDown: (ctx) => {
    // TODO: 实现文本框创建逻辑
    ctx.setTool("select");
  },
};

