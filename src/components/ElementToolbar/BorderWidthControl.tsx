// BorderWidthControl.tsx
import React, { useState, useRef } from "react";
import type { ID, CanvasElement } from "../../canvas/schema/model";
import { 
  getElementBorderWidth, 
  setElementBorderWidth,
  getElementBorderColor,
  setElementBorderColor
} from "./utils";
import styles from "./ElementToolbar.module.css";

interface BorderWidthControlProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

export const BorderWidthControl: React.FC<BorderWidthControlProps> = ({
  element,
  onUpdateElement,
}) => {
  const currentWidth = getElementBorderWidth(element);
  const [localWidth, setLocalWidth] = useState(currentWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);

  // 更新边框宽度
  const updateBorderWidth = (width: number) => {
    const validWidth = Math.max(1, Math.min(20, width));
    setLocalWidth(validWidth);
    
    // 获取当前边框颜色
    const currentBorderColor = getElementBorderColor(element);
    let updates = setElementBorderWidth(element, validWidth);
    
    // 如果当前没有边框颜色且设置了边框宽度，则设置默认边框颜色
    if ((!currentBorderColor || currentBorderColor === "#000000") && validWidth > 0) {
      const colorUpdates = setElementBorderColor(element, "#000000");
      updates = { ...updates, ...colorUpdates };
    }
    
    onUpdateElement(element.id, updates);
  };

  // 处理输入框变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      updateBorderWidth(value);
    }
  };

  // 处理滑块变化
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    updateBorderWidth(value);
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
        delta = -2;
        break;
      case 'ArrowUp':
        delta = 2;
        break;
      default:
        return;
    }

    const newValue = localWidth + delta;
    updateBorderWidth(newValue);
    
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

  // 阻止所有事件冒泡到工具栏
  const handleEventStopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  // 增加视觉反馈的样式类
  const getSliderClassName = () => {
    return [
      styles.borderWidthSlider,
      isFocused && styles.borderWidthSliderFocused,
      isDragging && styles.borderWidthSliderDragging
    ].filter(Boolean).join(' ');
  };

  return (
    <div 
      className={styles.borderWidthControlContainer}
      onMouseDown={handleEventStopPropagation}
      data-toolbar-element="true"
    >
      <div className={styles.borderWidthControlHeader}>
        <label className={styles.borderWidthControlLabel}>边框</label>
      </div>
      
      <div className={styles.borderWidthInputWrapper}>
        <input
          type="number"
          min="1"
          max="20"
          value={localWidth}
          onChange={handleInputChange}
          onMouseDown={handleEventStopPropagation}
          onTouchStart={handleEventStopPropagation}
          onClick={handleEventStopPropagation}
          className={styles.borderWidthInput}
        />
        <span className={styles.borderWidthUnit}>px</span>
      </div>
      
      <input
        ref={sliderRef}
        type="range"
        min="1"
        max="20"
        value={localWidth}
        onChange={handleSliderChange}
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
        onPointerDown={handleEventStopPropagation}
        className={getSliderClassName()}
        data-toolbar-element="true"
        data-dragging={isDragging}
        tabIndex={0}
        aria-label={`边框宽度: ${localWidth}px`}
      />
      
      <div className={styles.borderWidthPreview}>
        <span>细</span>
        <span>{localWidth}px</span>
        <span>粗</span>
      </div>
    </div>
  );
};