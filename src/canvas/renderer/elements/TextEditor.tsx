import React, { useRef, useState, useLayoutEffect } from "react";
import type { TextElement, ViewportState } from "../../schema/model";

interface TextEditorProps {
  element: TextElement;
  viewport: ViewportState;
  scale: number;
  onCommit: (newText: string) => void;
  onCancel?: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  element,
  viewport,
  scale,
  onCommit,
  onCancel,
}) => {
  const { spans, align, lineHeight, transform } = element;
  const initialText = spans.map((s) => s.text).join("");
  const [value, setValue] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const baseStyle = spans[0]?.style || {
    fontSize: 20,
    fontFamily: "Arial",
    color: "#000",
  };

  // 计算屏幕位置
  const screenX = (transform.x - viewport.x) * scale;
  const screenY = (transform.y - viewport.y) * scale;

  // 自动调整高度
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [value, scale]);

  // 处理提交
  const handleBlur = () => {
    if (value !== initialText) {
      onCommit(value);
    } else {
      onCancel?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 阻止事件冒泡，防止触发画布的删除/撤销快捷键
    e.stopPropagation(); 
    
    // Command + Enter 或 Ctrl + Enter 提交
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      textareaRef.current?.blur();
    }
    // Esc 取消
    if (e.key === "Escape") {
      setValue(initialText); // 还原
      onCancel?.();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      autoFocus
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        // 关键：样式必须与 TextElement 严格对齐
        transformOrigin: "0 0",
        // transform: `rotate(${transform.rotation}rad)`, // MVP 暂不处理编辑态旋转
        fontFamily: baseStyle.fontFamily,
        fontSize: baseStyle.fontSize * scale,
        color: baseStyle.color,
        lineHeight: lineHeight,
        textAlign: align,
        background: "transparent",
        border: "1px solid #01090eff", // 编辑时的聚焦边框
        outline: "none",
        padding: "2px 4px", // 与 TextElement padding 保持一致
        margin: 0,
        resize: "none",
        overflow: "hidden",
        whiteSpace: "pre-wrap",
        width: "max-content", // 或固定宽度，视需求而定
        minWidth: "10px",
        zIndex: 9999, // 确保在最上层
      }}
    />
  );
};