import React from "react";
import { type ViewportState, type TextElement as TextElementModel } from "../../schema/model";

interface TextElementProps {
  element: TextElementModel;
  viewport: ViewportState;
  scale: number;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  // 新增 props
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void; 
}

export const TextElement: React.FC<TextElementProps> = ({ 
  element, 
  viewport, 
  scale,
  onPointerDown, // 确保接收这个 prop
  onDoubleClick 
}) => {
  if (!element.visible) return null;

  const { spans, align, lineHeight, transform } = element;

  const screenX = (transform.x - viewport.x) * scale;
  const screenY = (transform.y - viewport.y) * scale;

  return (
    <div
      data-id={element.id} // 添加data-id属性，以便DragTool能找到DOM元素
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick} // 绑定双击事件
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        lineHeight: lineHeight, // 注意：TextEditor 使用的是 fontSize * scale，这里是否需要统一单位？
        // 修正：通常 line-height 如果是无单位数字（如 1.5），会继承 fontSize。
        // 但为了渲染一致性，建议显式计算或者确保 CSS 继承关系正确。
        
        textAlign: align,
        cursor: "default", // 编辑前是 default，不是 text，直到双击
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        padding: "2px 4px", // 这里的 padding 必须和 Editor 一致
        pointerEvents: "auto",
        userSelect: "none",
        // 关键优化：支持旋转，确保视觉一致
        transform: `rotate(${transform.rotation}rad)`,
        transformOrigin: "0 0", // 保持旋转原点一致
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