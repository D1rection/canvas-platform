import type { TextElement, TextStyle } from "../../../../canvas/schema/model";

// 常用字体列表
export const COMMON_FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "PingFang SC",
  "Microsoft YaHei",
  "SimSun",
  "STSong",
];

// 支持完整样式的中文字体列表（支持粗体和斜体）
export const CHINESE_FONTS_WITH_FULL_SUPPORT = [
  "PingFang SC",
  "Microsoft YaHei",
  "SimSun",
  "STSong",
];

// 字体样式支持信息映射表 - 只包含支持所有样式的字体
const FONT_STYLE_SUPPORT: {
  [key: string]: { bold: boolean; italic: boolean };
  "Arial": { bold: boolean; italic: boolean };
  "Helvetica": { bold: boolean; italic: boolean };
  "Times New Roman": { bold: boolean; italic: boolean };
  "PingFang SC": { bold: boolean; italic: boolean };
  "Microsoft YaHei": { bold: boolean; italic: boolean };
  "SimSun": { bold: boolean; italic: boolean };
  "STSong": { bold: boolean; italic: boolean };
} = {
  // 英文字体 - 支持所有样式
  "Arial": { bold: true, italic: true },
  "Helvetica": { bold: true, italic: true },
  "Times New Roman": { bold: true, italic: true },
  
  // 中文字体 - 支持所有样式
  "PingFang SC": { bold: true, italic: true },
  "Microsoft YaHei": { bold: true, italic: true },
  "SimSun": { bold: true, italic: true }, // 宋体支持粗体和斜体
  "STSong": { bold: true, italic: true }, // 华文中宋支持所有样式
};

// 字体回退映射表 - 当原字体不支持某个样式时，使用替代字体
// 主要用于英文字体，确保中文文本能正确显示所有样式
const FONT_FALLBACK_MAP: Record<string, string> = {
  // 英文字体回退到支持中文样式的中文字体
  "Arial": "PingFang SC",
  "Helvetica": "PingFang SC",
  "Times New Roman": "PingFang SC",
};

// 确保斜体样式能正确应用于中文字体
export const ensureFontFamilySupport = (fontFamily: string, style?: Partial<{ bold: boolean; italic: boolean }>): string => {
  if (!style) return fontFamily;
  
  // 检查字体是否在FONT_STYLE_SUPPORT中（支持所有样式）
  if (Object.prototype.hasOwnProperty.call(FONT_STYLE_SUPPORT, fontFamily)) {
    return fontFamily;
  }
  
  // 检查字体是否在FONT_FALLBACK_MAP中有回退字体
  if (Object.prototype.hasOwnProperty.call(FONT_FALLBACK_MAP, fontFamily)) {
    // 保留原英文字体，同时添加支持中文斜体的中文字体作为备选
    // 这样英文字符会使用原字体的样式，中文字符会使用支持样式的中文字体
    return `${fontFamily}, "${FONT_FALLBACK_MAP[fontFamily]}"`;
  }
  
  // 对于其他不支持所有样式的字体，返回支持所有样式的中文字体
  return `"${CHINESE_FONTS_WITH_FULL_SUPPORT[0]}", "${CHINESE_FONTS_WITH_FULL_SUPPORT[1]}"`;
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
  
  // 处理样式更新
  const processStyleUpdate = (span: any) => {
    // 合并现有样式和更新的样式
    const newStyle = {
      ...span.style,
      ...styleUpdates,
    };
    
    // 注意：这里不再直接修改fontFamily，而是保持原始字体名称
    // ensureFontFamilySupport应该在渲染时使用，而不是在存储样式时使用
    
    return newStyle;
  };
  
  if (spanIndex !== undefined) {
    // 更新特定的span样式
    if (spans[spanIndex]) {
      spans[spanIndex] = {
        ...spans[spanIndex],
        style: processStyleUpdate(spans[spanIndex]),
      };
    }
  } else {
    // 更新所有span的样式
    spans.forEach((span, index) => {
      spans[index] = {
        ...span,
        style: processStyleUpdate(span),
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

/**
 * 切换文本的删除线样式
 * @param element 文本元素
 * @param spanIndex 可选的span索引
 * @returns 更新后的元素
 */
export const toggleStrikethrough = (element: TextElement, spanIndex?: number): Partial<TextElement> => {
  const currentStyle = getCurrentTextStyle(element, spanIndex);
  const decorations = currentStyle.decorations || [];
  
  let newDecorations: Array<"underline" | "line-through" | "none">;
  if (decorations.includes("line-through")) {
    newDecorations = decorations.filter(deco => deco !== "line-through") as Array<"underline" | "line-through" | "none">;
  } else {
    newDecorations = [...decorations, "line-through"] as Array<"underline" | "line-through" | "none">;
  }
  
  return updateTextStyle(element, { decorations: newDecorations.length > 0 ? newDecorations : undefined }, spanIndex);
};