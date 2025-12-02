import React from "react";
import type { CanvasElement, ID } from "../../../../canvas/schema/model";
import { getImageFilter, setImageFilter, isImageElement } from "../utils/filterUtils";
import styles from "./FilterControls.module.css";

interface FilterControlsProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  element,
  onUpdateElement,
}) => {
  // 滤镜参数类型
  interface FilterParams {
    brightness: number;
    grayscale: number;
    blur: number;
  }

  // 将0-100范围转换为0-1范围
  const percentToUnit = (value: number): number => value / 100;
  // 将0-1范围转换为0-100范围（用于显示）
  const unitToPercent = (value: number): number => value * 100;

  // 获取当前滤镜参数（仅处理model中定义的滤镜类型）
  const filters: FilterParams = {
    brightness: unitToPercent(getImageFilter(element, "brightness", 1)),
    grayscale: unitToPercent(getImageFilter(element, "grayscale", 0)),
    blur: getImageFilter(element, "blur", 0),
  };

  // 处理滤镜变化
  const handleFilterChange = (type: keyof FilterParams, value: number) => {
    // 只有图片元素才应用滤镜
    if (!isImageElement(element)) return;

    // 边界检查并转换值
    let validValue = value;
    let modelValue = value; // 保存发送到模型的值

    switch (type) {
      case "brightness":
        validValue = Math.max(0, Math.min(200, value));
        modelValue = percentToUnit(validValue); // 转换为0-2范围
        break;
      case "grayscale":
        validValue = Math.max(0, Math.min(100, value));
        modelValue = percentToUnit(validValue); // 转换为0-1范围
        break;
      case "blur":
        validValue = Math.max(0, Math.min(20, value));
        modelValue = validValue; // 保持原值（像素单位）
        break;
    }

    // 只更新在ImageFilterType中定义的滤镜类型
    if (type === 'brightness' || type === 'grayscale' || type === 'blur') {
      const filterUpdates = setImageFilter(element, type, modelValue);
      onUpdateElement(element.id, filterUpdates);
    }
  };

  // 滤镜滑块组件
  const FilterSlider: React.FC<{
    type: keyof FilterParams;
    label: string;
    min: number;
    max: number;
    value: number;
    unit?: string;
  }> = ({ type, label, min, max, value, unit = "%" }) => (
    <div className={styles.filterControl}>
      <div className={styles.filterLabelRow}>
        <label>{label}</label>
        <span className={styles.filterValue}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => handleFilterChange(type, parseFloat(e.target.value))}
        className={styles.filterSlider}
        // 复用OpacitySlider的样式和行为模式
      />
    </div>
  );

  // 只在元素是图片时渲染滤镜控件
  if (!isImageElement(element)) {
    return null;
  }

  return (
    <div className={styles.filtersContainer}>
      <FilterSlider
        type="brightness"
        label="亮度"
        min={0}
        max={200}
        value={filters.brightness}
      />
      <FilterSlider
        type="grayscale"
        label="灰度"
        min={0}
        max={100}
        value={filters.grayscale}
      />
      <FilterSlider
        type="blur"
        label="模糊"
        min={0}
        max={20}
        value={filters.blur}
        unit="px"
      />
    </div>
  );
};
