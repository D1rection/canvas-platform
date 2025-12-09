import type { Point } from "../canvas/schema/model";
import type { ToolHandler } from "./types";

/**
 * 文本工具
 *
 * - 点击画布：在该位置创建一个文本框，并立即进入编辑状态
 * - 点击元素：同样在点击位置创建文本框，并立即进入编辑状态
 * - 创建后自动切回选择工具
 *
 * 创建逻辑与矩形/圆形/三角形等图形保持一致：
 * - 位置使用场景坐标 point
 * - 默认样式与占位文本由 editor.addText 内部统一管理
 */
export const textTool: ToolHandler = {
  cursor: "text",

  // 在画布空白处点击创建文本
  onCanvasPointerDown: (ctx, point) => {
    ctx.editor.addText({
      x: point.x,
      y: point.y,
      lineHeight: 1.5,
      content: "",
      // 不传 spans/style/align/size，走 addText 内部的统一默认逻辑
    });

    

    // 切回选择工具
    ctx.setTool("select");
  },

  // 在元素上点击时，也支持在对应位置创建文本
  onElementPointerDown: (ctx, _id, ev) => {
    if (!ev) return;

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

    ctx.editor.addText({
      x: point.x,
      y: point.y,
      lineHeight: 1.5,
      content: "",
    });

    ctx.setTool("select");
  },
};
