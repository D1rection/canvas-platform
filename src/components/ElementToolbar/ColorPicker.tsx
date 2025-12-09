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
  isBackgroundColor?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  element,
  onUpdateElement,
  isBackgroundColor = false,
}) => {
  // 根据是否为背景色选择获取颜色的方式
  const currentColor = isBackgroundColor && element.type === 'text' 
    ? (element as any).spans[0]?.style.background || '#FFFFFF'
    : getElementColor(element);
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

    // 处理透明选项
    if (color === 'transparent') {
      if (isBackgroundColor && element.type === 'text') {
        // 清除文本背景色
        const textElement = element as any;
        const colorUpdates = {
          spans: textElement.spans.map((span: any) => {
            const { background, ...restStyle } = span.style;
            return {
              ...span,
              style: restStyle,
            };
          }),
        };
        onUpdateElement(element.id, colorUpdates);
        setCustomColor('#FFFFFF'); // 重置自定义颜色输入框为白色
        setIsColorPickerOpen(false);
        return;
      }
    }

    // 简单的颜色格式校验（仅检查是否为 6 位或 3 位的 Hex 颜色）
    const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(color);
    
    let validColor = color;
    if (!isValidHex) {
        // 如果不是有效的 Hex 格式，则回退到当前颜色
        validColor = currentColor;
    }
    
    if (validColor !== currentColor) {
      if (isBackgroundColor && element.type === 'text') {
        // 设置文本背景色
        const textElement = element as any;
        const colorUpdates = {
          spans: textElement.spans.map((span: any) => ({
            ...span,
            style: {
              ...span.style,
              background: validColor,
            },
          })),
        };
        onUpdateElement(element.id, colorUpdates);
      } else {
        // 设置文本颜色或形状颜色
        const colorUpdates = setElementColor(element, validColor);
        onUpdateElement(element.id, colorUpdates);
      }
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
      if (isBackgroundColor && element.type === 'text') {
        // 设置文本背景色
        const textElement = element as any;
        const colorUpdates = {
          spans: textElement.spans.map((span: any) => ({
            ...span,
            style: {
              ...span.style,
              background: color,
            },
          })),
        };
        onUpdateElement(element.id, colorUpdates);
      } else {
        // 设置文本颜色或形状颜色
        const colorUpdates = setElementColor(element, color);
        onUpdateElement(element.id, colorUpdates);
      }
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

          {/* 透明选项 */}
          {isBackgroundColor && (
            <div className={styles.customColorSection}>
              <button
                className={styles.transparentButton}
                onClick={() => handleColorSelect('transparent')}
              >
                透明（无背景）
              </button>
            </div>
          )}

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