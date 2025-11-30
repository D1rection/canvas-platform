import React from "react";

interface SelectionBoxProps {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation?: number;
}

/**
 * 单个元素的选中框
 * - 蓝色边框 + 四角控制点
 */
export const SelectionBox: React.FC<SelectionBoxProps> = ({
  left,
  top,
  width,
  height,
  rotation = 0,
}) => {
  const handleSize = 10;
  const handleOffset = -handleSize / 2;

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    width: handleSize,
    height: handleSize,
    backgroundColor: "#ffffff",
    border: "2px solid #5ea500",
    borderRadius: 2,
    boxSizing: "border-box",
  };

  /**
   * 阻止事件冒泡，避免点击选中框时触发画布的 pointerdown
   */
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        border: "2px solid #5ea500",
        boxSizing: "border-box",
        pointerEvents: "auto",
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "top left",
      }}
      onPointerDown={handlePointerDown}
    >
      {/* 四角控制点 */}
      <div style={{ ...handleStyle, top: handleOffset, left: handleOffset, cursor: "nwse-resize" }} />
      <div style={{ ...handleStyle, top: handleOffset, right: handleOffset, cursor: "nesw-resize" }} />
      <div style={{ ...handleStyle, bottom: handleOffset, left: handleOffset, cursor: "nesw-resize" }} />
      <div style={{ ...handleStyle, bottom: handleOffset, right: handleOffset, cursor: "nwse-resize" }} />
    </div>
  );
};

