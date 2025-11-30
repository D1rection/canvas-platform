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
};

