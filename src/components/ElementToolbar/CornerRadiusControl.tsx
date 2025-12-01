// CornerRadiusControl.tsx
import React, { useState, useRef } from "react";
import type { CanvasElement } from "../../canvas/schema/model";
import styles from "./ElementToolbar.module.css";

interface CornerRadiusControlProps {
  element: CanvasElement;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export const CornerRadiusControl: React.FC<CornerRadiusControlProps> = ({
  element,
  onUpdateElement,
}) => {
  // 类型检查，只有支持圆角的元素才显示此控件
  const hasCornerRadius = element.type === "shape" && element.shape === "rect";

  if (!hasCornerRadius) {
    return null;
  }

  // 从元素样式中获取圆角值
  const cornerRadius = 
    "style" in element && element.style.cornerRadius
      ? element.style.cornerRadius
      : 0;
  const [localValue, setLocalValue] = useState(cornerRadius);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);

  const handleChange = (value: number) => {
    const newValue = Math.max(0, value); // 确保值不为负数
    setLocalValue(newValue);
    // 正确更新元素的样式属性
    onUpdateElement(element.id, {
      style: {
        ...element.style,
        cornerRadius: newValue,
      },
    });
  };

  // 处理鼠标滚轮事件 - 已禁用鼠标滚轮控制功能
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    // 仅阻止默认行为，不执行任何控制逻辑
    e.preventDefault();
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 只有当滑块有焦点时才处理键盘导航
    if (!isFocused) return;

    let delta = 0;
    
    switch (e.key) {
      case 'ArrowLeft':
        delta = -1;
        break;
      case 'ArrowRight':
        delta = 1;
        break;
      case 'ArrowDown':
        delta = -5;
        break;
      case 'ArrowUp':
        delta = 5;
        break;
      default:
        return;
    }

    const newValue = localValue + delta;
    handleChange(newValue);
    
    // 对于箭头键，我们阻止默认行为以避免页面滚动
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

  // 阻止事件冒泡到工具栏
  const handleEventStopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  // 增加视觉反馈的样式类
  const getSliderClassName = () => {
    return [
      styles.cornerRadiusSlider,
      isFocused && styles.cornerRadiusSliderFocused,
      isDragging && styles.cornerRadiusSliderDragging
    ].filter(Boolean).join(' ');
  };

  return (
    <div 
      className={styles.cornerRadiusControlContainer}
      onMouseDown={handleEventStopPropagation}
    >
      <div className={styles.cornerRadiusControlHeader}>
        <span className={styles.cornerRadiusControlLabel}>圆角</span>
      </div>

      <div className={styles.cornerRadiusInputWrapper}>
        <input
          type="number"
          min="0"
          value={localValue}
          onChange={(e) => handleChange(Number(e.target.value))}
          onMouseDown={handleEventStopPropagation}
          className={styles.cornerRadiusInput}
        />
        <span className={styles.cornerRadiusUnit}>px</span>
      </div>

      <input
        ref={sliderRef}
        type="range"
        min="0"
        max="50"
        value={localValue}
        onChange={(e) => handleChange(Number(e.target.value))}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseDown={(e) => {
          handleEventStopPropagation(e);
          handleDragStart();
        }}
        onMouseUp={handleDragEnd}
        onTouchStart={(e) => {
          handleEventStopPropagation(e);
          handleDragStart();
        }}
        onTouchEnd={handleDragEnd}
        className={getSliderClassName()}
        data-dragging={isDragging}
        tabIndex={0}
        aria-label={`圆角半径: ${localValue}px`}
      />

      <div className={styles.cornerRadiusPreview}>
        <span>{localValue}px</span>
      </div>
    </div>
  );
};
