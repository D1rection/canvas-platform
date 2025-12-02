import { ColorPicker } from "./ColorPicker";
import { BorderColorPicker } from "./BorderColorPicker"; // 引入边框颜色选择器
import { OpacitySlider } from "./OpacitySlider";
import { BorderWidthControl } from "./BorderWidthControl"; // 引入边框宽度控制
import { CornerRadiusControl } from "./CornerRadiusControl"; // 引入圆角控制
import type {
  ID,
  CanvasElement,
  ShapeElement,
} from "../../canvas/schema/model";
import styles from "./ElementToolbar.module.css";
import React from "react";

interface ElementToolbarProps {
  element: CanvasElement; // 保持向后兼容，用于单个元素选择
  elements?: CanvasElement[]; // 新增：多个选中的元素
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
  elements = [],
  onUpdateElement,
}) => {
  // 如果提供了elements数组，优先使用它；否则使用单个element作为数组
  const selectedElements = elements.length > 0 ? elements : [element];

  // 检查是否所有选中的元素都是矩形
  const allElementsAreRectangles = selectedElements.every(
    (el) => el.type === "shape" && (el as ShapeElement).shape === "rect"
  );

  // 注意：这个函数暂时未使用，但保留以备将来需要
  // const getCommonPropertyValue = <T extends keyof CanvasElement>(property: T): CanvasElement[T] | null => {
  //   if (selectedElements.length === 0) return null;
  //
  //   const firstValue = selectedElements[0][property];
  //   if (selectedElements.every(el => el[property] === firstValue)) {
  //     return firstValue;
  //   }
  //   return null;
  // };

  // 批量更新选中的元素
  const batchUpdateElements = (updates: Partial<CanvasElement>) => {
    selectedElements.forEach((el) => {
      onUpdateElement(el.id, updates);
    });
  };
  // 计算工具栏位置（优化定位系统：优先下方显示，避免遮挡元素）
  const getToolbarPosition = () => {
    // 对于多个选中的元素，使用第一个元素来定位
    const targetElement = selectedElements[0];

    if (!targetElement || !targetElement.transform) {
      // 如果没有元素，默认显示在视口顶部
      return { top: 10, left: 10 };
    }

    const toolbarWidth = 300;
    const toolbarHeight = 80;
    const margin = 10;
    const containerWidth =
      typeof window !== "undefined" ? window.innerWidth : 1000;
    const containerHeight =
      typeof window !== "undefined" ? window.innerHeight : 600;

    // 获取元素在屏幕上的位置和大小
    const elementX = targetElement.transform.x;
    const elementY = targetElement.transform.y;

    // 安全地获取元素尺寸信息，处理不同类型的元素
    let elementWidth = 100; // 默认宽度
    let elementHeight = 100; // 默认高度

    // 检查元素类型并获取相应的尺寸信息
    if ("shape" in targetElement && targetElement.shape) {
      // 对于形状元素，尝试获取尺寸相关属性
      if ("width" in targetElement) {
        elementWidth = Number(targetElement.width) || 100;
      } else if ("radius" in targetElement) {
        // 对于圆形等可能使用radius的元素
        elementWidth = elementHeight = (Number(targetElement.radius) || 50) * 2;
      }
      if ("height" in targetElement) {
        elementHeight = Number(targetElement.height) || 100;
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

    // 应用最终边界检查，确保工具栏完全在视口内
    finalLeft = Math.max(
      margin,
      Math.min(finalLeft, containerWidth - toolbarWidth - margin)
    );
    finalTop = Math.max(
      margin,
      Math.min(finalTop, containerHeight - toolbarHeight - margin)
    );

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
      className={styles.toolbarWrapper}
      onClick={handleToolbarClick}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      data-toolbar-element="true"
    >
      {/* 显示选中元素数量的提示 */}
      {selectedElements.length > 1 && (
        <div className={styles.selectionCount}>
          已选择 {selectedElements.length} 个元素
        </div>
      )}

      {/* 颜色选择器 - 支持批量编辑 */}
      <ColorPicker
        element={element}
        onUpdateElement={(id: string, updates: Partial<CanvasElement>) => {
          if (selectedElements.length > 1) {
            batchUpdateElements(updates);
          } else {
            onUpdateElement(id, updates);
          }
        }}
      />

      {/* 边框颜色选择器 - 支持批量编辑 */}
      <BorderColorPicker
        element={element}
        onUpdateElement={(id: string, updates: Partial<CanvasElement>) => {
          if (selectedElements.length > 1) {
            batchUpdateElements(updates);
          } else {
            onUpdateElement(id, updates);
          }
        }}
      />

      {/* 边框宽度控制 - 支持批量编辑 */}
      <BorderWidthControl
        element={element}
        onUpdateElement={(id: string, updates: Partial<CanvasElement>) => {
          if (selectedElements.length > 1) {
            batchUpdateElements(updates);
          } else {
            onUpdateElement(id, updates);
          }
        }}
      />

      {/* 圆角控制 - 仅当所有选中元素都是矩形时显示 */}
      {allElementsAreRectangles ? (
        <CornerRadiusControl
          element={element}
          onUpdateElement={(id: string, updates: Partial<CanvasElement>) => {
            if (selectedElements.length > 1) {
              batchUpdateElements(updates);
            } else {
              onUpdateElement(id, updates);
            }
          }}
        />
      ) : selectedElements.length > 1 ? (
        <div
          className={styles.disabledControl}
          title="只有当选择的所有元素都是矩形时才能调整圆角"
        >
          圆角 (仅矩形可用)
        </div>
      ) : // 单个非矩形元素也不显示圆角控制
      null}

      {/* 透明度调节 - 支持批量编辑 */}
      <OpacitySlider
        element={element}
        onUpdateElement={(id: string, updates: Partial<CanvasElement>) => {
          if (selectedElements.length > 1) {
            batchUpdateElements(updates);
          } else {
            onUpdateElement(id, updates);
          }
        }}
      />
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
