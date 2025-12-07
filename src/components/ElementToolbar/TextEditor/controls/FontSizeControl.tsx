import React, { useState } from "react";
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleInputBlur = () => {
    let newSize = parseInt(inputValue, 10);
    if (isNaN(newSize)) {
      newSize = fontSize;
    } else {
      // 限制字体大小在有效范围内
      newSize = Math.max(FONT_SIZE_RANGE.min, Math.min(FONT_SIZE_RANGE.max, newSize));
    }
    setInputValue(newSize.toString());
    onFontSizeChange(newSize);
  };
  
  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };
  
  const handleIncrease = () => {
    const newSize = Math.min(FONT_SIZE_RANGE.max, fontSize + 1);
    setInputValue(newSize.toString());
    onFontSizeChange(newSize);
  };
  
  const handleDecrease = () => {
    const newSize = Math.max(FONT_SIZE_RANGE.min, fontSize - 1);
    setInputValue(newSize.toString());
    onFontSizeChange(newSize);
  };
  
  return (
    <div className={styles.controlGroup}>
      <div className={styles.fontSizeControl}>
        <button 
          className={styles.fontSizeButton} 
          onClick={handleDecrease}
          disabled={fontSize <= FONT_SIZE_RANGE.min}
          title="减小字号"
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
          min={FONT_SIZE_RANGE.min}
          max={FONT_SIZE_RANGE.max}
          title="输入字号"
        />
        <button 
          className={styles.fontSizeButton} 
          onClick={handleIncrease}
          disabled={fontSize >= FONT_SIZE_RANGE.max}
          title="增大字号"
        >
          +
        </button>
      </div>
    </div>
  );
};