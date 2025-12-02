import type { ViewportState } from "../canvas/schema/model";
import type { ToolContext, ToolHandler } from "./types";

interface PanState {
  startClientX: number;
  startClientY: number;
  startViewport: ViewportState;
  pointerId: number; // 当前平移操作对应的指针 ID
}

let panState: PanState | null = null;

// 画布平移的全局事件监听器（用于鼠标拖出画布 / 浏览器的兜底）
let panGlobalListeners: {
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
} | null = null;

/**
 * 清理全局平移监听器
 */
function cleanupPanGlobalListeners() {
  if (panGlobalListeners) {
    document.removeEventListener("pointermove", panGlobalListeners.onPointerMove);
    document.removeEventListener("pointerup", panGlobalListeners.onPointerUp);
    document.removeEventListener("pointercancel", panGlobalListeners.onPointerUp);
    panGlobalListeners = null;
  }
}

/**
 * 设置画布平移的全局 pointer 事件监听器
 * - 解决拖动画布时鼠标移出浏览器无法触发 pointerup 的问题
 */
function setupPanGlobalListeners(ctx: ToolContext, _initialEv: PointerEvent) {
  // 如果已经有监听器，先清理
  cleanupPanGlobalListeners();

  const onPointerMove = (e: PointerEvent) => {
    // 只处理同一指针
    if (!panState || e.pointerId !== panState.pointerId) return;

    const { startClientX, startClientY } = panState;
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;

    // 更新画布平移预览
    ctx.setPanPreview?.({ dx, dy });
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!panState || e.pointerId !== panState.pointerId) {
      // 无效或已经结束的平移，直接清理监听器
      cleanupPanGlobalListeners();
      return;
    }

    const { startClientX, startClientY, startViewport } = panState;
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;

    const scale = startViewport.scale;
    const nextViewport: ViewportState = {
      ...startViewport,
      x: startViewport.x - dx / scale,
      y: startViewport.y - dy / scale,
    };

    ctx.editor.setViewport(nextViewport);

    ctx.setPanPreview?.(null);
    panState = null;

    cleanupPanGlobalListeners();
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);

  panGlobalListeners = {
    onPointerMove,
    onPointerUp,
  };
}

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
      pointerId: ev.pointerId,
    };

    // 设置全局监听器，避免拖出画布 / 浏览器后丢失事件
    setupPanGlobalListeners(ctx, ev);

    ev.preventDefault();
  },

  onCanvasPointerDown: (ctx: ToolContext, _point, ev) => {
    if (!ev || ev.button !== 0) return;

    const viewport = ctx.editor.getState().viewport;
    panState = {
      startClientX: ev.clientX,
      startClientY: ev.clientY,
      startViewport: { ...viewport },
      pointerId: ev.pointerId,
    };

    // 设置全局监听器，避免拖出画布 / 浏览器后丢失事件
    setupPanGlobalListeners(ctx, ev);

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
      cleanupPanGlobalListeners();
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
    cleanupPanGlobalListeners();
  },
};

