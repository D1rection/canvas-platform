import React from "react";
import type { ID } from "../../../canvas/schema/model";

interface SelectionBoxProps {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation?: number;
  id?: ID;
  onRotateHandlePointerDown?: (id: ID | undefined, e: React.PointerEvent) => void;
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
}) => {
  const handleSize = 10;
  const handleOffset = -handleSize / 2;
  // 旋转控制点距离顶部的距离
  const rotateControlDistance = 25;

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    width: handleSize,
    height: handleSize,
    backgroundColor: "#ffffff",
    border: "2px solid #5ea500",
    borderRadius: 2,
    boxSizing: "border-box",
  };

  // 旋转控制点样式
  const rotateHandleStyle: React.CSSProperties = {
    ...handleStyle,
    width: 14,
    height: 14,
    borderRadius: "50%",
    backgroundColor: "#5ea500",
    border: "2px solid white",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.2)",
    cursor: "grab",
    transition: "all 0.1s ease",
    transform: `translate(-${handleOffset}px, -${handleOffset}px)`,
  };

  // 旋转控制线样式
  const rotateLineStyle: React.CSSProperties = {
    position: "absolute",
    width: "2px",
    backgroundColor: "#5ea500",
    left: "50%",
    top: `-${rotateControlDistance}px`,
    height: `${rotateControlDistance}px`,
    transform: "translateX(-1px)",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.1)",
  };
  
  // 鼠标悬停时的旋转控制点样式
  const rotateHandleHoverStyle: React.CSSProperties = {
    ...rotateHandleStyle,
    cursor: "grabbing",
    backgroundColor: "#4d8f00",
    transform: `translate(-${handleOffset}px, -${handleOffset}px) scale(1.1)`,
  };

  /**
   * 阻止事件冒泡，避免点击选中框时触发画布的 pointerdown
   */
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
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
        transformOrigin: "center",
      }}
      onPointerDown={handlePointerDown}
    >
      {/* 旋转控制线 */}
      <div
        style={rotateLineStyle}
        onPointerDown={handlePointerDown}
      />
      
      {/* 旋转控制点 */}
      <div
        style={{
          ...rotateHandleStyle,
          left: "50%",
          top: `-${rotateControlDistance}px`,
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
        onPointerDown={handlePointerDown}
      />
      {/* 右边中心 */}
      <div
        style={{
          ...handleStyle,
          top: height / 2 + handleOffset,
          right: handleOffset,
          cursor: "e-resize"
        }}
        onPointerDown={handlePointerDown}
      />
      {/* 下边中心 */}
      <div
        style={{
          ...handleStyle,
          bottom: handleOffset,
          left: width / 2 + handleOffset,
          cursor: "s-resize"
        }}
        onPointerDown={handlePointerDown}
      />
      {/* 左边中心 */}
      <div
        style={{
          ...handleStyle,
          top: height / 2 + handleOffset,
          left: handleOffset,
          cursor: "w-resize"
        }}
        onPointerDown={handlePointerDown}
      />

      {/* 四角控制点 */}
      <div
        style={{ ...handleStyle, top: handleOffset, left: handleOffset, cursor: "nwse-resize" }}
        onPointerDown={handlePointerDown}
      />
      <div
        style={{ ...handleStyle, top: handleOffset, right: handleOffset, cursor: "nesw-resize" }}
        onPointerDown={handlePointerDown}
      />
      <div
        style={{ ...handleStyle, bottom: handleOffset, left: handleOffset, cursor: "nesw-resize" }}
        onPointerDown={handlePointerDown}
      />
      <div
        style={{ ...handleStyle, bottom: handleOffset, right: handleOffset, cursor: "nwse-resize" }}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
};
