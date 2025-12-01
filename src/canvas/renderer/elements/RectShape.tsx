import React, { useState } from "react";
import type { ShapeElement, ViewportState } from "../../schema/model";

interface RectShapeProps {
  element: ShapeElement;
  viewport: ViewportState;
  scale: number;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  isSelected: boolean;
}

/**
 * 矩形形状渲染组件
 * - 负责将 ShapeElement(rect) 从场景坐标转换为 DOM 坐标并渲染
 */
export const RectShape: React.FC<RectShapeProps> = ({
  element,
  viewport,
  scale,
  onPointerDown,
  isSelected,
}) => {
  const { transform, size, style } = element;
  const [isHovered, setIsHovered] = useState(false);

  const left = (transform.x - viewport.x) * scale;
  const top = (transform.y - viewport.y) * scale;
  const width = size.width * scale;
  const height = size.height * scale;

  const hoverOutlineWidth = 2 * scale;

  return (
    <div
      data-id={element.id}
      onPointerDown={onPointerDown}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        backgroundColor: style.fill,
        borderStyle: "solid",
        borderColor: style.strokeColor,
        borderWidth: style.strokeWidth * scale,
        boxSizing: "border-box",
        transform: `rotate(${transform.rotation}deg)`,
        transformOrigin: "top left",
        opacity: element.opacity ?? 1, // 应用元素透明度，默认为1
        outline:
          isHovered && !isSelected
            ? `${hoverOutlineWidth}px solid #5da500d8`
            : "none",
        borderRadius: style.cornerRadius
          ? `${style.cornerRadius * scale}px`
          : "0px",
      }}
    />
  );
};
