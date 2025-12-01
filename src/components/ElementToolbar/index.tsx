import React, { useState, useRef, useEffect } from "react";
import { ColorPicker } from "./ColorPicker";
import { BorderColorPicker } from "./BorderColorPicker"; // 引入边框颜色选择器
import { OpacitySlider } from "./OpacitySlider";
import { BorderWidthControl } from "./BorderWidthControl"; // 引入边框宽度控制
import { CornerRadiusControl } from "./CornerRadiusControl"; // 引入圆角控制
import type {
  ID,
  CanvasElement,
} from "../../canvas/schema/model";
import styles from "./ElementToolbar.module.css";

interface ElementToolbarProps {
  element: CanvasElement;
  // viewport 参数已移除，不再使用
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

// Error Boundary Component
class ElementToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ElementToolbar error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Silently fail without rendering the toolbar
    }
    return this.props.children;
  }
}

const ElementToolbarImpl: React.FC<ElementToolbarProps> = ({
  element,
  // Removed unused viewport parameter
  onUpdateElement,
}) => {
  const [toolbarOffset, setToolbarOffset] = useState({ x: 0, y: 0 });
  const [isToolbarDragging, setIsToolbarDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 处理工具栏拖拽开始
  const handleToolbarDragStart = (e: React.MouseEvent) => {
    // 只有在点击工具栏背景区域时才允许拖拽
    if (e.target === toolbarRef.current) {
      setIsToolbarDragging(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      // 防止选择文本
      e.preventDefault();
      e.stopPropagation(); // 阻止冒泡到画布
    }
  };

  // 处理工具栏拖拽移动
  const handleToolbarDragMove = (e: MouseEvent) => {
    if (isToolbarDragging) {
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      setToolbarOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setDragStartPos({ x: e.clientX, y: e.clientY });
    }
  };

  // 处理工具栏拖拽结束
  const handleToolbarDragEnd = () => {
    setIsToolbarDragging(false);
  };

  // 添加和移除拖拽相关的事件监听器
  useEffect(() => {
    if (isToolbarDragging) {
      document.addEventListener("mousemove", handleToolbarDragMove);
      document.addEventListener("mouseup", handleToolbarDragEnd);

      if (document.body) {
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
    }

    return () => {
      document.removeEventListener("mousemove", handleToolbarDragMove);
      document.removeEventListener("mouseup", handleToolbarDragEnd);

      if (document.body) {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };
  }, [isToolbarDragging, dragStartPos]);

  // 计算工具栏位置（优化定位系统：优先下方显示，避免遮挡元素）
  const getToolbarPosition = () => {
    if (!element || !element.transform) {
      // 如果没有元素，默认显示在视口顶部
      return { top: 10, left: 10 };
    }

    const toolbarWidth = 300;
    const toolbarHeight = 80;
    const margin = 10;
    const containerWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
    const containerHeight = typeof window !== "undefined" ? window.innerHeight : 600;
    
    // 获取元素在屏幕上的位置和大小
    const elementX = element.transform.x;
    const elementY = element.transform.y;
    
    // 安全地获取元素尺寸信息，处理不同类型的元素
    let elementWidth = 100; // 默认宽度
    let elementHeight = 100; // 默认高度
    
    // 检查元素类型并获取相应的尺寸信息
    if ('shape' in element && element.shape) {
      // 对于形状元素，尝试获取尺寸相关属性
      if ('width' in element) {
        elementWidth = Number(element.width) || 100;
      } else if ('radius' in element) {
        // 对于圆形等可能使用radius的元素
        elementWidth = elementHeight = (Number(element.radius) || 50) * 2;
      }
      if ('height' in element) {
        elementHeight = Number(element.height) || 100;
      }
    }
    
    // 计算元素的各种位置信息
    const elementCenterX = elementX + elementWidth / 2;
    const elementCenterY = elementY + elementHeight / 2;
    const elementTop = elementY;
    const elementBottom = elementY + elementHeight;
    const elementLeft = elementX;
    const elementRight = elementX + elementWidth;
    
    // 计算元素周围的可用空间
    const spaceAboveElement = elementTop - margin;
    const spaceBelowElement = containerHeight - elementBottom - margin;
    const spaceLeftElement = elementLeft - margin;
    const spaceRightElement = containerWidth - elementRight - margin;
    
    // 初始化工具栏位置变量
    let finalTop, finalLeft;
    
    // 优化优先级：优先下方显示，避免遮挡元素
    // 1. 优先下方显示（确保不遮挡元素）
    if (spaceBelowElement > toolbarHeight) {
      // 下方有足够空间
      finalTop = elementBottom + margin;
      finalLeft = elementCenterX - toolbarWidth / 2;
    } else if (spaceAboveElement > toolbarHeight) {
      // 2. 只有当下方空间不足且上方空间充足时，才显示在上方
      finalTop = elementTop - toolbarHeight - margin;
      finalLeft = elementCenterX - toolbarWidth / 2;
    } else if (spaceLeftElement > toolbarWidth) {
      // 3. 左侧有足够空间
      finalTop = elementCenterY - toolbarHeight / 2;
      finalLeft = elementLeft - toolbarWidth - margin;
    } else if (spaceRightElement > toolbarWidth) {
      // 4. 右侧有足够空间
      finalTop = elementCenterY - toolbarHeight / 2;
      finalLeft = elementRight + margin;
    } else {
      // 5. 所有方向都没有理想空间，优先显示在底部避免遮挡
      finalTop = Math.max(margin, containerHeight - toolbarHeight - margin);
      finalLeft = elementCenterX - toolbarWidth / 2;
    }
    
    // 添加用户拖拽偏移
    finalTop += toolbarOffset.y;
    finalLeft += toolbarOffset.x;
    
    // 应用最终边界检查，确保工具栏完全在视口内
    finalLeft = Math.max(margin, Math.min(finalLeft, containerWidth - toolbarWidth - margin));
    finalTop = Math.max(margin, Math.min(finalTop, containerHeight - toolbarHeight - margin));
    
    return { top: finalTop, left: finalLeft };
  };

  const position = getToolbarPosition();



  // 阻止所有内部事件冒泡到画布
  const handleToolbarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Add additional safety checks before rendering
  if (!element) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      className={styles.toolbarWrapper}
      onClick={handleToolbarClick}
      onMouseDown={handleToolbarDragStart}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        cursor: isToolbarDragging ? "grabbing" : "grab",
      }}
      data-toolbar-element="true"
    >
      {/* 颜色选择器 */}
      <ColorPicker element={element} onUpdateElement={onUpdateElement} />

      {/* 边框颜色选择器 */}
      <BorderColorPicker element={element} onUpdateElement={onUpdateElement} />
      
      {/* 边框宽度控制 */}
      <BorderWidthControl element={element} onUpdateElement={onUpdateElement} />
      {/* 圆角控制 */}
      <CornerRadiusControl
        element={element}
        onUpdateElement={onUpdateElement}
      />
      {/* 透明度调节 */}
      <OpacitySlider element={element} onUpdateElement={onUpdateElement} />
    </div>
  );
};
// Export wrapped component with error boundary
export default function ElementToolbar(props: ElementToolbarProps) {
  return (
    <ElementToolbarErrorBoundary>
      <ElementToolbarImpl {...props} />
    </ElementToolbarErrorBoundary>
  );
}

// Export original implementation for testing/advanced usage
export { ElementToolbarImpl };
