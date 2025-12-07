import React, { useState, useRef, useEffect } from "react";
import { COMMON_FONTS } from "../utils/textFormatUtils";
import styles from "../TextEditor.module.css";

interface FontFamilyControlProps {
  fontFamily: string;
  onFontFamilyChange: (fontFamily: string) => void;
}

export const FontFamilyControl: React.FC<FontFamilyControlProps> = ({
  fontFamily,
  onFontFamilyChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFontSelect = (selectedFont: string) => {
    onFontFamilyChange(selectedFont);
    setIsOpen(false);
  };
  // 在组件中添加边界检测
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const dropdown = dropdownRef.current.querySelector(
        `.${styles.fontFamilyDropdown}`
      );
      if (dropdown) {
        const rect = dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // 如果下拉菜单超出底部边界，则向上显示
        if (rect.bottom > viewportHeight) {
          (dropdown as HTMLElement).style.top = "auto";
          (dropdown as HTMLElement).style.bottom = "100%";
        }
      }
    }
  }, [isOpen]);
  return (
    <div className={styles.controlGroup} ref={dropdownRef}>
      <button
        className={styles.fontFamilySelect}
        onClick={() => setIsOpen(!isOpen)}
        style={{ fontFamily }}
        title="选择字体"
      >
        {fontFamily}
        <span className={styles.dropdownArrow}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className={styles.fontFamilyDropdown}>
          {COMMON_FONTS.map((font) => (
            <button
              key={font}
              className={`${styles.fontFamilyOption} ${
                fontFamily === font ? styles.selected : ""
              }`}
              onClick={() => handleFontSelect(font)}
              style={{ fontFamily: font }}
              title={font}
            >
              {font}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
