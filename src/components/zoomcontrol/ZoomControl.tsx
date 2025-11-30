import React from "react";
import { LuMinus, LuPlus } from "react-icons/lu";
import styles from "./ZoomControl.module.css";

interface ZoomControlProps {
  scale: number;
  onChangeScale: (nextScale: number) => void;
  minScale?: number;
  maxScale?: number;
}

export const ZoomControl: React.FC<ZoomControlProps> = ({
  scale,
  onChangeScale,
  minScale = 0.1,
  maxScale = 5,
}) => {
  const percent = Math.round(scale * 100);

  const applyScale = (delta: number) => {
    const next = Math.min(maxScale, Math.max(minScale, scale + delta));
    if (next !== scale) {
      onChangeScale(next);
    }
  };

  const canZoomOut = scale > minScale;
  const canZoomIn = scale < maxScale;

  return (
    <div className={styles.root}>
      <button
        className={styles.btn}
        type="button"
        disabled={!canZoomOut}
        onClick={() => applyScale(-0.1)}
        aria-label="缩小"
      >
        <LuMinus size={16} />
      </button>
      <span className={styles.value}>{percent}%</span>
      <button
        className={styles.btn}
        type="button"
        disabled={!canZoomIn}
        onClick={() => applyScale(0.1)}
        aria-label="放大"
      >
        <LuPlus size={16} />
      </button>
    </div>
  );
};