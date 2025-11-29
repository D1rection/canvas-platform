import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  CanvasRuntimeState,
  ID,
  Point,
  ShapeElement,
  ViewportState,
} from "../../canvas/schema/model";
import { RectShape, SelectionOverlay } from "../../canvas/renderer";
import styles from "./CanvasView.module.css";

interface CanvasViewProps {
  state: CanvasRuntimeState;
  cursor?: string;
  /** 注册画布平移预览回调 */
  onRegisterPanPreview?: (
    apply: (offset: { dx: number; dy: number } | null) => void,
  ) => void;
  /** 画布空白区域鼠标点击 */
  onCanvasPointerDown?: (
    point: Point,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  /* 元素鼠标点击 */
  onElementPointerDown?: (
    id: ID,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  /** 画布空白区域鼠标移动 */
  onCanvasPointerMove?: (
    point: Point,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  /** 画布空白区域鼠标松开 */
  onCanvasPointerUp?: (
    point: Point,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  /** 画布鼠标滚轮 */
  onWheel?: (
    point: Point,
    e: React.WheelEvent<HTMLDivElement>,
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
  onRegisterPanPreview,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  onElementPointerDown,
  onWheel,
}) => {
  const { document, viewport, selection } = state;
  const scale = viewport.scale;

  // 是否正在拖拽
  const [isDragging, setIsDragging] = useState(false);
  const elementsLayerRef = useRef<HTMLDivElement | null>(null);
  const overlayLayerRef = useRef<HTMLDivElement | null>(null);

  /**
   * 元素上的指针按下处理
   */
  const handleShapePointerDown = (
    id: string,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    if(!isDragging && cursor === "grab") setIsDragging(true);
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

    if (el.type === "shape" && el.shape === "rect") {
      return <RectShape key={el.id} {...commonProps} />;
    }
    // TODO: 后续添加其他图形类型
    return null;
  };

  /**
   * 屏幕坐标转场景坐标
   */
  const screenToWorld = (e: React.PointerEvent<HTMLDivElement> | React.WheelEvent<HTMLDivElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return {
      x: viewport.x + screenX / scale,
      y: viewport.y + screenY / scale,
    };
  };

  /**
   * 画布空白区域的指针按下处理
   */
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if(!isDragging && cursor === "grab") setIsDragging(true);
    const point = screenToWorld(e);
    onCanvasPointerDown?.(point, e);
  };

  /**
   * 画布指针移动
   */
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if(!onCanvasPointerMove) return;
    const point = screenToWorld(e);
    onCanvasPointerMove(point, e);
  };

  /**
   * 画布指针松开
   */
  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if(!onCanvasPointerUp) return;
    if(isDragging) setIsDragging(false);
    const point = screenToWorld(e);
    onCanvasPointerUp(point, e);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if(!onWheel) return;
    const point = screenToWorld(e);
    onWheel(point, e);
  };

  /**
   * 画布指针样式
   */
  const canvasCursor = useMemo(() => {
    if(!cursor) return "default";
    // 拖拽工具
    if (cursor === "grab" && isDragging) {
      return "grabbing";
    }
    return cursor;
  }, [cursor, isDragging]);

  // 平移预览
  useEffect(() => {
    if (!onRegisterPanPreview) return;

    onRegisterPanPreview((offset) => {
      const transform =
        offset && (offset.dx !== 0 || offset.dy !== 0)
          ? `translate(${offset.dx}px, ${offset.dy}px)`
          : "";

      if (elementsLayerRef.current) {
        elementsLayerRef.current.style.transform = transform;
      }
      if (overlayLayerRef.current) {
        overlayLayerRef.current.style.transform = transform;
      }
    });
  }, [onRegisterPanPreview]);

  return (
    <div
      className={styles.root}
      style={{ cursor: canvasCursor }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onWheel={handleWheel}
    >
      {/* 元素层：渲染所有元素 */}
      <div className={styles.elementsLayer} ref={elementsLayerRef}>
        {document.rootElementIds.map((id) => {
          const el = document.elements[id];
          if (!el || el.type !== "shape" || !el.visible) return null;
          return renderShape(el as ShapeElement);
        })}
      </div>

      {/* 覆盖层：渲染选中框等交互反馈 */}
      <div className={styles.overlayLayer} ref={overlayLayerRef}>
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
