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
    // TODO: 后续添加圆形工具

    ctx.setTool("select");
  },
};

