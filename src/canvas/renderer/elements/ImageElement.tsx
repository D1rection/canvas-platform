import React from "react";
import type { ImageElement as ImageElementModel } from "../../schema/model";
import type { ViewportState } from "../../schema/model";

export interface ImageElementProps {
  element: ImageElementModel;
  viewport: ViewportState;
  scale: number;
  onPointerDown?: (e: React.PointerEvent<HTMLImageElement>) => void;
}

export const ImageElement: React.FC<ImageElementProps> = ({
  element,
  viewport,
  scale,
  onPointerDown,
}) => {
  if (!element.visible) return null;

  const { src, size, filters, transform } = element;

  const screenX = (transform.x - viewport.x) * scale;
  const screenY = (transform.y - viewport.y) * scale;
  const screenW = size.width * scale * transform.scaleX;
  const screenH = size.height * scale * transform.scaleY;

  const filterCSS = filters?.map(f => `${f.type}(${f.value})`).join(" ") ?? "none";

  return (
    <img
      src={src}
      alt=""
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
      onPointerDown={onPointerDown}
    />
  );
};
