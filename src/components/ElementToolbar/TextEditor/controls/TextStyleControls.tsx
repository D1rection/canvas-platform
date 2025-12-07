import React from "react";
import styles from "./TextStyleControls.module.css";

interface TextStyleControlsProps {
  isBold: boolean;
  isItalic: boolean;
  isUnderlined: boolean;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
}

export const TextStyleControls: React.FC<TextStyleControlsProps> = ({
  isBold,
  isItalic,
  isUnderlined,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
}) => {
  return (
    <div className={styles.formattingControls}>
      <button
        className={`${styles.formatButton} ${isBold ? styles.active : ""}`}
        onClick={onToggleBold}
        title="粗体"
      >
        B
      </button>
      <button
        className={`${styles.formatButton} ${isItalic ? styles.active : ""}`}
        onClick={onToggleItalic}
        title="斜体"
      >
        I
      </button>
      <button
        className={`${styles.formatButton} ${isUnderlined ? styles.active : ""}`}
        onClick={onToggleUnderline}
        title="下划线"
      >
        U
      </button>
    </div>
  );
};