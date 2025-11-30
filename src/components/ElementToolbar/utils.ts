// utils.ts

// 从模型文件导入正确的类型 (假设路径正确)
import type {
  CanvasElement,
  ShapeElement,
  TextElement,
  ImageElement,
  // ID,
  // Point,
  // Size,
  // Transform,
  // ViewportState,
} from "../../canvas/schema/model";

// 预设颜色选项 (来自原始代码)
export const COLOR_PRESETS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F8C471",
  "#82E0AA",
  "#F1948A",
  "#85C1E9",
  "#D7BDE2",
  "#000000",
  "#333333",
  "#666666",
  "#999999",
  "#FFFFFF",
];

// --- Type Guards 类型守卫 ---

const isShapeElement = (element: CanvasElement): element is ShapeElement => {
  return element.type === "shape";
};

export const isTextElement = (
  element: CanvasElement
): element is TextElement => {
  return element.type === "text";
};

/**
 * 类型守卫：判断是否为图片或形状元素（可调整尺寸）
 * **[修复：添加 export]**
 */
export const isSizableElement = (
  element: CanvasElement
): element is ShapeElement | ImageElement => {
  return element.type === "shape" || element.type === "image";
};

// --- Color Helpers 颜色辅助函数 ---

/**
 * 获取元素的颜色值
 */
export const getElementColor = (element: CanvasElement): string => {
  if (isShapeElement(element)) {
    return element.style.fill || "#000000";
  }

  if (isTextElement(element) && element.spans.length > 0) {
    return element.spans[0]?.style.color || "#000000";
  }

  return "#000000";
};

/**
 * 设置元素的颜色值
 */
export const setElementColor = (
  element: CanvasElement,
  color: string
): Partial<CanvasElement> => {
  if (isShapeElement(element)) {
    return {
      style: {
        ...element.style,
        fill: color,
      },
    };
  }

  if (isTextElement(element)) {
    return {
      spans: element.spans.map((span) => ({
        ...span,
        style: {
          ...span.style,
          color,
        },
      })),
    };
  }

  return {};
};

// --- Size Helpers 尺寸辅助函数 ---

/**
 * 获取元素的尺寸信息
 * @returns 包含宽度和高度的对象
 */
export const getElementSize = (
  element: CanvasElement
): { width: number; height: number } => {
  if (isSizableElement(element) && element.size) {
    return {
      width: element.size.width || 0,
      height: element.size.height || 0,
    };
  }

  if (isTextElement(element) && element.spans.length > 0) {
    // 文本元素返回字体大小作为高度，宽度为0 (仅用于显示)
    const fontSize = element.spans[0]?.style.fontSize || 16;
    return { width: 0, height: fontSize };
  }

  return { width: 0, height: 0 };
};

/**
 * 设置元素的精确尺寸信息
 * @param element 画布元素
 * @param width 宽度
 * @param height 高度
 * @returns 包含尺寸更新的对象
 */
export const setElementDimensions = (
  element: CanvasElement,
  newWidth: number,
  newHeight: number
): Partial<CanvasElement> => {
  // 最小尺寸限制
  const minSize = 1;

  if (isSizableElement(element) && element.size) {
    // 形状/图片元素
    return {
      size: {
        width: Math.max(minSize, newWidth),
        height: Math.max(minSize, newHeight),
      },
    };
  } else if (isTextElement(element) && element.spans.length > 0) {
    // 文本元素：尺寸调整为字体大小
    // 文本元素使用 height 作为 fontSize 的输入
    const clampedSize = Math.max(minSize, newHeight);

    return {
      spans: element.spans.map((span) => ({
        ...span,
        style: { ...span.style, fontSize: clampedSize },
      })),
    };
  }

  return {};
};

/**
 * 设置元素的尺寸信息 (用于滑块)
 * @param element 画布元素
 * @param sliderValue 滑块值 (1-500)
 * @returns 包含尺寸更新的对象
 */
export const setElementSizeFromSlider = (
  element: CanvasElement,
  sliderValue: number
): Partial<CanvasElement> => {
  const clampedSize = Math.max(1, sliderValue);
  const minSize = 1;

  if (isTextElement(element) && element.spans.length > 0) {
    // 文本元素：滑块值直接对应字体大小
    return {
      spans: element.spans.map((span) => ({
        ...span,
        style: { ...span.style, fontSize: clampedSize },
      })),
    };
  } else if (isSizableElement(element) && element.size) {
    // 形状/图片元素：保持宽高比
    const { width: currentWidth, height: currentHeight } = element.size;

    // 如果是第一次设置尺寸（宽度或高度为0），则默认设置为滑块值
    if (currentWidth === 0 || currentHeight === 0) {
      return {
        size: {
          width: clampedSize,
          height: clampedSize,
        },
      };
    }

    // 使用当前尺寸计算宽高比
    const aspectRatio = currentWidth / currentHeight;

    // 假设滑块值对应于新宽度
    const newWidth = clampedSize;
    const newHeight = newWidth / aspectRatio; // 使用新宽度和旧比例计算新高度

    return {
      size: {
        width: Math.max(minSize, newWidth),
        height: Math.max(minSize, newHeight),
      },
    };
  }

  return {};
};

/**
 * 获取元素尺寸滑块的值
 */
export const getElementSizeSliderValue = (element: CanvasElement): number => {
  if (isTextElement(element) && element.spans.length > 0) {
    return element.spans[0]?.style.fontSize || 16;
  }
  if (isSizableElement(element) && element.size) {
    // 形状/图片元素返回宽度作为滑块的统一尺寸度量
    return Math.round(element.size.width);
  }
  return 50;
};

// --- Opacity Helpers 透明度辅助函数 ---

/**
 * 获取元素的透明度
 */
export const getElementOpacity = (element: CanvasElement): number => {
  return element.opacity ?? 1;
};

/**
 * 设置元素的透明度
 */
export const setElementOpacity = (
  _element: CanvasElement,
  opacity: number
): Partial<CanvasElement> => {
  return { opacity: Math.max(0, Math.min(1, opacity)) };
};

// --- Border Color Helpers 边框颜色辅助函数 ---

/**
 * 获取元素的边框颜色
 */
export const getElementBorderColor = (element: CanvasElement): string => {
  if (isShapeElement(element)) {
    return element.style.strokeColor || "#000000";
  }
  return "#000000";
};

/**
 * 设置元素的边框颜色
 */
export const setElementBorderColor = (
  element: CanvasElement,
  color: string
): Partial<CanvasElement> => {
  if (isShapeElement(element)) {
    return {
      style: {
        ...element.style,
        strokeColor: color,
      },
    };
  }
  return {};
};

// --- Border Width Helpers 边框宽度辅助函数 ---

/**
 * 获取元素的边框宽度
 */
export const getElementBorderWidth = (element: CanvasElement): number => {
  if (isShapeElement(element)) {
    return element.style.strokeWidth || 0;
  }
  return 0;
};

/**
 * 设置元素的边框宽度
 */
export const setElementBorderWidth = (
  element: CanvasElement,
  width: number
): Partial<CanvasElement> => {
  if (isShapeElement(element)) {
    // 限制边框宽度范围 1-20 像素
    const validWidth = Math.max(1, Math.min(20, width));
    return {
      style: {
        ...element.style,
        strokeWidth: validWidth,
      },
    };
  }
  return {};
};

// --- Corner Radius Helpers 圆角辅助函数 ---

/**
 * 获取矩形元素的圆角半径
 */
export const getElementCornerRadius = (element: CanvasElement): number => {
  if (
    isShapeElement(element) &&
    (element.shape === "rect" || element.shape === "roundRect")
  ) {
    return element.style.cornerRadius || 0;
  }
  return 0;
};

/**
 * 设置矩形元素的圆角半径
 */
export const setElementCornerRadius = (
  element: CanvasElement,
  radius: number
): Partial<CanvasElement> => {
  if (
    isShapeElement(element) &&
    (element.shape === "rect" || element.shape === "roundRect")
  ) {
    // 限制圆角半径范围 0-50 像素
    const validRadius = Math.max(0, Math.min(50, radius));
    return {
      style: {
        ...element.style,
        cornerRadius: validRadius,
      },
      // 如果是矩形，设置为圆角矩形
      shape: element.shape === "rect" ? "roundRect" : element.shape,
    };
  }
  return {};
};
