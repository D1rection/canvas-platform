import type { ToolHandler } from "./types";

/**
 * 圆形工具
 *
 * - 点击画布：在该位置创建一个圆形
 * - 创建后自动切回选择工具
 */
export const circleTool: ToolHandler = {
  cursor: "crosshair",

  onCanvasPointerDown: (ctx, point) => {
    const id = ctx.editor.addShape({
      shape: "circle", // 👈 使用你的 ShapeKind 中定义的 'circle'
    });

    // 设置圆形的初始位置
    ctx.editor.transformElement(id, { x: point.x, y: point.y });

    // 创建后回到选择工具
    ctx.setTool("select");
  }
};
