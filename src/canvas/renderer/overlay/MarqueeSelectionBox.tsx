import React from "react";

// 与整体画布交互保持一致的主题色
const THEME_COLOR = "#5ea500";

interface MarqueeSelectionBoxProps {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  viewport: { x: number; y: number; scale: number };
}

export const MarqueeSelectionBox: React.FC<MarqueeSelectionBoxProps> = ({
  startPoint,
  endPoint,
  viewport,
}) => {
  const scale = viewport.scale;
  const x = Math.min(startPoint.x, endPoint.x);
  const y = Math.min(startPoint.y, endPoint.y);
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  const screenX = (x - viewport.x) * scale;
  const screenY = (y - viewport.y) * scale;
  const screenWidth = width * scale;
  const screenHeight = height * scale;

  return (
    <div
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        width: screenWidth,
        height: screenHeight,
        border: `1px solid ${THEME_COLOR}`,
        // 使用与主题色一致的半透明填充
        backgroundColor: "rgba(94, 165, 0, 0.06)",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
};
