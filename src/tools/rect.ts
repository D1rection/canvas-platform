import type { ToolHandler } from "./types";

/**
 * 矩形工具
 *
 * - 点击画布：在该位置创建一个矩形
 * - 创建后自动切回选择工具
 */
export const rectTool: ToolHandler = {
  cursor: "crosshair",
  onCanvasPointerDown: (ctx, point) => {
    // 创建后切回选择工具
    ctx.setTool("select");
    const id = ctx.editor.addShape({
      shape: "rect",
    });
    ctx.editor.transformElement(id, { x: point.x, y: point.y });
  },
};

