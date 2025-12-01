// ColorPicker.tsx

import React, { useState, useRef, useEffect } from "react";
import type { ID, CanvasElement } from "../../canvas/schema/model";
import {
  getElementColor,
  setElementColor,
  COLOR_PRESETS,
} from "./utils";
import styles from "./ElementToolbar.module.css";

interface ColorPickerProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  element,
  onUpdateElement,
}) => {
  const currentColor = getElementColor(element);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [customColor, setCustomColor] = useState(currentColor);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // 同步元素颜色到自定义颜色输入框
  useEffect(() => {
    setCustomColor(currentColor);
  }, [currentColor]);

  // 处理点击外部关闭颜色选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setIsColorPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 处理颜色选择
  const handleColorSelect = (color: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    // 简单的颜色格式校验（仅检查是否为 6 位或 3 位的 Hex 颜色）
    const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(color);
    
    let validColor = color;
    if (!isValidHex) {
        // 如果不是有效的 Hex 格式，则回退到当前颜色
        validColor = currentColor;
    }
    
    if (validColor !== currentColor) {
        const colorUpdates = setElementColor(element, validColor);
        onUpdateElement(element.id, colorUpdates);
    }
    setCustomColor(validColor);
    setIsColorPickerOpen(false);
  };

  // 处理颜色选择器开关
  const handleColorPickerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsColorPickerOpen(!isColorPickerOpen);
  };

  // 实时颜色更新处理函数
  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    // 简单的颜色格式校验
    const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(color);
    if (isValidHex) {
      const colorUpdates = setElementColor(element, color);
      onUpdateElement(element.id, colorUpdates);
    }
  };

  return (
    <div 
      className={styles.colorPickerContainer} 
      ref={colorPickerRef}
      // 阻止冒泡到工具栏容器，防止触发拖拽
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        className={styles.colorTrigger}
        onClick={handleColorPickerToggle}
        style={{
          border: `2px solid ${currentColor}`, 
          background: currentColor,
          transform: isColorPickerOpen ? "scale(1.05)" : "scale(1)",
        }}
        title="选择颜色"
      >
        ●
      </button>

      {isColorPickerOpen && (
        <div
          className={styles.colorPickerDropdown}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 预设颜色网格 */}
          <div className={styles.colorPresets}>
            {COLOR_PRESETS.map((color, index) => (
              <button
                key={`${color}-${index}`}
                className={styles.colorOption}
                onClick={(e) => handleColorSelect(color, e)}
                style={{
                  background: color,
                  border: color === "#FFFFFF" ? "1px solid #e0e0e0" : "none",
                }}
                title={color}
              />
            ))}
          </div>

          {/* 自定义颜色选择器 */}
          <div className={styles.customColorSection}>
            <label className={styles.customColorLabel}>
              自定义颜色:
            </label>
            <div className={styles.customColorInputs}>
              <input
                type="color"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className={styles.colorInput}
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                onBlur={() => handleColorSelect(customColor)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleColorSelect(customColor);
                  }
                }}
                className={styles.hexInput}
                placeholder="#000000"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};