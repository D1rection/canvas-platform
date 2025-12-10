import React from "react";
import type { ID } from "../../../canvas/schema/model";
import { ScaleDirection } from "../../../canvas/tools/ScaleTool";

interface MultiSelectionBoxProps {
  left: number;
  top: number;
  width: number;
  height: number;
  onPointerDown?: (e: React.PointerEvent<Element>) => void;
  onScaleHandlePointerDown?: (
    id: ID | undefined,
    direction: ScaleDirection,
    e: React.PointerEvent,
  ) => void;
  onRotateHandlePointerDown?: (
    id: ID | undefined,
    e: React.PointerEvent<Element>,
  ) => void;
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
  onRotateHandlePointerDown,
}) => {
  const THEME_COLOR = "#5ea500";
  const handleSize = 10;
  const handleOffset = -handleSize / 2;
  const ROTATE_HANDLE_SIZE = 14;
  const ROTATE_DISTANCE = 16;

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    width: handleSize,
    height: handleSize,
    backgroundColor: "#ffffff",
    border: `2px solid ${THEME_COLOR}`,
    borderRadius: 2,
    boxSizing: "border-box",
  };

  const rotateHandleStyle: React.CSSProperties = {
    position: "absolute",
    width: ROTATE_HANDLE_SIZE,
    height: ROTATE_HANDLE_SIZE,
    borderRadius: "50%",
    backgroundColor: THEME_COLOR,
    border: "2px solid white",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.2)",
    cursor: "grab",
    boxSizing: "border-box",
  };

  const rotateLineStyle: React.CSSProperties = {
    position: "absolute",
    width: "2px",
    backgroundColor: THEME_COLOR,
    left: "50%",
    transform: "translateX(-50%)",
    top: `-${ROTATE_DISTANCE}px`,
    height: `${ROTATE_DISTANCE}px`,
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
  const handleScaleHandlePointerDown = (
    direction: ScaleDirection,
    e: React.PointerEvent,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (onScaleHandlePointerDown) {
      onScaleHandlePointerDown(undefined, direction, e);
    }
  };

  const handleRotatePointerDown = (e: React.PointerEvent<Element>) => {
    e.stopPropagation();
    e.preventDefault();
    if (onRotateHandlePointerDown) {
      onRotateHandlePointerDown(undefined, e);
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
        border: `2px solid ${THEME_COLOR}`,
        boxSizing: "border-box",
        pointerEvents: "auto",
        zIndex: 40,
      }}
      onPointerDown={handlePointerDown}
      data-selection-box="true"
    >
      {/* 旋转控制线 */}
      <div style={rotateLineStyle} />

      {/* 旋转控制点（位于顶部中间） */}
      <div
        style={{
          ...rotateHandleStyle,
          left: `calc(50% - ${ROTATE_HANDLE_SIZE / 2}px)`,
          top: `-${ROTATE_DISTANCE + ROTATE_HANDLE_SIZE}px`,
        }}
        onPointerDown={handleRotatePointerDown}
      />

      {/* 四条边的中心控制点 */}
      {/* 上边中心 */}
      <div
        style={{
          ...handleStyle,
          top: handleOffset,
          left: "50%",
          transform: "translateX(-50%)",
          cursor: "n-resize",
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.TOP, e)}
      />
      {/* 右边中心 */}
      <div
        style={{
          ...handleStyle,
          top: "50%",
          transform: "translateY(-50%)",
          right: handleOffset,
          cursor: "e-resize",
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.RIGHT, e)}
      />
      {/* 下边中心 */}
      <div
        style={{
          ...handleStyle,
          bottom: handleOffset,
          left: "50%",
          transform: "translateX(-50%)",
          cursor: "s-resize",
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.BOTTOM, e)}
      />
      {/* 左边中心 */}
      <div
        style={{
          ...handleStyle,
          top: "50%",
          transform: "translateY(-50%)",
          left: handleOffset,
          cursor: "w-resize",
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
