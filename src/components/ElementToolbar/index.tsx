import { ColorPicker } from "./ColorPicker";
import { BorderColorPicker } from "./BorderColorPicker"; // 引入边框颜色选择器
import { OpacitySlider } from "./OpacitySlider";
import { BorderWidthControl } from "./BorderWidthControl"; // 引入边框宽度控制
import { CornerRadiusControl } from "./CornerRadiusControl"; // 引入圆角控制
import { ImageEditorImpl as ImageEditor } from "./ImageEditor"; // 引入图片编辑器
import type {
  ID,
  CanvasElement,
  ShapeElement,
  ImageElement as ImageElementModel,
} from "../../canvas/schema/model";
import styles from "./ElementToolbar.module.css";
import React from "react";

interface ElementToolbarProps {
  element: CanvasElement; // 保持向后兼容，用于单个元素选择
  elements?: CanvasElement[]; // 新增：多个选中的元素
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
  isEditing?: boolean; // 新增：编辑状态标志
  viewport?: { scale: number }; // 新增：视口信息，用于处理缩放
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
  isEditing = false,
  viewport,
}) => {
  // 如果提供了elements数组，优先使用它；否则使用单个element作为数组
  const selectedElements = elements.length > 0 ? elements : [element];

  // 检查是否所有选中的元素都是矩形
  const allElementsAreRectangles = selectedElements.every(
    (el) => el.type === "shape" && (el as ShapeElement).shape === "rect"
  );

  // 检查是否选中了单个图片元素
  const isSingleImageElement = selectedElements.length === 1 && selectedElements[0].type === "image";

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

    // 获取视口缩放比例，默认值为1
    const viewportScale = viewport?.scale || 1;
    
    // 元素的原始坐标和变换
    const elementX = element.transform.x;
    const elementY = element.transform.y;
    // 获取元素的缩放比例，如果没有设置则默认为1
    const elementScaleX = element.transform.scaleX || 1;
    const elementScaleY = element.transform.scaleY || 1;
    let width = 100; // 默认宽度
    let height = 100; // 默认高度

    // 根据元素类型获取尺寸信息
    if (element.type === "image" && "size" in element) {
      // 处理图片元素的尺寸
      width = Number(element.size.width) || 100;
      height = Number(element.size.height) || 100;
    } else if ("shape" in element && element.shape) {
      // 处理形状元素的尺寸
      if ("size" in element && element.size) {
        width = Number(element.size.width) || 100;
        height = Number(element.size.height) || 100;
      } else if ("width" in element) {
        width = Number(element.width) || 100;
      } else if ("radius" in element) {
        width = height = (Number(element.radius) || 50) * 2;
      }
      if ("height" in element) {
        height = Number(element.height) || 100;
      }
    }

    // 应用元素自身的缩放比例
    width *= elementScaleX;
    height *= elementScaleY;
    
    // 将坐标转换为屏幕坐标系（考虑视口缩放）
    const screenX = elementX * viewportScale;
    const screenY = elementY * viewportScale;
    const screenWidth = width * viewportScale;
    const screenHeight = height * viewportScale;

    // 返回在屏幕坐标系中的元素边界
    return { 
      x: screenX, 
      y: screenY, 
      width: screenWidth, 
      height: screenHeight 
    };
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
    const containerWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
    const containerHeight = typeof window !== "undefined" ? window.innerHeight : 600;

    // 获取所有选中元素的边界
    const allBounds = selectedElements.map(getElementBounds);
    
    // 计算所有选中元素的边界框
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let totalX = 0;
    let totalY = 0;

    allBounds.forEach(bounds => {
      totalX += bounds.x;
      totalY += bounds.y;
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    // 计算边界框的中心点和其他位置信息
    const boundsCenterX = (minX + maxX) / 2;
    const boundsCenterY = (minY + maxY) / 2;
    const boundsTop = minY;
    const boundsBottom = maxY;
    
    // 边界检查函数：确保目标位置不会超出视口
    const clampX = (x: number) => Math.max(margin, Math.min(x, containerWidth - toolbarWidth - margin));
    const clampY = (y: number) => Math.max(margin, Math.min(y, containerHeight - toolbarHeight - margin));
    
    // 重叠检测函数：检查工具栏是否与任何元素重叠
    const checkOverlap = (top: number, left: number, height: number, width: number) => {
      // 检查与每个元素的边界是否重叠
      return allBounds.some(bounds => {
        const rect1 = { left, top, right: left + width, bottom: top + height };
        const rect2 = { 
          left: bounds.x, 
          top: bounds.y, 
          right: bounds.x + bounds.width, 
          bottom: bounds.y + bounds.height 
        };
        
        // 矩形重叠检测算法
        return !(rect1.right < rect2.left || 
                 rect1.left > rect2.right || 
                 rect1.bottom < rect2.top || 
                 rect1.top > rect2.bottom);
      });
    };
    
    // 计算可能的位置，包括缩放视口适配
    const abovePosition = boundsTop - toolbarHeight - margin;
    const positions = [
      { top: boundsBottom + margin, left: boundsCenterX - toolbarWidth / 2, name: 'below' }, // 元素下方
      { top: abovePosition, left: boundsCenterX - toolbarWidth / 2, name: 'above' }, // 元素上方
      { top: boundsCenterY - toolbarHeight / 2, left: maxX + margin, name: 'right' }, // 元素右侧居中
      { top: boundsCenterY - toolbarHeight / 2, left: minX - toolbarWidth - margin, name: 'left' }, // 元素左侧居中
      { top: containerHeight - toolbarHeight - margin * 2, left: containerWidth / 2 - toolbarWidth / 2, name: 'bottom-center' }, // 视口底部中央
      { top: margin * 2, left: containerWidth / 2 - toolbarWidth / 2, name: 'top-center' } // 视口顶部中央
    ];

    // 筛选有效的位置（在视口内且不重叠）
    for (const pos of positions) {
      const clampedLeft = clampX(pos.left);
      const clampedTop = clampY(pos.top);
      
      if (!checkOverlap(clampedTop, clampedLeft, toolbarHeight, toolbarWidth)) {
        return { top: clampedTop, left: clampedLeft };
      }
    }
    
    // 如果所有位置都重叠，强制放在底部中央（这是最后的备选方案）
    return { 
      top: containerHeight - toolbarHeight - margin * 2, 
      left: containerWidth / 2 - toolbarWidth / 2 
    };
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

  // 根据编辑状态控制工具栏的显示
  // 使用opacity和pointerEvents实现平滑的显示/隐藏效果，避免视觉闪烁
  const toolbarStyle: React.CSSProperties = {
    top: `${position.top}px`,
    left: `${position.left}px`,
    opacity: isEditing ? 0 : 1,
    pointerEvents: isEditing ? 'none' : 'auto',
    transition: 'opacity 0.2s ease-in-out', // 添加过渡动画
  };

  // 对于图片元素，显示专门的图片编辑器
  if (isSingleImageElement) {
    const imageElement = selectedElements[0] as ImageElementModel;
    return (
      <ImageEditor
        element={imageElement}
        onUpdateElement={onUpdateElement}
        isEditing={isEditing}
        viewport={viewport}
      />
    );
  }

  return (
    <div
      className={styles.toolbarWrapper}
      onClick={handleToolbarClick}
      style={toolbarStyle}
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