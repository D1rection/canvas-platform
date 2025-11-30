import type { ID } from "../canvas/schema/model";
import type { ToolHandler } from "./types";

/**
 * 选择工具
 *
 * - 点击元素：选中该元素
 * - 点击画布空白：清空选区（可选）
 */
export const selectTool: ToolHandler = {
  cursor: "default",
  onElementPointerDown: (ctx, id) => {
    ctx.editor.setSelection([id]);
  },

  onCanvasPointerDown: (ctx) => {
    // 点击空白区域时清空选区
    ctx.editor.resetSelection();
  },

  onCanvasPointerMove: (ctx, point, _ev) => {
    const state = ctx.editor.getState();
    const { document, selection } = state;
    const { rootElementIds, elements } = document;

    let hovered: ID | null = null;

    // 从上往下遍历
    for (let i = rootElementIds.length - 1; i >= 0; i--) {
      const id = rootElementIds[i];
      const element = elements[id];
      if (!element || !("size" in element)) continue;

      const shape = element;
      if (!shape.visible) continue;

      const { x, y } = shape.transform;
      const { width, height } = shape.size;

      if (
        point.x >= x &&
        point.x <= x + width &&
        point.y >= y &&
        point.y <= y + height
      ) {
        hovered = id;
        break;
      }
    }

    if (hovered !== (selection.hoveredId ?? null)) {
      ctx.editor.setHovered(hovered);
    }
  },

  onKeyDown: (ctx, ev) => {
    if((ev.ctrlKey || ev.metaKey) && ev.key === "c") {
      ev.preventDefault();
      ctx.editor.copySelection();
      ctx.message?.success('已复制元素');
      return;
    }
    if((ev.ctrlKey || ev.metaKey) && ev.key === "v") {
      ev.preventDefault();
      ctx.editor.paste();
      ctx.message?.success('已粘贴元素');
      return;
    }
  },

  onContextMenu: (ctx, ev) => {
    const state = ctx.editor.getState();
    const { selection } = state;

    // 当未选中任何元素时，右键可以直接粘贴剪贴板内容
    if (!selection.selectedIds.length && state.clipboard?.elements?.length) {

      // 获取鼠标在画布上的场景坐标
      const canvasElement = (ev.target as HTMLElement).closest('[class*="root"]') as HTMLElement;
      if (canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const mouseX = (ev.clientX - rect.left) / (state.viewport.scale || 1) + state.viewport.x;
        const mouseY = (ev.clientY - rect.top) / (state.viewport.scale || 1) + state.viewport.y;

        // 在鼠标位置粘贴元素
        ctx.editor.paste(undefined, { x: mouseX, y: mouseY });
        ctx.message?.success('已粘贴元素到鼠标位置');
      }
    }
  },
};
