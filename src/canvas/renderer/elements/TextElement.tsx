import React, { useLayoutEffect, useRef } from "react";
import { type ViewportState, type TextElement as TextElementModel } from "../../schema/model";

interface TextElementProps {
  element: TextElementModel;
  viewport: ViewportState;
  scale: number;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  // 新增 props
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void; 
  onMeasuredHeight?: (id: string, height: number) => void;
}

export const TextElement: React.FC<TextElementProps> = ({ 
  element, 
  viewport, 
  scale,
  onPointerDown, // 确保接收这个 prop
  onDoubleClick,
  onMeasuredHeight,
}) => {
  if (!element.visible) return null;

  const { spans, align, lineHeight, transform } = element;
  const containerRef = useRef<HTMLDivElement>(null);

  const screenX = (transform.x - viewport.x) * scale;
  const screenY = (transform.y - viewport.y) * scale;
  const width = element.size.width * scale;

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const measuredHeight = rect.height / scale;
    if (Number.isFinite(measuredHeight)) {
      const delta = Math.abs(measuredHeight - element.size.height);
      if (delta > 0.5) {
        onMeasuredHeight?.(element.id, measuredHeight);
      }
    }
  }, [
    element.id,
    element.size.height,
    element.size.width,
    element.spans,
    align,
    lineHeight,
    scale,
    onMeasuredHeight,
  ]);

  return (
    <div
      ref={containerRef}
      data-id={element.id}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        width,
        height: "auto",
        pointerEvents: "auto",
        overflow: "visible",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          lineHeight,
          textAlign: align,
          cursor: "default",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          padding: "2px 4px",
          userSelect: "none",
          transform: `rotate(${transform.rotation}deg)`,
          transformOrigin: "center",
        }}
      >
        {spans.map((span, index) => {
          
          // 创建基础样式
          const baseStyle: React.CSSProperties = {
            fontFamily: span.style.fontFamily,
            fontSize: span.style.fontSize * scale,
            color: span.style.color,
            background: span.style.background,
            fontWeight: span.style.bold ? "bold" : "normal",
            textDecoration: span.style.decorations?.join(" "),
          };

          // 如果是斜体，统一使用 CSS transform 来实现一致的倾斜
          // 不再使用 fontStyle: "italic"，因为不同字体的斜体倾斜程度不同
          const italicStyle: React.CSSProperties = span.style.italic ? {
            // 关键修改：不再使用 fontStyle: "italic"
            // fontStyle: "normal", // 明确设置为 normal，防止浏览器应用默认斜体
            display: "inline-block",
            // 增大倾斜角度到 -15deg，获得更明显的斜体效果
            transform: "skewX(-15deg)",
            transformOrigin: "center",
          } : {};

          return (
            <span
              key={index}
              style={{
                ...baseStyle,
                ...italicStyle,
              }}
            >
              {span.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};