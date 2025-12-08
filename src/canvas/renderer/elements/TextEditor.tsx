import React, { useEffect, useRef, useState } from "react";
import type { TextElement, ViewportState } from "../../schema/model";

interface TextEditorProps {
  element: TextElement;
  viewport: ViewportState;
  scale: number;
  onCommit: (newText: string) => void;
  onCancel?: () => void;
  isEditing?: boolean;
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
  const editorRef = useRef<HTMLDivElement>(null);

  const baseStyle = spans[0]?.style || {
    fontSize: 20,
    fontFamily: "Arial",
    color: "#000",
  };

  const screenX = (transform.x - viewport.x) * scale;
  const screenY = (transform.y - viewport.y) * scale;

  const handleBlur = () => {
    if (value !== initialText) {
      onCommit(value);
    } else {
      onCancel?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      editorRef.current?.blur();
    }
    if (e.key === "Escape") {
      setValue(initialText);
      onCancel?.();
    }
  };

  const stopPointerPropagation = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation?.();
  };

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerText !== value) {
      editorRef.current.innerText = value;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setValue(e.currentTarget.innerText);
  };

  return (
    <div
      ref={editorRef}
      id={element.id}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPointerDownCapture={stopPointerPropagation}
      onPointerMoveCapture={stopPointerPropagation}
      onPointerUpCapture={stopPointerPropagation}
      onPointerCancelCapture={stopPointerPropagation}
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        transformOrigin: "0 0",
        transform: `rotate(${transform.rotation}rad)`,
        fontFamily: baseStyle.fontFamily,
        fontSize: baseStyle.fontSize * scale,
        color: baseStyle.color,
        lineHeight: lineHeight,
        textAlign: align,
        background: "rgba(94, 165, 0, 0.02)",
        outline: "2px solid #5ea500",
        outlineOffset: "-1px",
        borderRadius: 0,
        padding: "2px 4px",
        margin: 0,
        boxSizing: "border-box",
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        width: `${element.size.width * scale}px`,
        zIndex: 9999,
      }}
    />
  );
};
