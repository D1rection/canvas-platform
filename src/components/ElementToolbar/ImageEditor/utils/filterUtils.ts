// ImageEditor/utils/filterUtils.ts
import type { CanvasElement, ImageElement, ImageFilter } from "../../../../canvas/schema/model";

/**
 * 检查是否为图片元素
 */
export const isImageElement = (element: CanvasElement): element is ImageElement => {
  return element.type === "image";
};

/**
 * 获取图片滤镜值
 */
export const getImageFilter = (
  element: CanvasElement,
  filterType: string,
  defaultValue: number
): number => {
  if (isImageElement(element) && element.filters) {
    const filter = element.filters.find(f => f.type === filterType);
    return filter ? filter.value : defaultValue;
  }
  return defaultValue;
};

/**
 * 设置图片滤镜值
 */
export const setImageFilter = (
  element: CanvasElement,
  filterType: string,
  value: number
): Partial<CanvasElement> => {
  if (!isImageElement(element)) {
    return {};
  }

  // 找到现有滤镜或创建新的
  const existingFilterIndex = element.filters.findIndex(f => f.type === filterType);
  const updatedFilters = [...element.filters];

  if (existingFilterIndex >= 0) {
    updatedFilters[existingFilterIndex] = {
      ...updatedFilters[existingFilterIndex],
      value
    };
  } else {
    updatedFilters.push({
      id: `${filterType}-${Date.now()}`,
      type: filterType as any, // 简化处理，实际应用中应该做类型检查
      value
    });
  }

  return {
    filters: updatedFilters
  };
};

/**
 * 生成CSS滤镜样式字符串
 */
export const generateCSSFilterString = (filters: ImageFilter[]): string => {
  const filterComponents: string[] = [];

  filters.forEach(filter => {
    switch (filter.type) {
      case 'brightness':
        filterComponents.push(`brightness(${filter.value * 100}%)`);
        break;
      case 'grayscale':
        filterComponents.push(`grayscale(${filter.value * 100}%)`);
        break;
      case 'blur':
        filterComponents.push(`blur(${filter.value}px)`);
        break;
      default:
        break;
    }
  });

  return filterComponents.join(" ");
};