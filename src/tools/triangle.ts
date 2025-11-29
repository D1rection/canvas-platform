import type { ToolHandler } from "./types";
/**
 * 三角形工具
 *
 * - 点击画布：在该位置创建一个三角形
 * - 创建后自动切回选择工具
 */
export const triangleTool: ToolHandler = {
  cursor: "crosshair",

  onCanvasPointerDown: (ctx, point) => {
    const id = ctx.editor.addShape({
      shape: "triangle",
    });

    ctx.editor.transformElement(id, { x: point.x, y: point.y });

    ctx.setTool("select");
  },
};
