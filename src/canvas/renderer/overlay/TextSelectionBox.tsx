import React from "react";
import type { ID } from "../../schema/model";
import { ScaleDirection } from "../../tools/ScaleTool";
import { useSignalPointerDown } from "../../../hooks/useSignalPointerDown";

const THEME_COLOR = "#5ea500";

interface TextSelectionBoxProps {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation?: number;
  id?: ID;
  onRotateHandlePointerDown?: (
    id: ID | undefined,
    e: React.PointerEvent
  ) => void;
  onScaleHandlePointerDown?: (
    id: ID | undefined,
    direction: ScaleDirection,
    e: React.PointerEvent
  ) => void;
  onSelectionBoxPointerDown?: (e: React.PointerEvent<Element>) => void;
  onSelectionBoxDoubleClick?: (id: ID | undefined, e: React.MouseEvent<Element>) => void;
}

/**
 * 文本元素专用的选中框
 * - 使用虚线 + 圆角矩形强调编辑区域
 * - 控制点采用圆形样式，便于辨识文本区域尺寸
 */
export const TextSelectionBox: React.FC<TextSelectionBoxProps> = ({
  left,
  top,
  width,
  height,
  rotation = 0,
  id,
  onRotateHandlePointerDown,
  onScaleHandlePointerDown,
  onSelectionBoxPointerDown,
  onSelectionBoxDoubleClick,
}) => {
  const { handlePointerDown, cancelPending } = useSignalPointerDown(
    onSelectionBoxPointerDown,
    { delay: 250, dragThreshold: 3 }
  );

  const handleSize = 12;
  const handleOffset = -handleSize / 2;
  const rotateControlDistance = 32;
  const rotateLineHeight = rotateControlDistance;
  const sideHitAreaWidth = 8;

  const handleDoubleClick = (e: React.MouseEvent<Element>) => {
    e.stopPropagation();
    cancelPending();
    onSelectionBoxDoubleClick?.(id, e);
  };

  const handleRotatePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRotateHandlePointerDown?.(id, e);
  };

  const handleScalePointerDown = (
    direction: ScaleDirection,
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onScaleHandlePointerDown?.(id, direction, e);
  };

  const cornerHandleStyle: React.CSSProperties = {
    position: "absolute",
    width: handleSize,
    height: handleSize,
    borderRadius: 3,
    backgroundColor: "#fff",
    border: `2px solid ${THEME_COLOR}`,
    boxSizing: "border-box",
    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
  };

  return (
    <div
      data-selection-box="text"
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        border: `2px solid ${THEME_COLOR}`,
        borderRadius: 6,
        boxSizing: "border-box",
        pointerEvents: "auto",
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center",
        backgroundColor: "rgba(94,165,0,0.02)",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* 旋转指示线 */}
      <div
        style={{
          position: "absolute",
          width: 2,
          height: rotateLineHeight,
          backgroundColor: THEME_COLOR,
          left: `calc(50% - 1px)`,
          top: `-${rotateLineHeight}px`,
        }}
      />
      {/* 旋转控制点 */}
      <div
        style={{
          ...cornerHandleStyle,
          left: `calc(50% - ${handleSize / 2}px)`,
          top: `-${rotateControlDistance + handleSize}px`,
          borderRadius: "50%",
          backgroundColor: THEME_COLOR,
          borderColor: "#fff",
          cursor: "grab",
        }}
        onPointerDown={handleRotatePointerDown}
      />

      {/* 左右边缘的宽度缩放区域（不可见，只改变鼠标样式并触发水平缩放） */}
      <div
        style={{
          position: "absolute",
          top: handleSize,
          bottom: handleSize,
          left: -sideHitAreaWidth / 2,
          width: sideHitAreaWidth,
          cursor: "ew-resize",
        }}
        onPointerDown={(e) => handleScalePointerDown(ScaleDirection.LEFT, e)}
      />
      <div
        style={{
          position: "absolute",
          top: handleSize,
          bottom: handleSize,
          right: -sideHitAreaWidth / 2,
          width: sideHitAreaWidth,
          cursor: "ew-resize",
        }}
        onPointerDown={(e) => handleScalePointerDown(ScaleDirection.RIGHT, e)}
      />

      {/* 四角控制点：用于整体缩放文本（包括字号） */}
      <div
        style={{
          ...cornerHandleStyle,
          left: handleOffset,
          top: handleOffset,
          cursor: "nwse-resize",
        }}
        onPointerDown={(e) => handleScalePointerDown(ScaleDirection.TOP_LEFT, e)}
      />
      <div
        style={{
          ...cornerHandleStyle,
          right: handleOffset,
          top: handleOffset,
          cursor: "nesw-resize",
        }}
        onPointerDown={(e) => handleScalePointerDown(ScaleDirection.TOP_RIGHT, e)}
      />
      <div
        style={{
          ...cornerHandleStyle,
          left: handleOffset,
          bottom: handleOffset,
          cursor: "nesw-resize",
        }}
        onPointerDown={(e) => handleScalePointerDown(ScaleDirection.BOTTOM_LEFT, e)}
      />
      <div
        style={{
          ...cornerHandleStyle,
          right: handleOffset,
          bottom: handleOffset,
          cursor: "nwse-resize",
        }}
        onPointerDown={(e) => handleScalePointerDown(ScaleDirection.BOTTOM_RIGHT, e)}
      />

    </div>
  );
};
