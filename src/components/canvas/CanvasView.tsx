import React from "react";
import type {
  CanvasRuntimeState,
  ID,
  Point,
  ShapeElement,
  ViewportState,
} from "../../canvas/schema/model";
import { RectShape,CircleShape,TriangleShape,SelectionOverlay } from "../../canvas/renderer";

import styles from "./CanvasView.module.css";

interface CanvasViewProps {
  state: CanvasRuntimeState;
  cursor?: string;
  onCanvasPointerDown?: (
    point: Point,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  onElementPointerDown?: (
    id: ID,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
}

/**
 * Canvas 视图组件
 *
 * 结构：
 * - elementsLayer：渲染所有元素（Shape）
 * - overlayLayer：渲染交互反馈（选中框、悬停、拖拽预览等）
 */
export const CanvasView: React.FC<CanvasViewProps> = ({
  state,
  cursor,
  onCanvasPointerDown,
  onElementPointerDown,
}) => {
  const { document, viewport, selection } = state;
  const scale = viewport.scale;

  /**
   * 元素上的指针按下处理
   */
  const handleShapePointerDown = (
    id: string,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    onElementPointerDown?.(id, e);
    e.stopPropagation();
  };

  /**
   * 根据元素类型选择渲染组件
   */
  const renderShape = (el: ShapeElement) => {
    const commonProps = {
      element: el,
      viewport: viewport as ViewportState,
      scale,
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) =>
        handleShapePointerDown(el.id, e),
    };

  if (el.type === "shape") {
    if (el.shape === "rect") {
      return <RectShape key={el.id} {...commonProps} />;
    }
    if (el.shape === "circle") {
      return <CircleShape key={el.id} {...commonProps} />;
    }
    if (el.shape === "triangle") {
      return <TriangleShape key={el.id} {...commonProps} />;
    }
    
  }


    // TODO: 后续添加其他图形类型
    return null;
  };

  /**
   * 画布空白区域的指针按下处理
   */
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onCanvasPointerDown) return;

    // 1. 获取画布容器在屏幕上的位置
    const rect = e.currentTarget.getBoundingClientRect();

    // 2. 计算点击位置相对于画布容器的屏幕坐标
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // 3. 将屏幕坐标转换为场景坐标（世界坐标）
    //    公式：worldPos = viewportPos + screenPos / scale
    const worldX = viewport.x + screenX / scale;
    const worldY = viewport.y + screenY / scale;

    onCanvasPointerDown({ x: worldX, y: worldY }, e);
  };

  return (
    <div
      className={styles.root}
      style={{ cursor: cursor ?? "default" }}
      onPointerDown={handleCanvasPointerDown}
    >
      {/* 元素层：渲染所有元素 */}
      <div className={styles.elementsLayer}>
        {document.rootElementIds.map((id) => {
          const el = document.elements[id];
          if (!el || !el.visible) return null;
          return renderShape(el);
        })}
      </div>

      {/* 覆盖层：渲染选中框等交互反馈 */}
      <div className={styles.overlayLayer}>
        <SelectionOverlay
          selectedIds={selection.selectedIds}
          elements={document.elements}
          viewport={viewport}
        />
        {/* 后续可在此添加：HoverOverlay / DragPreview / AlignmentGuides 等 */}
      </div>
    </div>
  );
};
