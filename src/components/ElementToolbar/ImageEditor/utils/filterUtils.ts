// ImageEditor/utils/filterUtils.ts
import type { CanvasElement, ImageElement, ImageFilter } from "../../../../canvas/schema/model";

/**
 * 检查是否为图片元素
 */
export const isImageElement = (element: CanvasElement): element is ImageElement => {
  return element.type === "image";
};

// 性能优化：滤镜类型映射
const FILTER_TYPE_MAP: {[key: string]: string} = {
  'brightness': 'brightness',
  'grayscale': 'grayscale',
  'blur': 'blur',
  'opacity': 'opacity'
};

// 性能优化：获取图片滤镜值（添加缓存）
const filterValueCache = new WeakMap<CanvasElement, Map<string, number>>();

/**
 * 获取图片滤镜值
 */
export const getImageFilter = (
  element: CanvasElement,
  filterType: string,
  defaultValue: number
): number => {
  // 快速检查
  if (!isImageElement(element) || !element.filters) return defaultValue;
  
  // 检查缓存
  if (filterValueCache.has(element)) {
    const elementCache = filterValueCache.get(element)!;
    if (elementCache.has(filterType)) {
      return elementCache.get(filterType)!;
    }
  }
  
  // 查找滤镜值
  const filter = element.filters.find(f => f.type === filterType);
  const value = filter ? filter.value : defaultValue;
  
  // 更新缓存
  if (!filterValueCache.has(element)) {
    filterValueCache.set(element, new Map());
  }
  filterValueCache.get(element)!.set(filterType, value);
  
  return value;
};

// 内部函数：设置单个滤镜
function setSingleFilter(element: ImageElement, filterType: string, value: number): ImageFilter[] {
  // 创建新的filters数组以触发正确的重新渲染
  const newFilters = [...element.filters];
  const filterIndex = newFilters.findIndex(f => f.type === filterType);
  
  if (filterIndex !== -1) {
    // 更新现有滤镜
    newFilters[filterIndex] = { ...newFilters[filterIndex], value };
  } else {
    // 添加新滤镜
    newFilters.push({
      id: `${filterType}-${Date.now()}`,
      type: filterType as any,
      value
    });
  }
  
  return newFilters;
}

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

  // 清除缓存
  if (filterValueCache.has(element)) {
    filterValueCache.delete(element);
  }

  // 找到现有滤镜或创建新的
  const updatedFilters = setSingleFilter(element, filterType, value);

  return {
    filters: updatedFilters
  };
};

// 性能优化：批量更新滤镜，减少多次单独操作
export const setImageFilters = (
  element: CanvasElement,
  updates: Array<{type: string; value: number}> | {[key: string]: number}
): Partial<CanvasElement> => {
  if (!isImageElement(element)) {
    return {};
  }
  
  // 清除缓存
  if (filterValueCache.has(element)) {
    filterValueCache.delete(element);
  }
  
  // 复制现有滤镜
  const updatedFilters = [...element.filters];
  
  // 处理数组格式
  if (Array.isArray(updates)) {
    updates.forEach(update => {
      const filterIndex = updatedFilters.findIndex(f => f.type === update.type);
      
      if (filterIndex !== -1) {
        updatedFilters[filterIndex] = { ...updatedFilters[filterIndex], value: update.value };
      } else {
        updatedFilters.push({
          id: `${update.type}-${Date.now()}`,
          type: update.type as any,
          value: update.value
        });
      }
    });
  } 
  // 处理对象格式
  else {
    Object.entries(updates).forEach(([type, value]) => {
      const filterIndex = updatedFilters.findIndex(f => f.type === type);
      
      if (filterIndex !== -1) {
        updatedFilters[filterIndex] = { ...updatedFilters[filterIndex], value };
      } else {
        updatedFilters.push({
          id: `${type}-${Date.now()}`,
          type: type as any,
          value
        });
      }
    });
  }
  
  return {
    filters: updatedFilters
  };
};

// 性能优化：CSS滤镜字符串生成器（带有缓存）
const filterStringCache = new Map<string, string>();

// 性能优化：生成缓存键
function generateCacheKey(filters: ImageFilter[]): string {
  // 按类型排序确保相同滤镜组合生成相同的键，无论顺序如何
  return filters
    .sort((a, b) => a.type.localeCompare(b.type))
    .map(filter => `${filter.type}:${filter.value}`)
    .join('|');
}

/**
 * 生成CSS滤镜样式字符串
 */
export const generateCSSFilterString = (filters: ImageFilter[]): string => {
  // 快速路径：空滤镜数组
  if (!filters || filters.length === 0) {
    return '';
  }
  
  // 生成缓存键
  const cacheKey = generateCacheKey(filters);
  
  // 检查缓存
  if (filterStringCache.has(cacheKey)) {
    return filterStringCache.get(cacheKey)!;
  }
  
  // 生成滤镜字符串
  const filterComponents: string[] = [];
  
  filters.forEach(filter => {
    const cssFilterType = FILTER_TYPE_MAP[filter.type];
    if (!cssFilterType) return;
    
    switch (filter.type) {
      case 'brightness':
      case 'grayscale':
      case 'opacity' as any:
        filterComponents.push(`${cssFilterType}(${filter.value * 100}%)`);
        break;
      case 'blur':
        filterComponents.push(`${cssFilterType}(${filter.value}px)`);
        break;
      default:
        break;
    }
  });
  
  const filterString = filterComponents.join(" ");
  
  // 缓存结果
  filterStringCache.set(cacheKey, filterString);
  
  // 限制缓存大小
  if (filterStringCache.size > 100) {
    // 删除最早添加的缓存项
    const firstKey = filterStringCache.keys().next().value;
    if (firstKey) {
      filterStringCache.delete(firstKey);
    }
  }
  
  return filterString;
};

// 性能优化：导出批量处理API，减少重复渲染
export const applyFilterBatch = (
  element: CanvasElement,
  updates: {[key: string]: number}
): Partial<CanvasElement> => {
  if (!isImageElement(element)) {
    return {};
  }
  
  // 先清除缓存
  if (filterValueCache.has(element)) {
    filterValueCache.delete(element);
  }
  
  // 创建一个临时的filters数组进行批量更新
  const currentFilters = element.filters || [];
  const updatedFilters = [...currentFilters];
  
  // 应用所有更新
  Object.entries(updates).forEach(([type, value]) => {
    const filterIndex = updatedFilters.findIndex(f => f.type === type);
    
    if (filterIndex !== -1) {
      updatedFilters[filterIndex] = { ...updatedFilters[filterIndex], value };
    } else {
      updatedFilters.push({
        id: `${type}-${Date.now()}`,
        type: type as any,
        value
      });
    }
  });
  
  return {
    filters: updatedFilters
  };
};