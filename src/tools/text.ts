import { type ToolHandler } from "./types";

export const textTool: ToolHandler = {
  cursor: "text",

  onCanvasPointerDown: (ctx, point) => {
    // 处理添加文本框逻辑
    const id = ctx.editor.addText({
      spans: [
        {
          text: "点击编辑文本", // 默认文本
          style: {
            fontFamily: "Arial",
            fontSize: 20,
            color: "#000000",
            background: 'transparent'
          },
        },
      ],
      lineHeight: 1.5,
      align: "left",
      x: 0,
      y: 0,
      content: ""
    });

    // 设置文本框位置
    ctx.editor.transformElement(id, { x: point.x, y: point.y });

    // 选中并切回选择工具
    ctx.editor.setSelection([id]);
    ctx.setTool("select");
  },
};
