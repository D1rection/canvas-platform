import type { Point } from "../canvas/schema/model";
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
    ctx.editor.addShape({
      shape: "rect",
      position: point,
    });
  },

  onElementPointerDown: (ctx, _id, ev) => {
    if (!ev) return;

    // 将点击的 client 坐标转换为世界坐标
    const viewport = ctx.editor.getState().viewport;
    const target = ev.currentTarget as HTMLElement | null;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const screenX = ev.clientX - rect.left;
    const screenY = ev.clientY - rect.top;

    const point: Point = {
      x: viewport.x + screenX / viewport.scale,
      y: viewport.y + screenY / viewport.scale,
    };

    // 创建后切回选择工具
    ctx.setTool("select");
    ctx.editor.addShape({
      shape: "rect",
      position: point,
    });
  },
};

