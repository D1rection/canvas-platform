// BorderColorPicker.tsx
import React, { useState } from "react";
import type { ID, CanvasElement } from "../../canvas/schema/model";
import {
  getElementBorderColor,
  setElementBorderColor,
  COLOR_PRESETS,
} from "./utils";
import styles from "./ElementToolbar.module.css";

interface BorderColorPickerProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

export const BorderColorPicker: React.FC<BorderColorPickerProps> = ({
  element,
  onUpdateElement,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const currentColor = getElementBorderColor(element);

  // 处理颜色选择
  const handleColorSelect = (color: string) => {
    const updates = setElementBorderColor(element, color);
    onUpdateElement(element.id, updates);
    setShowPicker(false);
  };

  // 处理自定义颜色输入
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    const updates = setElementBorderColor(element, color);
    onUpdateElement(element.id, updates);
  };

  return (
    <div
      className={styles.colorPickerContainer}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 边框颜色触发器 */}
      <div
        className={styles.borderColorTrigger}
        style={{ backgroundColor: currentColor }}
        onClick={() => setShowPicker(!showPicker)}
        title="边框颜色"
      >
        {currentColor === "transparent" && (
          <span style={{ color: "#fff", fontSize: "10px" }}>无</span>
        )}
      </div>

      {/* 颜色选择器弹窗 */}
      {showPicker && (
        <div className={styles.colorPickerDropdown}>
          {/* 预设颜色 */}
          <div className={styles.colorPresets}>
            {COLOR_PRESETS.map((color, index) => (
              <button
                key={`${color}-${index}`}
                className={styles.colorOption}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                aria-label={`选择颜色 ${color}`}
              />
            ))}
            {/* 透明色选项 */}
            <button
              className={styles.colorOption}
              style={{
                background:
                  "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px",
              }}
              onClick={() => handleColorSelect("transparent")}
              aria-label="无边框"
            />
          </div>

          {/* 自定义颜色输入 */}
          <label className={styles.customColorLabel}>自定义颜色</label>
          <div className={styles.customColorInputs}>
            <input
              type="color"
              value={currentColor === "transparent" ? "#000000" : currentColor}
              onChange={handleCustomColorChange}
              className={styles.colorInput}
            />
            <input
              type="text"
              value={currentColor}
              onChange={(e) => handleColorSelect(e.target.value)}
              className={styles.hexInput}
              placeholder="#000000"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BorderColorPicker;