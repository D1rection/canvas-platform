// OpacitySlider.tsx

import React from "react";
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

  // 处理透明度变化
  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 将滑块值(0-100)转换为透明度(0-1)
    const newOpacityPercentage = parseInt(e.target.value);
    const newOpacity = newOpacityPercentage / 100;
    
    const opacityUpdates = setElementOpacity(element, newOpacity);
    onUpdateElement(element.id, opacityUpdates);
  };

  // 计算百分比显示
  const opacityPercentage = Math.round(currentOpacity * 100);

  return (
    <div 
      className={styles.opacitySliderContainer}
      // 阻止冒泡到工具栏容器，防止触发拖拽
      onMouseDown={e => e.stopPropagation()}
    >
      <div className={styles.opacitySliderHeader}>
        <label className={styles.opacitySliderLabel}>透明度</label>
        <span className={styles.opacityPercentage}>
          {opacityPercentage}%
        </span>
      </div>
      
      <div className={styles.opacitySliderContent}>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={opacityPercentage}
          onChange={handleOpacityChange}
          className={styles.opacitySlider}
        />
      </div>
    </div>
  );
};