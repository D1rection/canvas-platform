import React, { useState } from "react";
import type { ShapeElement, ViewportState } from "../../schema/model";

interface CircleShapeProps {
  element: ShapeElement;
  viewport: ViewportState;
  scale: number;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  isSelected: boolean;
  isHovered?: boolean; // 可选属性，外部可以提供hover状态
}

/**
 * 圆形渲染组件
 * - 类似 RectShape，但使用 borderRadius 实现圆形
 */
export const CircleShape: React.FC<CircleShapeProps> = React.memo(({
  element,
  viewport,
  scale,
  onPointerDown,
  isSelected,
  isHovered: externalHovered
}) => {
  const { transform, size, style } = element;
  // 使用内部状态管理hover，但优先使用外部传入的hover状态
  const [internalIsHovered, setInternalIsHovered] = useState(false);
  const isHovered = externalHovered !== undefined ? externalHovered : internalIsHovered;
  
  const left = (transform.x - viewport.x) * scale;
  const top = (transform.y - viewport.y) * scale;
  const width = size.width * scale;
  const height = size.height * scale;

    // 圆形使用宽高一致：取最小值，保持圆形比例
    const diameter = Math.min(width, height);

    const hoverOutlineWidth = 2 * scale;

  return (
    <div
      data-id={element.id}
      onPointerDown={onPointerDown}
      onPointerEnter={() => setInternalIsHovered(true)}
      onPointerLeave={() => setInternalIsHovered(false)}
      style={{
        position: "absolute",
        left,
        top,
        width: diameter,
        height: diameter,
        backgroundColor: style.fill,
        borderStyle: "solid",
        borderColor: style.strokeColor,
        borderWidth: style.strokeWidth * scale,
        borderRadius: "50%", // 关键：圆形
        boxSizing: "border-box",
        transform: `rotate(${transform.rotation}deg)`,
        transformOrigin: "center",
        outline: (isHovered && !isSelected)
          ? `${hoverOutlineWidth}px solid #5da500d8`
          : "none",
        opacity: element.opacity ?? 1,
      }}
    />
  );
});
