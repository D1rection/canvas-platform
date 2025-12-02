import React from "react";
import { type ViewportState, type ImageElement as ImageElementModel } from "../../schema/model";

/**
 * 图片元素的渲染组件
 */
export const ImageElement: React.FC<{
  element: ImageElementModel;
  viewport: ViewportState;
  scale: number;
  onPointerDown?: React.PointerEventHandler<HTMLImageElement>;
}> = ({ element, viewport, scale, onPointerDown }) => {
  if (!element.visible) return null;

  const { src, size, filters, transform } = element;

  // 根据视口和缩放计算屏幕上的位置和尺寸
  const screenX = (transform.x - viewport.x) * scale;
  const screenY = (transform.y - viewport.y) * scale;
  const screenW = size.width * scale * transform.scaleX;
  const screenH = size.height * scale * transform.scaleY;

  const filterCSS = filters?.map(f => `${f.type}(${f.value})`).join(" ") ?? "none";

  // 阻止图片的默认拖拽行为
  const handleDragStart = (e: React.DragEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  return (
    <img
      data-id={element.id}
      src={src}
      alt=""
      draggable={false}
      onDragStart={handleDragStart}
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        transform: `rotate(${transform.rotation}deg)`,
        transformOrigin: "center",
        filter: filterCSS,
        pointerEvents: "auto",
        userSelect: "none",
      }}
    />
  );
};
