import React, { useState, useCallback } from "react";
import { FONT_SIZE_RANGE } from "../utils/textFormatUtils";
import styles from "../TextEditor.module.css";

interface FontSizeControlProps {
  fontSize: number;
  onFontSizeChange: (fontSize: number) => void;
}

export const FontSizeControl: React.FC<FontSizeControlProps> = ({ 
  fontSize, 
  onFontSizeChange 
}) => {
  const [inputValue, setInputValue] = useState(fontSize.toString());
  const [isDragging, setIsDragging] = useState(false);
  
  // 统一的字体大小更新函数
  const updateFontSize = useCallback((newSize: number) => {
    const clampedSize = Math.max(FONT_SIZE_RANGE.min, Math.min(FONT_SIZE_RANGE.max, newSize));
    setInputValue(clampedSize.toString());
    onFontSizeChange(clampedSize);
  }, [onFontSizeChange]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleInputBlur = () => {
    const newSize = parseInt(inputValue, 10);
    updateFontSize(isNaN(newSize) ? fontSize : newSize);
  };
  
  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updateFontSize(fontSize + 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      updateFontSize(fontSize - 1);
    }
  };
  
  const handleIncrease = () => {
    updateFontSize(fontSize + 1);
  };
  
  const handleDecrease = () => {
    updateFontSize(fontSize - 1);
  };
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFontSize(parseInt(e.target.value, 10));
  };
  
  const handleSliderMouseDown = () => {
    setIsDragging(true);
  };
  
  const handleSliderMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleSliderTouchStart = () => {
    setIsDragging(true);
  };
  
  const handleSliderTouchEnd = () => {
    setIsDragging(false);
  };
  
  return (
    <div className={styles.controlGroup}>
      <div className={styles.fontSizeControl}>
        <button 
          className={styles.fontSizeButton} 
          onClick={handleDecrease}
          disabled={fontSize <= FONT_SIZE_RANGE.min}
          title="减小字号 (Ctrl+[)"
        >
          -
        </button>
        <input
          type="text"
          className={styles.fontSizeInput}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyPress={handleInputKeyPress}
          onKeyDown={handleInputKeyPress}
          min={FONT_SIZE_RANGE.min}
          max={FONT_SIZE_RANGE.max}
          title="输入字号 (Enter确认，上下箭头调整)"
        />
        <button 
          className={styles.fontSizeButton} 
          onClick={handleIncrease}
          disabled={fontSize >= FONT_SIZE_RANGE.max}
          title="增大字号 (Ctrl+])"
        >
          +
        </button>
        <input
          type="range"
          className={styles.fontSizeSlider}
          value={fontSize}
          onChange={handleSliderChange}
          onMouseDown={handleSliderMouseDown}
          onMouseUp={handleSliderMouseUp}
          onMouseLeave={handleSliderMouseUp}
          onTouchStart={handleSliderTouchStart}
          onTouchEnd={handleSliderTouchEnd}
          min={FONT_SIZE_RANGE.min}
          max={FONT_SIZE_RANGE.max}
          step="1"
          data-dragging={isDragging}
          title="拖动调整字号"
        />
      </div>
    </div>
  );
};