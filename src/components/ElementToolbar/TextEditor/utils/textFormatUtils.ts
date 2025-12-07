import type { TextElement, TextStyle } from "../../../../canvas/schema/model";

// 常用字体列表
export const COMMON_FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "PingFang SC",
  "Microsoft YaHei",
  "SimSun",
  "SimHei",
  "KaiTi",
  "FangSong",
  "STSong",
  "STKaiti",
];

// 字体样式支持信息映射表
const FONT_STYLE_SUPPORT = {
  // 英文字体 - 通常支持所有样式
  "Arial": { bold: true, italic: true },
  "Helvetica": { bold: true, italic: true },
  "Times New Roman": { bold: true, italic: true },
  
  // 中文字体 - 部分支持所有样式，部分只支持部分样式
  "PingFang SC": { bold: true, italic: true },
  "Microsoft YaHei": { bold: true, italic: true },
  "SimSun": { bold: true, italic: true }, // 宋体通常支持粗体和斜体
  "SimHei": { bold: true, italic: false }, // 黑体只支持粗体，不支持斜体
  "KaiTi": { bold: false, italic: true }, // 楷体只支持斜体，不支持粗体
  "FangSong": { bold: false, italic: false }, // 仿宋不支持粗体和斜体
  "STSong": { bold: true, italic: true }, // 华文中宋支持所有样式
  "STKaiti": { bold: true, italic: false }, // 华文楷体只支持粗体，不支持斜体
};

// 字体回退映射表 - 当原字体不支持某个样式时，使用替代字体
const FONT_FALLBACK_MAP: Record<string, string> = {
  "SimHei": "PingFang SC", // 黑体回退到苹方
  "KaiTi": "PingFang SC", // 楷体回退到苹方
  "FangSong": "PingFang SC", // 仿宋回退到苹方
  "STKaiti": "PingFang SC", // 华文楷体回退到苹方
};

// 确保斜体样式能正确应用于中文字体
export const ensureFontFamilySupport = (fontFamily: string, style?: Partial<{ bold: boolean; italic: boolean }>): string => {
  if (!style) return fontFamily;
  
  const fontSupport = FONT_STYLE_SUPPORT[fontFamily as keyof typeof FONT_STYLE_SUPPORT];
  
  // 如果字体支持所有请求的样式，直接返回
  if (fontSupport && 
      (!style.bold || fontSupport.bold) && 
      (!style.italic || fontSupport.italic)) {
    return fontFamily;
  }
  
  // 如果字体不支持某个样式，使用替代字体
  return FONT_FALLBACK_MAP[fontFamily] || fontFamily;
};

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