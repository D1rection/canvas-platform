// OpacitySlider.tsx

import React, { useRef, useState } from "react";
import type { ID, CanvasElement } from "../../canvas/schema/model";
import { getElementOpacity, setElementOpacity } from "./utils";
import styles from "./ElementToolbar.module.css";

interface OpacitySliderProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

export const OpacitySlider: React.FC<OpacitySliderProps> = ({
  element,
  onUpdateElement,
}) => {
  const currentOpacity = getElementOpacity(element);
  const sliderRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 计算百分比显示
  const opacityPercentage = Math.round(currentOpacity * 100);

  // 处理透明度变化
  const handleOpacityChange = (value: number) => {
    // 确保值在有效范围内
    const validValue = Math.max(0, Math.min(100, value));

    // 将滑块值(0-100)转换为透明度(0-1)
    const newOpacity = validValue / 100;

    const opacityUpdates = setElementOpacity(element, newOpacity);
    onUpdateElement(element.id, opacityUpdates);
  };

  // 处理滑块输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacityPercentage = parseInt(e.target.value);
    handleOpacityChange(newOpacityPercentage);
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

    // 防止与画布快捷键冲突
    // 这里不阻止事件冒泡，让画布可以处理其他快捷键

    let delta = 0;

    switch (e.key) {
      case "ArrowLeft":
        delta = -1;
        break;
      case "ArrowRight":
        delta = 1;
        break;
      case "ArrowDown":
        delta = -5;
        break;
      case "ArrowUp":
        delta = 5;
        break;
      default:
        return;
    }

    const newValue = opacityPercentage + delta;
    handleOpacityChange(newValue);

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

  // 增加视觉反馈的样式类
  const getSliderClassName = () => {
    return [
      styles.opacitySlider,
      isFocused && styles.opacitySliderFocused,
      isDragging && styles.opacitySliderDragging,
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <div
      className={styles.opacitySliderContainer}
      // 阻止冒泡到工具栏容器，防止触发拖拽
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={styles.opacitySliderHeader}>
        <label className={styles.opacitySliderLabel}>透明度</label>
        <span className={styles.opacityPercentage}>{opacityPercentage}%</span>
      </div>

      <div className={styles.opacitySliderContent}>
        <input
          ref={sliderRef}
          type="range"
          min="0"
          max="100"
          step="1"
          value={opacityPercentage}
          onInput={handleInputChange}
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
          aria-label={`透明度: ${opacityPercentage}%`}
          data-dragging={isDragging}
        />
      </div>
    </div>
  );
};
