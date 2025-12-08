import React from "react";
import type { ID } from "../../../canvas/schema/model";
import { ScaleDirection } from "../../../canvas/tools/ScaleTool";

const THEME_COLOR = "#5ea500";
const HANDLE_SIZE = 10;
const ROTATE_HANDLE_SIZE = 14;
const ROTATE_DISTANCE = 16;

interface SelectionBoxProps {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation?: number;
  id?: ID;
  onRotateHandlePointerDown?: (id: ID | undefined, e: React.PointerEvent) => void;
  onScaleHandlePointerDown?: (id: ID | undefined, direction: ScaleDirection, e: React.PointerEvent) => void;
  onSelectionBoxPointerDown?: (e: React.PointerEvent<Element>) => void;
}

/**
 * 单个元素的选中框
 * - 蓝色边框 + 四角控制点 + 旋转控制点
 */
export const SelectionBox: React.FC<SelectionBoxProps> = ({
  left,
  top,
  width,
  height,
  rotation = 0,
  id,
  onRotateHandlePointerDown,
  onScaleHandlePointerDown,
  onSelectionBoxPointerDown,
}) => {
  const handleOffset = -HANDLE_SIZE / 2;

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: "#ffffff",
    border: `2px solid ${THEME_COLOR}`,
    borderRadius: 2,
    boxSizing: "border-box",
  };

  // 旋转控制点样式
  const rotateHandleStyle: React.CSSProperties = {
    ...handleStyle,
    width: ROTATE_HANDLE_SIZE,
    height: ROTATE_HANDLE_SIZE,
  borderRadius: "50%",
  backgroundColor: THEME_COLOR,
  border: "2px solid white",
  boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.2)",
  cursor: "grab",
  transition: "all 0.1s ease",
};

  // 旋转控制线样式
  const rotateLineStyle: React.CSSProperties = {
    position: "absolute",
    width: "2px",
    backgroundColor: THEME_COLOR,
    left: `calc(50% - 1px)`,
    top: `-${ROTATE_DISTANCE}px`,
    height: `${ROTATE_DISTANCE}px`,
  };
  
  // 鼠标悬停时的旋转控制点样式
  const rotateHandleHoverStyle: React.CSSProperties = {
    ...rotateHandleStyle,
    cursor: "grabbing",
    backgroundColor: "#4d8f00",
    transform: `translate(-${handleOffset}px, -${handleOffset}px) scale(1.1)`,
  };

  /**
   * 处理选中框的指针按下事件
   * - 阻止事件冒泡，避免触发画布的 pointerdown
   * - 调用外部传入的回调函数，以便触发拖拽操作
   */
  const handlePointerDown = (e: React.PointerEvent) => {
    // 阻止事件冒泡
    e.stopPropagation();
    
    // 调用外部传入的回调函数，用于触发拖拽操作
    if (onSelectionBoxPointerDown) {
      onSelectionBoxPointerDown(e);
    }
  };

  /**
   * 处理旋转控制点的指针按下事件
   */
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onRotateHandlePointerDown) {
      onRotateHandlePointerDown(id, e);
    }
  };
  
  /**
   * 处理缩放控制点的指针按下事件
   */
  const handleScaleHandlePointerDown = (direction: ScaleDirection, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onScaleHandlePointerDown) {
      onScaleHandlePointerDown(id, direction, e);
    }
  };

  return (
    <div
      data-selection-box="single"
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
        transformOrigin: "center",
      }}
      onPointerDown={handlePointerDown}
    >
      {/* 旋转控制线 */}
      <div style={rotateLineStyle} />

      {/* 旋转控制点 */}
      <div
        style={{
          ...rotateHandleStyle,
          left: `calc(50% - ${ROTATE_HANDLE_SIZE / 2}px)`,
          top: `-${ROTATE_DISTANCE + ROTATE_HANDLE_SIZE}px`,
        }}
        onPointerDown={handleRotatePointerDown}
        onMouseEnter={(e) => {
          if (e.currentTarget instanceof HTMLElement) {
            const el = e.currentTarget;
            Object.assign(el.style, rotateHandleHoverStyle);
          }
        }}
        onMouseLeave={(e) => {
          if (e.currentTarget instanceof HTMLElement) {
            const el = e.currentTarget;
            Object.assign(el.style, rotateHandleStyle);
          }
        }}
      >
        {/* 旋转图标指示器 */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 6,
            height: 6,
            backgroundColor: "white",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
          }}
        />
      </div>

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
