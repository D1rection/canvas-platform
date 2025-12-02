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
  // 计算元素的尺寸信息
  const getElementBounds = (element: CanvasElement) => {
    if (!element.transform) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

    const x = element.transform.x;
    const y = element.transform.y;
    let width = 100; // 默认宽度
    let height = 100; // 默认高度

    // 根据元素类型获取尺寸信息
    if ("shape" in element && element.shape) {
      if ("width" in element) {
        width = Number(element.width) || 100;
      } else if ("radius" in element) {
        width = height = (Number(element.radius) || 50) * 2;
      }
      if ("height" in element) {
        height = Number(element.height) || 100;
      }
    }

    return { x, y, width, height };
  };

  // 计算工具栏位置（智能定位系统：优先下方显示，避免遮挡元素）
  const getToolbarPosition = () => {
    if (selectedElements.length === 0) {
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

    // 计算所有选中元素的边界框
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedElements.forEach(element => {
      const bounds = getElementBounds(element);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    // 计算边界框的中心点和其他位置信息
    const boundsWidth = maxX - minX;
    const boundsCenterX = minX + boundsWidth / 2;
    const boundsTop = minY;
    const boundsBottom = maxY;

    // 计算边界框周围的可用空间
    const spaceAboveBounds = boundsTop - margin;
    const spaceBelowBounds = containerHeight - boundsBottom - margin;

    // 初始化工具栏位置变量
    let finalTop: number, finalLeft: number;

    // 智能定位算法：优先下方显示，避免遮挡选中的元素
    // 1. 优先下方显示（确保不遮挡元素）
    if (spaceBelowBounds >= toolbarHeight) {
      // 下方有足够空间
      finalTop = boundsBottom + margin;
      finalLeft = boundsCenterX - toolbarWidth / 2;
    } else if (spaceAboveBounds >= toolbarHeight) {
      // 2. 当下方空间不足且上方空间充足时，显示在上方
      finalTop = boundsTop - toolbarHeight - margin;
      finalLeft = boundsCenterX - toolbarWidth / 2;
    } else {
      // 3. 如果上下空间都不足，优先选择空间较大的方向
      if (spaceBelowBounds > spaceAboveBounds) {
        // 下方空间相对较大
        finalTop = boundsBottom + margin;
      } else {
        // 上方空间相对较大
        finalTop = boundsTop - toolbarHeight - margin;
      }
      finalLeft = boundsCenterX - toolbarWidth / 2;
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
