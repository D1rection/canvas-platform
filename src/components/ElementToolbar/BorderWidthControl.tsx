// BorderWidthControl.tsx
import React, { useState } from "react";
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
  // 移除未使用的 isDragging 状态
  // const [isDragging, setIsDragging] = useState(false);

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

  // 移除未使用的拖拽处理函数
  // 处理滑块拖拽开始/结束
  // const handleDragStart = () => {
  //   setIsDragging(true);
  // };
  
  // const handleDragEnd = () => {
  //   setIsDragging(false);
  // };

  // 阻止所有事件冒泡到工具栏
  const handleEventStopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
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
        type="range"
        min="1"
        max="20"
        value={localWidth}
        onChange={handleSliderChange}
        onMouseDown={handleEventStopPropagation}
        onTouchStart={handleEventStopPropagation}
        onClick={handleEventStopPropagation}
        onPointerDown={handleEventStopPropagation}
        className={styles.borderWidthSlider}
        data-toolbar-element="true"
      />
      
      <div className={styles.borderWidthPreview}>
        <span>细</span>
        <span>{localWidth}px</span>
        <span>粗</span>
      </div>
    </div>
  );
};