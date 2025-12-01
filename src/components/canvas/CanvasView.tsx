import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  CanvasRuntimeState,
  ID,
  Point,
  ShapeElement,
  ViewportState,
  CanvasElement,
} from "../../canvas/schema/model";
import {
  RectShape,
  CircleShape,
  TriangleShape,
  SelectionOverlay,
} from "../../canvas/renderer";
import { ElementToolbar } from "../ElementToolbar";
import styles from "./CanvasView.module.css";

interface CanvasViewProps {
  state: CanvasRuntimeState;
  cursor?: string;
  /** 注册画布平移预览回调 */
  onRegisterPanPreview?: (
    apply: (offset: { dx: number; dy: number } | null) => void
  ) => void;
  /** 画布空白区域鼠标点击 */
  onCanvasPointerDown?: (
    point: Point,
    e: React.PointerEvent<HTMLDivElement>
  ) => void;
  /* 元素鼠标点击 */
  onElementPointerDown?: (
    id: ID,
    e: React.PointerEvent<HTMLDivElement>
  ) => void;
  /** 画布空白区域鼠标移动 */
  onCanvasPointerMove?: (
    point: Point,
    e: React.PointerEvent<HTMLDivElement>
  ) => void;
  /** 画布空白区域鼠标松开 */
  onCanvasPointerUp?: (
    point: Point,
    e: React.PointerEvent<HTMLDivElement>
  ) => void;
  /** 更新元素回调 */
  onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void;
  /** 画布鼠标滚轮 */
  onWheel?: (point: Point, e: React.WheelEvent<HTMLDivElement>) => void;
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
  onUpdateElement,
  onWheel,
}) => {
  const { document, viewport, selection } = state;
  const scale = viewport.scale;

  const [isDragging, setIsDragging] = useState(false);
  const elementsLayerRef = useRef<HTMLDivElement | null>(null);
  const overlayLayerRef = useRef<HTMLDivElement | null>(null);

  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    if (!id || !document.elements[id]) {
      return;
    }

    if (onUpdateElement) {
      onUpdateElement(id, updates);
    }
  };

  const handleShapePointerDown = React.useCallback(
    (id: string, e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging && cursor === "grab") setIsDragging(true);
      onElementPointerDown?.(id, e);
      e.stopPropagation();
    },
    [isDragging, cursor, onElementPointerDown]
  );

  const renderShape = React.useCallback(
    (el: ShapeElement) => {
      const commonProps = {
        element: el,
        viewport: viewport as ViewportState,
        scale,
        onPointerDown: (e: React.PointerEvent<any>) =>
          handleShapePointerDown(el.id, e),
        isHovered: selection.hoveredId === el.id,
        isSelected: selection.selectedIds.includes(el.id),
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
      return null;
    },
    [
      viewport,
      scale,
      selection.hoveredId,
      selection.selectedIds,
      handleShapePointerDown,
    ]
  );

  const renderedShapes = React.useMemo(() => {
    return document.rootElementIds.map((id) => {
      const el = document.elements[id];
      if (!el || el.type !== "shape" || !el.visible) return null;
      return renderShape(el as ShapeElement);
    });
  }, [document.rootElementIds, document.elements, renderShape]);

  const screenToWorld = (
    e: React.PointerEvent<HTMLDivElement> | React.WheelEvent<HTMLDivElement>
  ): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return {
      x: viewport.x + screenX / scale,
      y: viewport.y + screenY / scale,
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (e.button !== 0) {
      return;
    }

    const isToolbarRelated =
      target.closest('[data-toolbar-element="true"]') !== null ||
      target.closest('[class*="colorPicker"]') !== null ||
      target.closest('[class*="sizeControl"]') !== null ||
      target.closest('[class*="opacitySlider"]') !== null ||
      target.closest('[class*="borderWidth"]') !== null ||
      (target.tagName === "INPUT" && target.getAttribute("type") === "range") ||
      target.classList.contains("colorTrigger") ||
      target.classList.contains("presetColor") ||
      target.classList.contains("sliderThumb") ||
      target.classList.contains("sliderTrack") ||
      target.closest(`.${styles.toolbarWrapper}`) !== null;

    if (isToolbarRelated) {
      e.stopPropagation();
      return;
    }

    if (!onCanvasPointerDown) return;

    if (!isDragging && cursor === "grab") setIsDragging(true);
    const point = screenToWorld(e);
    onCanvasPointerDown(point, e);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onCanvasPointerMove) return;
    const point = screenToWorld(e);
    onCanvasPointerMove(point, e);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onCanvasPointerUp) return;
    if (isDragging) setIsDragging(false);
    const point = screenToWorld(e);
    onCanvasPointerUp(point, e);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!onWheel) return;
    const point = screenToWorld(e);
    onWheel(point, e);
  };

  const canvasCursor = useMemo(() => {
    if (!cursor) return "default";
    if (cursor === "grab" && isDragging) {
      return "grabbing";
    }
    return cursor;
  }, [cursor, isDragging]);

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
      <div className={styles.elementsLayer} ref={elementsLayerRef}>
        {renderedShapes}
      </div>

      <div className={styles.overlayLayer} ref={overlayLayerRef}>
        <SelectionOverlay
          selectedIds={selection.selectedIds}
          elements={document.elements}
          viewport={viewport}
        />

        {selection.selectedIds.length === 1 && (
          <ElementToolbar
            element={document.elements[selection.selectedIds[0]]}
            viewport={viewport}
            onUpdateElement={handleUpdateElement}
          />
        )}
      </div>
    </div>
  );
};