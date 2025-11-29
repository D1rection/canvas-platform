import React from "react";
import type { ShapeElement, ViewportState } from "../../schema/model";

interface RectShapeProps {
  element: ShapeElement;
  viewport: ViewportState;
  scale: number;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
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
}) => {
  const { transform, size, style } = element;

  const left = (transform.x - viewport.x) * scale;
  const top = (transform.y - viewport.y) * scale;
  const width = size.width * scale;
  const height = size.height * scale;

  return (
    <div
      data-id={element.id}
      onPointerDown={onPointerDown}
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
      }}
    />
  );
};
