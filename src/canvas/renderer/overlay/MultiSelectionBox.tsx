import React from "react";
import type { ID } from "../../../canvas/schema/model";
import { ScaleDirection } from "../../../canvas/tools/ScaleTool";

interface MultiSelectionBoxProps {
  left: number;
  top: number;
  width: number;
  height: number;
  onPointerDown?: (e: React.PointerEvent<Element>) => void;
  onScaleHandlePointerDown?: (id: ID | undefined, direction: ScaleDirection, e: React.PointerEvent) => void;
}

/**
 * 多选元素的统一包围框
 * - 当选中多个元素时，显示一个大的包围选中框
 */
export const MultiSelectionBox: React.FC<MultiSelectionBoxProps> = ({
  left,
  top,
  width,
  height,
  onPointerDown,
  onScaleHandlePointerDown,
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
   * 处理选中框的指针按下事件
   */
  const handlePointerDown = (e: React.PointerEvent) => {
    // 阻止事件冒泡，避免触发画布的 pointerdown
    e.stopPropagation();
    
    // 调用外部传入的回调函数
    if (onPointerDown) {
      onPointerDown(e);
    }
  };

  /**
   * 处理缩放控制点的指针按下事件
   */
  const handleScaleHandlePointerDown = (direction: ScaleDirection, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onScaleHandlePointerDown) {
      onScaleHandlePointerDown(undefined, direction, e);
    }
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
        zIndex: 40,
      }}
      onPointerDown={handlePointerDown}
      data-selection-box="true"
    >
      {/* 四条边的中心控制点 */}
      {/* 上边中心 */}
      <div
        style={{
          ...handleStyle,
          top: handleOffset,
          left: width / 2 + handleOffset,
          cursor: "n-resize"
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.TOP, e)}
      />
      {/* 右边中心 */}
      <div
        style={{
          ...handleStyle,
          top: height / 2 + handleOffset,
          right: handleOffset,
          cursor: "e-resize"
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.RIGHT, e)}
      />
      {/* 下边中心 */}
      <div
        style={{
          ...handleStyle,
          bottom: handleOffset,
          left: width / 2 + handleOffset,
          cursor: "s-resize"
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.BOTTOM, e)}
      />
      {/* 左边中心 */}
      <div
        style={{
          ...handleStyle,
          top: height / 2 + handleOffset,
          left: handleOffset,
          cursor: "w-resize"
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.LEFT, e)}
      />

      {/* 四角控制点 */}
      <div
        style={{ ...handleStyle, top: handleOffset, left: handleOffset, cursor: "nwse-resize" }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.TOP_LEFT, e)}
      />
      <div
        style={{ ...handleStyle, top: handleOffset, right: handleOffset, cursor: "nesw-resize" }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.TOP_RIGHT, e)}
      />
      <div
        style={{ ...handleStyle, bottom: handleOffset, left: handleOffset, cursor: "nesw-resize" }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.BOTTOM_LEFT, e)}
      />
      <div
        style={{ ...handleStyle, bottom: handleOffset, right: handleOffset, cursor: "nwse-resize" }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.BOTTOM_RIGHT, e)}
      />
    </div>
  );
};
