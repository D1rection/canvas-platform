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
};

