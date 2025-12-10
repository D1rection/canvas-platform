import { ColorPicker } from "./ColorPicker";
import { BorderColorPicker } from "./BorderColorPicker"; // 引入边框颜色选择器
import { OpacitySlider } from "./OpacitySlider";
import { BorderWidthControl } from "./BorderWidthControl"; // 引入边框宽度控制
import { CornerRadiusControl } from "./CornerRadiusControl"; // 引入圆角控制
import { ImageEditorImpl as ImageEditor } from "./ImageEditor"; // 引入图片编辑器
import { TextEditor } from "./TextEditor"; // 引入文本编辑器
import type {
  ID,
  CanvasElement,
  ShapeElement,
  ImageElement as ImageElementModel,
  TextElement,
  ViewportState,
} from "../../canvas/schema/model";
import styles from "./ElementToolbar.module.css";
import React from "react";

interface ElementToolbarProps {
  element: CanvasElement; // 保持向后兼容，用于单个元素选择
  elements?: CanvasElement[]; // 新增：多个选中的元素
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
  isEditing?: boolean; // 新增：编辑状态标志
  editingElementId?: string; // 新增：当前正在编辑的元素 ID
  viewport: ViewportState; // 与定义层一致：包含 x/y/scale
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
  editingElementId,
  viewport,
}) => {
  // 如果提供了elements数组，优先使用它；否则使用单个element作为数组
  const selectedElements = elements.length > 0 ? elements : [element];

  // 检查是否所有选中的元素都是矩形
  const allElementsAreRectangles = selectedElements.every(
    (el) => el.type === "shape" && (el as ShapeElement).shape === "rect"
  );

  // 检查是否选中了单个图片元素
  const isSingleImageElement =
    selectedElements.length === 1 && selectedElements[0].type === "image";

  // 检查是否选中了单个文本元素
  const isSingleTextElement =
    selectedElements.length === 1 && selectedElements[0].type === "text";

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
  // 计算元素在屏幕坐标的包围框（考虑 viewport 平移、缩放以及元素自身的旋转）
  const getElementBounds = (element: CanvasElement) => {
    if (!element.transform) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

    // 获取视口参数
    const viewportScale = viewport.scale || 1;
    const viewportX = viewport.x || 0;
    const viewportY = viewport.y || 0;

    // 元素的原始坐标和变换
    const { x: elementX, y: elementY } = element.transform;
    const elementScaleX = element.transform.scaleX ?? 1;
    const elementScaleY = element.transform.scaleY ?? 1;
    const rotation = element.transform.rotation || 0;

    let width = 100; // 元素本地坐标系中的宽度（未应用缩放）
    let height = 100; // 元素本地坐标系中的高度（未应用缩放）

    // 根据元素类型获取尺寸信息（与 SelectionOverlay/SelectionBox 保持一致）
    if ("size" in element && element.size) {
      width = Number(element.size.width) || 100;
      height = Number(element.size.height) || 100;
    } else if ("shape" in element && element.shape) {
      if ("width" in element) {
        width = Number(element.width) || 100;
      } else if ("radius" in element) {
        width = height = (Number(element.radius) || 50) * 2;
      }
      if ("height" in element) {
        height = Number(element.height) || 100;
      }
    }

    // 计算旋转、缩放后的四个世界坐标顶点
    const scaledWidth = width * elementScaleX;
    const scaledHeight = height * elementScaleY;

    const centerX = scaledWidth / 2;
    const centerY = scaledHeight / 2;

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const localCorners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ];

    let worldMinX = Infinity;
    let worldMinY = Infinity;
    let worldMaxX = -Infinity;
    let worldMaxY = -Infinity;

    for (const corner of localCorners) {
      // 应用缩放
      const cx = corner.x * elementScaleX;
      const cy = corner.y * elementScaleY;

      // 以中心为原点进行旋转
      const relativeX = cx - centerX;
      const relativeY = cy - centerY;

      const rotatedX = relativeX * cos - relativeY * sin;
      const rotatedY = relativeX * sin + relativeY * cos;

      // 平移回世界坐标（transform.x/y 表示左上角）
      const worldX = elementX + centerX + rotatedX;
      const worldY = elementY + centerY + rotatedY;

      worldMinX = Math.min(worldMinX, worldX);
      worldMinY = Math.min(worldMinY, worldY);
      worldMaxX = Math.max(worldMaxX, worldX);
      worldMaxY = Math.max(worldMaxY, worldY);
    }

    if (
      !isFinite(worldMinX) ||
      !isFinite(worldMinY) ||
      !isFinite(worldMaxX) ||
      !isFinite(worldMaxY)
    ) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

    // 将世界坐标系下的包围盒转换为屏幕坐标系
    const screenX = (worldMinX - viewportX) * viewportScale;
    const screenY = (worldMinY - viewportY) * viewportScale;
    const screenWidth = (worldMaxX - worldMinX) * viewportScale;
    const screenHeight = (worldMaxY - worldMinY) * viewportScale;

    return {
      x: screenX,
      y: screenY,
      width: screenWidth,
      height: screenHeight,
    };
  };

  // 计算工具栏位置：优先元素上方，其次下方，并且不越出浏览器窗口
  // 注意：tw/th 会在初次渲染后用真实 DOM 尺寸回填，避免遮挡误差
  const getToolbarPosition = (tw: number, th: number) => {
    if (selectedElements.length === 0) {
      // 如果没有元素，默认显示在视口顶部
      return { top: 10, left: 10 };
    }

    const toolbarWidth = Math.max(1, Math.floor(tw)); // 实际宽度（首次为估算值）
    const toolbarHeight = Math.max(1, Math.floor(th)); // 实际高度（首次为估算值）
    const margin = 10; // 与浏览器窗口边缘的安全边距
    const elementGap = 50; // 与所选元素包围框之间的最小间距
    const avoidPadding = 10; // 额外避让（例如选框/控制点、阴影等）
    const containerWidth =
      typeof window !== "undefined" ? window.innerWidth : 1000;
    const containerHeight =
      typeof window !== "undefined" ? window.innerHeight : 600;

    // 获取所有选中元素的边界
    const allBounds = selectedElements.map(getElementBounds);

    // 计算所有选中元素的联合边界框（在屏幕坐标系）
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    allBounds.forEach((bounds) => {
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    // 计算边界框的中心点和其他位置信息
    const boundsCenterX = (minX + maxX) / 2;
    const boundsTop = minY;
    const boundsBottom = maxY;

    // 边界检查函数：确保目标位置不会超出视口
    const clampX = (x: number) =>
      Math.max(margin, Math.min(x, containerWidth - toolbarWidth - margin));
    const clampY = (y: number) =>
      Math.max(margin, Math.min(y, containerHeight - toolbarHeight - margin));

    // 矩形重叠检测：用于兜底时确保不遮挡
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

    // 仅在元素上方或下方定位（满足产品需求：优先上方，否则下方；且不越界）
    const desiredLeft = boundsCenterX - toolbarWidth / 2;
    const gapY = elementGap + avoidPadding; // 上下避让总量
    const aboveTop = boundsTop - toolbarHeight - gapY; // 上方，留出与元素的安全间距
    const belowTop = boundsBottom + gapY; // 下方，留出与元素的安全间距

    const withinY = (y: number) =>
      y >= margin && y + toolbarHeight <= containerHeight - margin;

    // 1) 优先上方（不越界、不遮挡）
    if (withinY(aboveTop)) {
      return { top: aboveTop, left: clampX(desiredLeft) };
    }
    // 2) 其次下方（不越界、不遮挡）
    if (withinY(belowTop)) {
      return { top: belowTop, left: clampX(desiredLeft) };
    }

    // 3) 左/右兜底（尽量不遮挡选中元素）
    const leftTop = clampY(
      boundsTop + (boundsBottom - boundsTop) / 2 - toolbarHeight / 2
    );
    const tryLeft = () => {
      const left = minX - toolbarWidth - elementGap;
      if (left >= margin) {
        const rect = {
          left,
          top: leftTop,
          right: left + toolbarWidth,
          bottom: leftTop + toolbarHeight,
        };
        const target = {
          left: minX - avoidPadding,
          top: boundsTop - avoidPadding,
          right: maxX + avoidPadding,
          bottom: boundsBottom + avoidPadding,
        };
        if (!overlaps(rect, target)) return { top: leftTop, left };
      }
      return null;
    };
    const tryRight = () => {
      const left = maxX + elementGap;
      if (left + toolbarWidth <= containerWidth - margin) {
        const rect = {
          left,
          top: leftTop,
          right: left + toolbarWidth,
          bottom: leftTop + toolbarHeight,
        };
        const target = {
          left: minX - avoidPadding,
          top: boundsTop - avoidPadding,
          right: maxX + avoidPadding,
          bottom: boundsBottom + avoidPadding,
        };
        if (!overlaps(rect, target)) return { top: leftTop, left };
      }
      return null;
    };
    const leftPos = tryLeft();
    if (leftPos) return leftPos;
    const rightPos = tryRight();
    if (rightPos) return rightPos;

    // 4) 最后一招：选择重叠面积更小的一侧（仍保持在窗口内）
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
      left: minX - avoidPadding,
      top: boundsTop - avoidPadding,
      right: maxX + avoidPadding,
      bottom: boundsBottom + avoidPadding,
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

  // 通过测量 DOM，使用真实尺寸定位，避免因估算值导致的遮挡
  const toolbarRef = React.useRef<HTMLDivElement | null>(null);
  const [measuredSize, setMeasuredSize] = React.useState<{
    width: number;
    height: number;
  }>({ width: 300, height: 80 });

  React.useLayoutEffect(() => {
    if (!toolbarRef.current) return;
    try {
      const rect = toolbarRef.current.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (
        w > 0 &&
        h > 0 &&
        (w !== measuredSize.width || h !== measuredSize.height)
      ) {
        setMeasuredSize({ width: w, height: h });
      }
    } catch (e) {
      // ignore measurement errors
    }
  }, [selectedElements, viewport, isEditing]);

  const position = getToolbarPosition(measuredSize.width, measuredSize.height);

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
    opacity: isEditing && !isSingleTextElement ? 0 : 1,
    pointerEvents: isEditing && !isSingleTextElement ? "none" : "auto",
    transition: "opacity 0.2s ease-in-out",
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

  // 对于文本元素，显示专门的文本编辑器
  if (isSingleTextElement) {
    const textElement = selectedElements[0] as TextElement;
    return (
      <TextEditor
        element={textElement}
        onUpdateElement={onUpdateElement}
        isEditing={isEditing}
        editingElementId={editingElementId}
        viewport={viewport}
      />
    );
  }

  return (
    <div
      ref={toolbarRef}
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
