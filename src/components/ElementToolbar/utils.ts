// utils.ts

// 从模型文件导入正确的类型 (假设路径正确)
import type {
  CanvasElement,
  ShapeElement,
  TextElement,
  // ImageElement,
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
