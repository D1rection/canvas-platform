import { useState, useEffect } from 'react';
import type { ImageFilter, ImageFilterType } from '../../../../canvas/schema/model';

interface UseImageFiltersProps {
  initialFilters?: ImageFilter[];
  onFiltersChange?: (filters: ImageFilter[]) => void;
}

// 生成唯一ID的辅助函数
const generateId = (type: ImageFilterType): string => {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 图像滤镜处理 Hook
 * 提供获取、设置和管理图像滤镜的功能
 */
export const useImageFilters = ({
  initialFilters = [],
  onFiltersChange,
}: UseImageFiltersProps) => {
  const [filters, setFilters] = useState<ImageFilter[]>(initialFilters);

  // 当初始滤镜变化时更新状态
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // 获取特定类型滤镜的值
  const getFilterValue = (type: ImageFilterType): number => {
    const filter = filters.find(f => f.type === type);
    return filter ? filter.value : 0;
  };

  // 设置特定类型滤镜的值
  const setFilterValue = (type: ImageFilterType, value: number): void => {
    // 确保值在有效范围内（-100 到 100）
    const normalizedValue = Math.max(-100, Math.min(100, value));
    
    setFilters(prevFilters => {
      const existingFilterIndex = prevFilters.findIndex(f => f.type === type);
      let newFilters: ImageFilter[];

      if (existingFilterIndex >= 0) {
        // 如果滤镜已存在，更新其值
        newFilters = [...prevFilters];
        newFilters[existingFilterIndex] = {
          ...newFilters[existingFilterIndex],
          type,
          value: normalizedValue
        };
      } else {
        // 如果滤镜不存在，添加新滤镜，确保包含id
        newFilters = [...prevFilters, { 
          id: generateId(type),
          type, 
          value: normalizedValue 
        }];
      }

      // 通知外部变化
      onFiltersChange?.(newFilters);
      return newFilters;
    });
  };

  // 移除特定类型的滤镜
  const removeFilter = (type: ImageFilterType): void => {
    setFilters(prevFilters => {
      const newFilters = prevFilters.filter(f => f.type !== type);
      onFiltersChange?.(newFilters);
      return newFilters;
    });
  };

  // 重置所有滤镜
  const resetFilters = (): void => {
    setFilters([]);
    onFiltersChange?.([]);
  };

  // 应用预设滤镜组合
  const applyPreset = (presetFilters: ImageFilter[]): void => {
    // 确保预设滤镜中的每个对象都有id属性
    const filtersWithIds = presetFilters.map(filter => 
      filter.id ? filter : { ...filter, id: generateId(filter.type) }
    );
    setFilters(filtersWithIds);
    onFiltersChange?.(filtersWithIds);
  };

  // 检查滤镜是否存在
  const hasFilter = (type: ImageFilterType): boolean => {
    return filters.some(f => f.type === type);
  };

  return {
    filters,
    getFilterValue,
    setFilterValue,
    removeFilter,
    resetFilters,
    applyPreset,
    hasFilter,
  };
};

export default useImageFilters;