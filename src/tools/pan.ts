import type { ViewportState } from "../canvas/schema/model";
import type { ToolContext, ToolHandler } from "./types";

interface PanState {
  startClientX: number;
  startClientY: number;
  startViewport: ViewportState;
}

let panState: PanState | null = null;

/**
 * 拖动工具（平移画布）
 *
 * - 按下：记录起始 client 坐标和视口
 * - 移动：根据 (clientX/clientY) 与起点的差值更新预览偏移量
 * - 松开：提交最终视口，清空预览与拖拽状态
 */
export const panTool: ToolHandler = {
  cursor: "grab",

  onElementPointerDown: (ctx: ToolContext, _id, ev) => {
    if (!ev || ev.button !== 0) return;

    const viewport = ctx.editor.getState().viewport;
    panState = {
      startClientX: ev.clientX,
      startClientY: ev.clientY,
      startViewport: { ...viewport },
    };

    ev.preventDefault();
  },

  onCanvasPointerDown: (ctx: ToolContext, _point, ev) => {
    if (!ev || ev.button !== 0) return;

    const viewport = ctx.editor.getState().viewport;
    panState = {
      startClientX: ev.clientX,
      startClientY: ev.clientY,
      startViewport: { ...viewport },
    };

    ev.preventDefault();
  },

  onCanvasPointerMove: (ctx: ToolContext, _point, ev) => {
    if (!panState || !ev) return;
    // 仅在左键按下时生效
    if ((ev.buttons & 1) === 0) return;

    const { startClientX, startClientY } = panState;
    const dx = ev.clientX - startClientX;
    const dy = ev.clientY - startClientY;

    // 更新画布平移预览
    ctx.setPanPreview?.({ dx, dy });
  },

  onCanvasPointerUp: (ctx: ToolContext, _point, ev) => {
    if (!panState || !ev) {
      panState = null;
      ctx.setPanPreview?.(null);
      return;
    }

    const { startClientX, startClientY, startViewport } = panState;
    const dx = ev.clientX - startClientX;
    const dy = ev.clientY - startClientY;

    const scale = startViewport.scale;
    const nextViewport: ViewportState = {
      ...startViewport,
      x: startViewport.x - dx / scale,
      y: startViewport.y - dy / scale,
    };

    ctx.editor.setViewport(nextViewport);

    ctx.setPanPreview?.(null);
    panState = null;
  },
};

