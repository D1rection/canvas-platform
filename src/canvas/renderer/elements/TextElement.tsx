import React from "react";
import { type ViewportState, type TextElement as TextElementModel } from "../../schema/model";

export const TextElement: React.FC<{
  element: TextElementModel;
  viewport: ViewportState;
  scale: number;
}> = ({ element, viewport, scale }) => {
  if (!element.visible) return null;

  const { spans, align, lineHeight, transform } = element;

  // 计算文本框的位置
  const screenX = (transform.x - viewport.x) * scale;
  const screenY = (transform.y - viewport.y) * scale;

  return (
    <div
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        lineHeight: lineHeight * scale,
        textAlign: align,
        cursor: "text",
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        padding: "2px 4px",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      {spans.map((span, index) => (
        <span
          key={index}
          style={{
            fontFamily: span.style.fontFamily,
            fontSize: span.style.fontSize * scale,
            color: span.style.color,
            background: span.style.background,
            fontWeight: span.style.bold ? "bold" : "normal",
            fontStyle: span.style.italic ? "italic" : "normal",
            textDecoration: span.style.decorations?.join(" "),
          }}
        >
          {span.text}
        </span>
      ))}
    </div>
  );
};
