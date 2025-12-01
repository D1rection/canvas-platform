import React from "react";

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
    <div style={{
      position: "absolute",
      left: screenX,
      top: screenY,
      width: screenWidth,
      height: screenHeight,
      border: "2px dashed #5ea500",
      backgroundColor: "rgba(74, 144, 226, 0.1)",
      pointerEvents: "none",
      zIndex: 9999,
    }} />
  );
};
