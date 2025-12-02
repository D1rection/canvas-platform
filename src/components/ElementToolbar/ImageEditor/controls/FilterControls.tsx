import React, { useRef, useState } from "react";
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
    opacity: number;
  }

  // 将0-100范围转换为0-1范围
  const percentToUnit = (value: number): number => value / 100;
  // 将0-1范围转换为0-100范围（用于显示）
  const unitToPercent = (value: number): number => value * 100;

  // 获取当前滤镜参数
  const filters: FilterParams = {
    brightness: unitToPercent(getImageFilter(element, "brightness", 1)),
    grayscale: unitToPercent(getImageFilter(element, "grayscale", 0)),
    blur: getImageFilter(element, "blur", 0),
    opacity: unitToPercent(getImageFilter(element, "opacity", 1)),
  };

  // 处理滤镜变化 - 直接更新，不使用防抖
  const handleFilterChange = (type: keyof FilterParams, value: number) => {
    if (!isImageElement(element)) return;

    // 边界检查并转换值
    let validValue = value;
    let modelValue = value;

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
      case "opacity":
        validValue = Math.max(0, Math.min(100, value));
        modelValue = percentToUnit(validValue); // 转换为0-1范围
        break;
    }

    // 直接更新，确保响应流畅
    const filterUpdates = setImageFilter(element, type, modelValue);
    onUpdateElement(element.id, filterUpdates);
  };

  // 滤镜滑块组件 - 完全按照OpacitySlider的实现方式
  const FilterSlider: React.FC<{
    type: keyof FilterParams;
    label: string;
    min: number;
    max: number;
    value: number;
    unit?: string;
  }> = ({ type, label, min, max, value, unit = "%" }) => {
    const sliderRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // 处理滑块输入变化 - 直接更新
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      handleFilterChange(type, newValue);
    };

    // 处理鼠标滚轮事件 - 禁用鼠标滚轮控制
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      e.preventDefault();
    };

    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isFocused) return;

      let delta = 0;

      switch (e.key) {
        case "ArrowLeft":
          delta = e.shiftKey ? -10 : -5; // 增加基础调节幅度，shift键加速
          break;
        case "ArrowRight":
          delta = e.shiftKey ? 10 : 5; // 增加基础调节幅度，shift键加速
          break;
        case "ArrowDown":
          delta = e.shiftKey ? -20 : -10; // 增加基础调节幅度，shift键加速
          break;
        case "ArrowUp":
          delta = e.shiftKey ? 20 : 10; // 增加基础调节幅度，shift键加速
          break;
        default:
          return;
      }

      const newValue = Math.max(min, Math.min(max, value + delta));
      handleFilterChange(type, newValue);

      // 阻止默认行为以避免页面滚动
      e.preventDefault();
    };

    // 处理焦点事件
    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
      setIsDragging(false);
    };

    // 处理拖拽开始/结束
    const handleDragStart = () => {
      setIsDragging(true);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    // 获取滑块样式类
    const getSliderClassName = () => {
      return [
        styles.slider,
        isFocused && styles.sliderFocused,
        isDragging && styles.sliderDragging,
      ]
        .filter(Boolean)
        .join(" ");
    };

    return (
      <div 
        className={styles.filterControl}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.labelRow}>
          <label>{label}</label>
          <span className={styles.valueDisplay}>
            {Math.round(value)}
            {unit}
          </span>
        </div>
        <input
          ref={sliderRef}
          type="range"
          min={min}
          max={max}
          value={value}
          step={type === 'blur' ? 0.5 : 1} // 为模糊添加更小的步长，其他使用1
          onChange={handleInputChange}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
          className={getSliderClassName()}
          tabIndex={0}
          aria-label={`${label}: ${Math.round(value)}${unit}`}
          data-dragging={isDragging}
        />
      </div>
    );
  };

  // 只在元素是图片时渲染滤镜控件
  if (!isImageElement(element)) {
    return null;
  }

  return (
    <div className={styles.filterControls}>
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
      <FilterSlider
        type="opacity"
        label="透明度"
        min={0}
        max={100}
        value={filters.opacity}
      />
      {/* 边框设置 */}
      <div className={styles.borderControls}>
        <div className={styles.filterControl}>
          <div className={styles.labelRow}>
            <label>边框宽度</label>
            <span className={styles.valueDisplay}>
              {element.borderWidth || 0}px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            value={element.borderWidth || 0}
            onChange={(e) => {
              const width = parseFloat(e.target.value);
              onUpdateElement(element.id, { borderWidth: width });
            }}
            className={styles.slider}
            step={1}
          />
        </div>
        <div className={styles.filterControl}>
          <label>边框颜色</label>
          <input
            type="color"
            value={element.borderColor || '#000000'}
            onChange={(e) => {
              onUpdateElement(element.id, { borderColor: e.target.value });
            }}
            className={styles.colorPicker}
          />
        </div>
      </div>
    </div>
  );
};