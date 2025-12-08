import React, { useState, useRef, useEffect } from "react";
import type {
  CanvasElement,
  ID,
  TextElement,
  ViewportState,
} from "../../../canvas/schema/model";
import { ColorPicker } from "../ColorPicker";
import { FontFamilyControl } from "./controls/FontFamilyControl";
import { FontSizeControl } from "./controls/FontSizeControl";
import { TextStyleControls } from "./controls/TextStyleControls";
import { TextEditProvider } from "./contexts/TextEditContext";
import { useTextFormat } from "./hooks/useTextFormat";
import styles from "./TextEditor.module.css";

interface TextEditorProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
  viewport?: ViewportState;
  isEditing?: boolean;
  editingElementId?: string;
}

const TextEditorImpl: React.FC<TextEditorProps> = ({
  element,
  onUpdateElement,
  viewport,
  isEditing = false,
  editingElementId,
}) => {
  const textElement = element as TextElement;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [measuredSize, setMeasuredSize] = useState({ width: 500, height: 50 });

  // 使用自定义hook处理文本格式化
  const {
    currentStyle,
    handleFontFamilyChange,
    handleFontSizeChange,
    handleToggleBold,
    handleToggleItalic,
    handleToggleUnderline,
  } = useTextFormat({ element: textElement, onUpdateElement });

  // 获取元素在屏幕上的边界
  const getElementBounds = () => {
    if (!textElement.transform) {
      return { x: 0, y: 0, width: 100, height: 50 };
    }

    // 获取视口参数
    const viewportScale = viewport?.scale || 1;
    const viewportX = viewport?.x || 0;
    const viewportY = viewport?.y || 0;

    // 元素的原始坐标和变换
    const elementX = textElement.transform.x;
    const elementY = textElement.transform.y;
    const elementScaleX = textElement.transform.scaleX || 1;
    const elementScaleY = textElement.transform.scaleY || 1;

    // 计算文本元素的尺寸（这里简化处理，实际应用中可能需要更精确的计算）
    let width = 200;
    let height = 50;

    // 应用元素自身的缩放比例
    width *= elementScaleX;
    height *= elementScaleY;

    // 将坐标转换为屏幕坐标系（考虑视口平移与缩放）
    const screenX = (elementX - viewportX) * viewportScale;
    const screenY = (elementY - viewportY) * viewportScale;
    const screenWidth = width * viewportScale;
    const screenHeight = height * viewportScale;

    // 返回在屏幕坐标系中的元素边界
    return {
      x: screenX,
      y: screenY,
      width: screenWidth,
      height: screenHeight,
    };
  };

  // 计算工具栏位置，与其他工具栏保持一致的定位逻辑
  const getToolbarPosition = (tw: number, th: number) => {
    const bounds = getElementBounds();

    const toolbarWidth = Math.max(1, Math.floor(tw));
    const toolbarHeight = Math.max(1, Math.floor(th));

    const margin = 10;
    const containerWidth =
      typeof window !== "undefined" ? window.innerWidth : 1000;
    const containerHeight =
      typeof window !== "undefined" ? window.innerHeight : 600;
    const elementGap = 40;
    const avoidPadding = 10;

    // 边界检查函数
    const clampX = (x: number) =>
      Math.max(margin, Math.min(x, containerWidth - toolbarWidth - margin));
    const clampY = (y: number) =>
      Math.max(margin, Math.min(y, containerHeight - toolbarHeight - margin));

    // 矩形重叠检测
    const overlaps = (
      r1: { left: number; top: number; right: number; bottom: number },
      r2: { left: number; top: number; right: number; bottom: number }
    ) => {
      return !(
        r1.right < r2.left ||
        r1.left > r2.right ||
        r1.bottom < r2.top ||
        r1.top > r2.bottom
      );
    };

    // 计算理想位置
    const desiredLeft = bounds.x + bounds.width / 2 - toolbarWidth / 2;
    const gapY = elementGap + avoidPadding;
    const aboveTop = bounds.y - toolbarHeight - gapY;
    const belowTop = bounds.y + bounds.height + gapY;

    const withinY = (y: number) =>
      y >= margin && y + toolbarHeight <= containerHeight - margin;

    // 1) 优先上方
    if (withinY(aboveTop)) {
      return { top: aboveTop, left: clampX(desiredLeft) };
    }

    // 2) 其次下方
    if (withinY(belowTop)) {
      return { top: belowTop, left: clampX(desiredLeft) };
    }

    // 3) 左/右兜底
    const leftTop = clampY(bounds.y + bounds.height / 2 - toolbarHeight / 2);
    const tryLeft = () => {
      const left = bounds.x - toolbarWidth - elementGap;
      if (left >= margin) {
        const rect = {
          left,
          top: leftTop,
          right: left + toolbarWidth,
          bottom: leftTop + toolbarHeight,
        };
        const target = {
          left: bounds.x - avoidPadding,
          top: bounds.y - avoidPadding,
          right: bounds.x + bounds.width + avoidPadding,
          bottom: bounds.y + bounds.height + avoidPadding,
        };
        if (!overlaps(rect, target)) return { top: leftTop, left };
      }
      return null;
    };

    const tryRight = () => {
      const left = bounds.x + bounds.width + elementGap;
      if (left + toolbarWidth <= containerWidth - margin) {
        const rect = {
          left,
          top: leftTop,
          right: left + toolbarWidth,
          bottom: leftTop + toolbarHeight,
        };
        const target = {
          left: bounds.x - avoidPadding,
          top: bounds.y - avoidPadding,
          right: bounds.x + bounds.width + avoidPadding,
          bottom: bounds.y + bounds.height + avoidPadding,
        };
        if (!overlaps(rect, target)) return { top: leftTop, left };
      }
      return null;
    };

    const leftPos = tryLeft();
    if (leftPos) return leftPos;

    const rightPos = tryRight();
    if (rightPos) return rightPos;

    // 4) 最后一招：选择重叠面积更小的一侧
    const clampAbove = clampY(aboveTop);
    const clampBelow = clampY(belowTop);
    const rectAbove = {
      left: clampX(desiredLeft),
      top: clampAbove,
      right: clampX(desiredLeft) + toolbarWidth,
      bottom: clampAbove + toolbarHeight,
    };
    const rectBelow = {
      left: clampX(desiredLeft),
      top: clampBelow,
      right: clampX(desiredLeft) + toolbarWidth,
      bottom: clampBelow + toolbarHeight,
    };
    const target = {
      left: bounds.x - avoidPadding,
      top: bounds.y - avoidPadding,
      right: bounds.x + bounds.width + avoidPadding,
      bottom: bounds.y + bounds.height + avoidPadding,
    };

    const area = (r: any) =>
      Math.max(
        0,
        Math.min(r.right, target.right) - Math.max(r.left, target.left)
      ) *
      Math.max(
        0,
        Math.min(r.bottom, target.bottom) - Math.max(r.top, target.top)
      );
    const aboveOverlap = area(rectAbove);
    const belowOverlap = area(rectBelow);

    if (aboveOverlap <= belowOverlap) {
      return { top: clampAbove, left: clampX(desiredLeft) };
    }

    return { top: clampBelow, left: clampX(desiredLeft) };
  };

  const position = getToolbarPosition(measuredSize.width, measuredSize.height);

  // 测量工具栏尺寸
  useEffect(() => {
    if (!toolbarRef.current) return;

    const updateSize = () => {
      const rect = toolbarRef.current!.getBoundingClientRect();
      setMeasuredSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    // 初始测量
    updateSize();

    // 监听窗口大小变化
    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, [currentStyle.fontFamily, currentStyle.fontSize]);

  // 在元素位置或视口变化时更新工具栏位置
  useEffect(() => {
    if (!toolbarRef.current) return;

    // 当元素位置或视口变化时，重新测量工具栏尺寸以触发位置更新
    const rect = toolbarRef.current.getBoundingClientRect();
    setMeasuredSize({
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
  }, [textElement.transform, viewport, isEditing]);

  // 阻止事件冒泡
  const handleToolbarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 工具栏样式 - 与其他元素工具栏保持一致的隐藏逻辑
  // 当处于拖动、缩放或旋转操作时隐藏，在文本内容编辑时保持可见
  // 工具栏样式
  // 当处于文本内容编辑状态时（editingElementId 与当前元素 id 匹配），工具栏保持可见
  // 当处于其他编辑操作（如拖动、缩放、旋转）时，工具栏隐藏
  const toolbarStyle: React.CSSProperties = {
    top: `${position.top}px`,
    left: `${position.left}px`,
    opacity: isEditing && editingElementId !== element.id ? 0 : 1,
    pointerEvents: isEditing && editingElementId !== element.id ? "none" : "auto",
    transition: "opacity 0.2s ease-in-out",
  };

  return (
    <div
      ref={toolbarRef}
      className={styles.toolbarWrapper}
      onClick={handleToolbarClick}
      style={toolbarStyle}
      data-toolbar-element="true"
    >
      {/* 字体样式选择 */}
      <FontFamilyControl
        fontFamily={currentStyle.fontFamily}
        onFontFamilyChange={handleFontFamilyChange}
      />

      {/* 字体大小调整 */}
      <FontSizeControl
        fontSize={currentStyle.fontSize}
        onFontSizeChange={handleFontSizeChange}
      />

      {/* 文本格式化按钮组 */}
      <TextStyleControls
        isBold={currentStyle.bold || false}
        isItalic={currentStyle.italic || false}
        isUnderlined={currentStyle.decorations?.includes("underline") || false}
        onToggleBold={handleToggleBold}
        onToggleItalic={handleToggleItalic}
        onToggleUnderline={handleToggleUnderline}
      />

      {/* 文本颜色选择 */}
      <ColorPicker
        element={textElement}
        onUpdateElement={(id, updates) => {
          // 直接将ColorPicker返回的更新应用到文本元素
          onUpdateElement(id, updates);
        }}
      />
    </div>
  );
};

// 使用Context Provider包装组件
export const TextEditor: React.FC<TextEditorProps> = (props) => {
  return (
    <TextEditProvider value={{ isEditing: props.isEditing }}>
      <TextEditorImpl {...props} />
    </TextEditProvider>
  );
};

// 导出原始实现用于测试/高级使用
export { TextEditorImpl };