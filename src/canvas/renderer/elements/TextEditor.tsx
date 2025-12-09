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
  isEditing = true,
}) => {
  const { spans, align, lineHeight, transform } = element;

  const initialText = spans.map((s) => s.text).join("");
  const [value, setValue] = useState(initialText);
  const editorRef = useRef<HTMLDivElement>(null);
  const hasSelectedOnceRef = useRef(false);

  const baseStyle = spans[0]?.style || {
    fontSize: 20,
    fontFamily: "SimSun",
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

  // 同步内容并在进入编辑态时抢焦点
  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;

    // 保证 DOM 中的内容和内部状态一致
    if (node.innerText !== value) {
      node.innerText = value;
    }

    // 只要处于编辑状态，就确保光标在文本编辑器上
    if (isEditing) {
      // 下一帧再 focus，避免和其他同步事件抢焦点
      requestAnimationFrame(() => {
        node.focus();

        // 首次进入编辑时，全选当前文本内容
        if (!hasSelectedOnceRef.current && typeof window !== "undefined") {
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(node);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          hasSelectedOnceRef.current = true;
        }
      });
    }
  }, [isEditing, value]);

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
        transformOrigin: "center",
        transform: `rotate(${transform.rotation}deg)`,
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
