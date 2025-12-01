// CornerRadiusControl.tsx
import React, { useState } from "react";
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

  return (
    <div className={styles.cornerRadiusControlContainer}>
      <div className={styles.cornerRadiusControlHeader}>
        <span className={styles.cornerRadiusControlLabel}>圆角</span>
      </div>

      <div className={styles.cornerRadiusInputWrapper}>
        <input
          type="number"
          min="0"
          value={localValue}
          onChange={(e) => handleChange(Number(e.target.value))}
          className={styles.cornerRadiusInput}
        />
        <span className={styles.cornerRadiusUnit}>px</span>
      </div>

      <input
        type="range"
        min="0"
        max="50"
        value={localValue}
        onChange={(e) => handleChange(Number(e.target.value))}
        className={styles.cornerRadiusSlider}
      />

      <div className={styles.cornerRadiusPreview}>
        <span>{localValue}px</span>
      </div>
    </div>
  );
};
