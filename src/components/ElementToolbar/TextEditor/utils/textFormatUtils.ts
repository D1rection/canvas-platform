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

// 支持完整样式的中文字体列表（仅作为参考，实际使用中不依赖此列表）
export const CHINESE_FONTS_WITH_FULL_SUPPORT = [
  "PingFang SC",
  "Microsoft YaHei",
  "SimSun",
  "STSong",
];

// 确保斜体样式能正确应用于中文字体
// 直接返回原字体名称，让浏览器尝试应用斜体样式
// 浏览器会对不原生支持斜体的字体进行模拟处理
// 这样可以确保所有字体都能直接设置CSS斜体样式
export const ensureFontFamilySupport = (
  fontFamily: string
): string => {
  // 直接返回原字体名称，不进行任何回退处理
  // 让浏览器尝试应用斜体样式
  return fontFamily;
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
export const getCurrentTextStyle = (
  element: TextElement,
  spanIndex?: number
): TextStyle => {
  if (spanIndex !== undefined && element.spans[spanIndex]) {
    return element.spans[spanIndex].style;
  }
  // 如果没有指定span索引，返回第一个span的样式
  return (
    element.spans[0]?.style || {
      fontFamily: COMMON_FONTS[0],
      fontSize: DEFAULT_FONT_SIZE,
      color: "#000000",
    }
  );
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
export const toggleBold = (
  element: TextElement,
  spanIndex?: number
): Partial<TextElement> => {
  const currentStyle = getCurrentTextStyle(element, spanIndex);
  return updateTextStyle(element, { bold: !currentStyle.bold }, spanIndex);
};

/**
 * 切换文本的斜体样式
 * @param element 文本元素
 * @param spanIndex 可选的span索引
 * @returns 更新后的元素
 */
export const toggleItalic = (
  element: TextElement,
  spanIndex?: number
): Partial<TextElement> => {
  const currentStyle = getCurrentTextStyle(element, spanIndex);
  const newItalicState = !currentStyle.italic;
  const result = updateTextStyle(element, { italic: newItalicState }, spanIndex);
  
  return result;
};

/**
 * 切换文本的下划线样式
 * @param element 文本元素
 * @param spanIndex 可选的span索引
 * @returns 更新后的元素
 */
export const toggleUnderline = (
  element: TextElement,
  spanIndex?: number
): Partial<TextElement> => {
  const currentStyle = getCurrentTextStyle(element, spanIndex);
  const decorations = currentStyle.decorations || [];

  let newDecorations: Array<"underline" | "line-through" | "none">;
  if (decorations.includes("underline")) {
    newDecorations = decorations.filter(
      (deco) => deco !== "underline"
    ) as Array<"underline" | "line-through" | "none">;
  } else {
    newDecorations = [...decorations, "underline"] as Array<
      "underline" | "line-through" | "none"
    >;
  }

  return updateTextStyle(
    element,
    { decorations: newDecorations.length > 0 ? newDecorations : undefined },
    spanIndex
  );
};

/**
 * 切换文本的删除线样式
 * @param element 文本元素
 * @param spanIndex 可选的span索引
 * @returns 更新后的元素
 */
export const toggleStrikethrough = (
  element: TextElement,
  spanIndex?: number
): Partial<TextElement> => {
  const currentStyle = getCurrentTextStyle(element, spanIndex);
  const decorations = currentStyle.decorations || [];

  let newDecorations: Array<"underline" | "line-through" | "none">;
  if (decorations.includes("line-through")) {
    newDecorations = decorations.filter(
      (deco) => deco !== "line-through"
    ) as Array<"underline" | "line-through" | "none">;
  } else {
    newDecorations = [...decorations, "line-through"] as Array<
      "underline" | "line-through" | "none"
    >;
  }

  return updateTextStyle(
    element,
    { decorations: newDecorations.length > 0 ? newDecorations : undefined },
    spanIndex
  );
};