import React from "react";
import styles from "./TextStyleControls.module.css";

interface TextStyleControlsProps {
  isBold: boolean;
  isItalic: boolean;
  isUnderlined: boolean;
  isStrikethrough: boolean;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onToggleStrikethrough: () => void;
}

export const TextStyleControls: React.FC<TextStyleControlsProps> = ({
  isBold,
  isItalic,
  isUnderlined,
  isStrikethrough,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onToggleStrikethrough,
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
      <button
        className={`${styles.formatButton} ${isStrikethrough ? styles.active : ""}`}
        onClick={onToggleStrikethrough}
        title="删除线"
      >
        S
      </button>
    </div>
  );
};