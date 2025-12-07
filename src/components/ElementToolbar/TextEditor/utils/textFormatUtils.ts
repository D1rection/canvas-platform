import type { TextElement, TextStyle } from "../../../../canvas/schema/model";

// 常用字体列表
export const COMMON_FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Courier New",
  "Impact",
  "Comic Sans MS",
  "PingFang SC",
  "Microsoft YaHei",
];

// 默认字体大小
export const DEFAULT_FONT_SIZE = 20;

// 字体大小范围
export const FONT_SIZE_RANGE = {
  min: 8,
  max: 72,
};

/**
 * 获取文本元素的当前样式
 * @param element 文本元素
 * @param spanIndex 可选的span索引，用于获取特定span的样式
 * @returns 当前样式对象
 */
export const getCurrentTextStyle = (element: TextElement, spanIndex?: number): TextStyle => {
  if (spanIndex !== undefined && element.spans[spanIndex]) {
    return element.spans[spanIndex].style;
  }
  // 如果没有指定span索引，返回第一个span的样式
  return element.spans[0]?.style || {
    fontFamily: COMMON_FONTS[0],
    fontSize: DEFAULT_FONT_SIZE,
    color: "#000000",
  };
};

/**
 * 更新文本元素的样式
 * @param element 文本元素
 * @param styleUpdates 样式更新对象
 * @param spanIndex 可选的span索引，用于更新特定span的样式
 * @returns 更新后的元素
 */
export const updateTextStyle = (
  element: TextElement,
  styleUpdates: Partial<TextStyle>,
  spanIndex?: number
): Partial<TextElement> => {
  const spans = [...element.spans];
  
  if (spanIndex !== undefined) {
    // 更新特定的span样式
    if (spans[spanIndex]) {
      spans[spanIndex] = {
        ...spans[spanIndex],
        style: {
          ...spans[spanIndex].style,
          ...styleUpdates,
        },
      };
    }
  } else {
    // 更新所有span的样式
    spans.forEach((span, index) => {
      spans[index] = {
        ...span,
        style: {
          ...span.style,
          ...styleUpdates,
        },
      };
    });
  }
  
  return { spans };
};

/**
 * 切换文本的粗体样式
 * @param element 文本元素
 * @param spanIndex 可选的span索引
 * @returns 更新后的元素
 */
export const toggleBold = (element: TextElement, spanIndex?: number): Partial<TextElement> => {
  const currentStyle = getCurrentTextStyle(element, spanIndex);
  return updateTextStyle(element, { bold: !currentStyle.bold }, spanIndex);
};

/**
 * 切换文本的斜体样式
 * @param element 文本元素
 * @param spanIndex 可选的span索引
 * @returns 更新后的元素
 */
export const toggleItalic = (element: TextElement, spanIndex?: number): Partial<TextElement> => {
  const currentStyle = getCurrentTextStyle(element, spanIndex);
  return updateTextStyle(element, { italic: !currentStyle.italic }, spanIndex);
};

/**
 * 切换文本的下划线样式
 * @param element 文本元素
 * @param spanIndex 可选的span索引
 * @returns 更新后的元素
 */
export const toggleUnderline = (element: TextElement, spanIndex?: number): Partial<TextElement> => {
  const currentStyle = getCurrentTextStyle(element, spanIndex);
  const decorations = currentStyle.decorations || [];
  
  let newDecorations: Array<"underline" | "line-through" | "none">;
  if (decorations.includes("underline")) {
    newDecorations = decorations.filter(deco => deco !== "underline") as Array<"underline" | "line-through" | "none">;
  } else {
    newDecorations = [...decorations, "underline"] as Array<"underline" | "line-through" | "none">;
  }
  
  return updateTextStyle(element, { decorations: newDecorations.length > 0 ? newDecorations : undefined }, spanIndex);
};