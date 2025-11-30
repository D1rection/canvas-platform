import type { ToolHandler } from "./types";

export const imageTool: ToolHandler = {
  cursor: "crosshair",

  onCanvasPointerDown: (ctx, point) => {
    // 创建不可见的 input[type=file] 来触发文件选择
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        input.remove();
        return;
      }

      // 读取为 dataURL
      const reader = new FileReader();
      reader.onload = async () => {
        const src = reader.result as string;

        // 为了获取图片的原始尺寸，创建 Image 对象
        const img = new Image();
        img.onload = () => {
          const naturalSize = { width: img.naturalWidth, height: img.naturalHeight };

          // 调用 editor API 添加图片
          const id = ctx.editor.addImage({
            src,
            naturalSize,
            size: naturalSize, // 默认显示尺寸为原始尺寸
            filters: [], // 可以选择添加滤镜
          });

          // 将图片放在用户点击的位置
          ctx.editor.transformElement(id, { x: point.x, y: point.y });

          // 选中图片并切换到选择工具
          ctx.editor.setSelection([id]);
          ctx.setTool("select");

          input.remove(); // 清理 input 元素
        };

        img.onerror = () => {
          input.remove();
          ctx.setTool("select");
        };

        img.src = src; // 触发图片加载
      };

      reader.onerror = () => {
        input.remove();
        ctx.setTool("select");
      };

      reader.readAsDataURL(file);
    };

    document.body.appendChild(input);
    input.click(); // 自动触发文件选择框
  },
};
