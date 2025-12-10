import React from "react";
import type { ID } from "../../../canvas/schema/model";
import { ScaleDirection } from "../../../canvas/tools/ScaleTool";
import { createResizeCursor } from "./customCursor";

const THEME_COLOR = "#5ea500";
const HANDLE_SIZE = 10;
const ROTATE_HANDLE_SIZE = 14;
const ROTATE_DISTANCE = 16;

/**
 * 将局部向量按元素 rotation 旋转到屏幕坐标系
 */
function rotateVector(
  v: { x: number; y: number },
  rotation: number | undefined
): { x: number; y: number } {
  const rad = ((rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

/**
 * 边缘控制点光标：根据缩放方向向量，生成对应方向的自定义光标
 */
function getEdgeCursor(
  edge: "top" | "right" | "bottom" | "left",
  rotation: number | undefined
): React.CSSProperties["cursor"] {
  // 在局部坐标中，边的法线方向（也是缩放方向）
  const local: Record<typeof edge, { x: number; y: number }> = {
    top: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    bottom: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
  };
  const v = rotateVector(local[edge], rotation);
  const angle = (Math.atan2(v.y, v.x) * 180) / Math.PI;
  return createResizeCursor(angle);
}

/**
 * 角控制点光标：沿角平分线方向生成自定义光标
 */
function getCornerCursor(
  corner: "tl" | "tr" | "bl" | "br",
  rotation: number | undefined
): React.CSSProperties["cursor"] {
  const local: Record<typeof corner, { x: number; y: number }> = {
    tl: { x: -1, y: -1 },
    tr: { x: 1, y: -1 },
    br: { x: 1, y: 1 },
    bl: { x: -1, y: 1 },
  };
  const v = rotateVector(local[corner], rotation);
  const angle = (Math.atan2(v.y, v.x) * 180) / Math.PI;
  return createResizeCursor(angle);
}

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
          left: "50%",
          transform: "translateX(-50%)",
          cursor: getEdgeCursor("top", rotation),
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.TOP, e)}
      />
      {/* 右边中心 */}
      <div
        style={{
          ...handleStyle,
          top: "50%",
          right: handleOffset,
          transform: "translateY(-50%)",
          cursor: getEdgeCursor("right", rotation),
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
          cursor: getEdgeCursor("bottom", rotation),
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.BOTTOM, e)}
      />
      {/* 左边中心 */}
      <div
        style={{
          ...handleStyle,
          top: "50%",
          left: handleOffset,
          transform: "translateY(-50%)",
          cursor: getEdgeCursor("left", rotation),
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.LEFT, e)}
      />

      {/* 四角控制点 */}
      <div
        style={{
          ...handleStyle,
          top: handleOffset,
          left: handleOffset,
          cursor: getCornerCursor("tl", rotation),
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.TOP_LEFT, e)}
      />
      <div
        style={{
          ...handleStyle,
          top: handleOffset,
          right: handleOffset,
          cursor: getCornerCursor("tr", rotation),
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.TOP_RIGHT, e)}
      />
      <div
        style={{
          ...handleStyle,
          bottom: handleOffset,
          left: handleOffset,
          cursor: getCornerCursor("bl", rotation),
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.BOTTOM_LEFT, e)}
      />
      <div
        style={{
          ...handleStyle,
          bottom: handleOffset,
          right: handleOffset,
          cursor: getCornerCursor("br", rotation),
        }}
        onPointerDown={(e) => handleScaleHandlePointerDown(ScaleDirection.BOTTOM_RIGHT, e)}
      />
    </div>
  );
};
