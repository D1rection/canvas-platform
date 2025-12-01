import React, { useState } from "react";
import type { ShapeElement, ViewportState } from "../../schema/model";

interface TriangleShapeProps {
  element: ShapeElement;
  viewport: ViewportState;
  scale: number;
  onPointerDown?: React.PointerEventHandler<SVGSVGElement>;
  isSelected: boolean;
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
  isSelected,
}) => {
  const { transform, size, style } = element;
  const [isHovered, setIsHovered] = useState(false);
  const left = (transform.x - viewport.x) * scale;
  const top = (transform.y - viewport.y) * scale;
  const width = size.width * scale;
  const height = size.height * scale;

  // 三角形顶点坐标（等腰）
  // 本地坐标系下的三角形顶点（等腰三角形）
  const points = `${width / 2},0 ${width},${height} 0,${height}`;
  const hoverStrokeWidth = 3 * scale;

  return (
    <svg
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
        transform: `rotate(${transform.rotation}deg)`,
        transformOrigin: "top left",
        overflow: "visible",
        pointerEvents: "visiblePainted",
        clipPath: "polygon(50% 0, 0 100%, 100% 100%)",
      }}
    >
      {/* 主体三角形：填充 + 基础描边（选中态可复用 style.strokeColor） */}
      <polygon
        points={points}
        fill={style.fill}
        stroke={style.strokeColor}
        strokeWidth={2 * style.strokeWidth * scale}
      />
      {/* Hover 高亮：沿三角边绘制一层额外描边，仅在 hover 且未选中时显示 */}
      {isHovered && !isSelected && (
        <polygon
          points={points}
          fill="none"
          stroke="#5da500d8"
          strokeWidth={hoverStrokeWidth}
        />
      )}
    </svg>
  );
};
