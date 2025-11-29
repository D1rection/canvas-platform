import React from "react";
import type { ShapeElement, ViewportState } from "../../schema/model";

interface TriangleShapeProps {
  element: ShapeElement;
  viewport: ViewportState;
  scale: number;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
}

/**
 * 三角形渲染组件
 * - 转换世界坐标 → 屏幕坐标
 */
export const TriangleShape: React.FC<TriangleShapeProps> = ({
  element,
  viewport,
  scale,
  onPointerDown,
}) => {
  const { transform, size, style } = element;

  const left = (transform.x - viewport.x) * scale;
  const top = (transform.y - viewport.y) * scale;
  const width = size.width * scale;
  const height = size.height * scale;

  // 三角形顶点坐标（等腰）
  const points = `
    ${width / 2},0
    ${width},${height}
    0,${height}
  `;

  return (
    <svg
      data-id={element.id}
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        transform: `rotate(${transform.rotation}deg)`,
        transformOrigin: "top left",
        overflow: "visible",
        pointerEvents: "visiblePainted",
      }}
    >
      <polygon
        points={points}
        fill={style.fill}
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth * scale}
      />
    </svg>
  );
};
