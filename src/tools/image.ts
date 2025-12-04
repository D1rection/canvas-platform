import type { ToolHandler } from "./types";
// 移除未使用的导入

// 限制图片尺寸
function calculateLimitedSize(
  natural: { width: number; height: number },
  maxWidth = 400,
  maxHeight = 400
) {
  if (!natural || natural.width <= 0 || natural.height <= 0) {
    return { width: 0, height: 0 };
  }

  const widthRatio = maxWidth / natural.width;
  const heightRatio = maxHeight / natural.height;
  const ratio = Math.min(widthRatio, heightRatio, 1); // 不放大

  return {
    width: Math.round(natural.width * ratio),
    height: Math.round(natural.height * ratio),
  };
}


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

      const reader = new FileReader();
      reader.onload = async () => {
        const src = reader.result as string;

        // 为了获取图片的自然尺寸，创建一个Image对象
        const img = new Image();
        img.onload = () => {
          const naturalSize = { width: img.naturalWidth, height: img.naturalHeight };
        
        // 计算限制后的显示尺寸！
          const displaySize = calculateLimitedSize(naturalSize);

          // 调用 editor API 来添加图片
          const id = ctx.editor.addImage({
            src,
            naturalSize,
            size: displaySize, // 默认显示尺寸为限制尺寸
            filters: [],
          });

          // 将图片置于点击的坐标
          ctx.editor.transformElement(id, { x: point.x, y: point.y });

          // 选中并切回选择工具
          ctx.editor.setSelection([id]);

          // 切换工具为选择工具
          ctx.setTool("select");

          input.remove(); // 清理 input 元素
        };

        img.onerror = () => {
          input.remove();
          ctx.setTool("select");
        };

        img.src = src;
      };

      reader.onerror = () => {
        input.remove();
        ctx.setTool("select");
      };

      reader.readAsDataURL(file);
    };

    document.body.appendChild(input);
    input.click();
  },
};


