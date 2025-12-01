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
  ImageElement,
  SelectionOverlay,
} from "../../canvas/renderer";
import { ElementToolbar } from "../ElementToolbar";
import styles from "./CanvasView.module.css";
import { MarqueeSelectionBox } from "../../canvas/renderer/overlay/MarqueeSelectionBox";
import { RotateTool } from "../../canvas/tools/RotateTool";
import { DragTool } from "../../canvas/tools/DragTool";

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
  /** 旋转控制点鼠标点击 */
  onRotateHandlePointerDown?: (
    id: ID | undefined,
    e: React.PointerEvent<HTMLElement>
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
  onUpdateElement,
  onWheel,
  onRotateHandlePointerDown,
}) => {
  const { document, viewport, selection } = state;
  const scale = viewport.scale;

  // 方案D：增强的状态同步监控
  useEffect(() => {
    console.log("=== State Sync Monitor ===");
    console.log(
      "Document elements count:",
      Object.keys(document.elements).length
    );
    console.log("Selected IDs:", selection.selectedIds);

    // 检查每个选中的元素是否仍然存在
    selection.selectedIds.forEach((selectedId) => {
      const elementExists = !!document.elements[selectedId];
      console.log(`Element ${selectedId} exists:`, elementExists);

      if (!elementExists) {
        console.error(
          `CRITICAL: Selected element ${selectedId} not found in document!`
        );
        // 这里可以记录错误或触发恢复逻辑
      }
    });
  }, [document.elements, selection.selectedIds]);

  // 是否正在拖拽画布
  const [isDragging, setIsDragging] = useState(false);
  const elementsLayerRef = useRef<HTMLDivElement | null>(null);
  const overlayLayerRef = useRef<HTMLDivElement | null>(null);
  const documentRef = useRef(document);
  const viewportRef = useRef(viewport);
  // 旋转工具实例
  const rotateTool = useRef<RotateTool | null>(null);
  // 拖拽工具实例
  const dragTool = useRef<DragTool | null>(null);

  // 更新document和viewport的ref，以便在事件处理函数中使用最新的值
  useEffect(() => {
    documentRef.current = document;
    viewportRef.current = viewport;
    
    // 初始化或更新旋转工具
    if (!rotateTool.current) {
      rotateTool.current = new RotateTool(onUpdateElement, documentRef, viewportRef, { root: styles.root });
    } else {
      rotateTool.current.updateDependencies(
        onUpdateElement,
        documentRef,
        viewportRef,
        { root: styles.root }
      );
    }
    
    // 初始化或更新拖拽工具
    if (!dragTool.current) {
      dragTool.current = new DragTool(onUpdateElement, documentRef, viewportRef);
    } else {
      dragTool.current.updateDependencies(
        onUpdateElement,
        documentRef,
        viewportRef
      );
    }
  }, [document, viewport, onUpdateElement, styles.root]);
  
  // 初始化旋转工具
  useEffect(() => {
    rotateTool.current = new RotateTool(
      onUpdateElement,
      documentRef,
      viewportRef,
      { root: styles.root }
    );
    
    // 清理函数
    return () => {
      // 可以在这里添加清理旋转工具的代码
    };
  }, []);

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
      
      // 使用拖拽工具处理元素拖拽
      if (dragTool.current) {
        dragTool.current.handleElementPointerDown(id, e);
      }
      
      onElementPointerDown?.(id, e);
      e.stopPropagation();
    },
    [isDragging, cursor, onElementPointerDown]
  );

  const renderShape = React.useCallback(
    (el: any) => {
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
      if (el.type === "image") {
      return <ImageElement key={el.id} {...commonProps} />;
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

  // 处理旋转控制点的指针按下事件
  const handleRotateHandlePointerDown = (id: ID | undefined, e: React.PointerEvent<Element>) => {
    // 使用旋转工具处理旋转控制点的点击事件
    if (rotateTool.current) {
      // 进行类型断言以匹配rotateTool的期望类型
      rotateTool.current.handleRotateHandlePointerDown(id, e as React.PointerEvent<HTMLElement>);
    }
    
    // 通知外部处理旋转开始
    if (onRotateHandlePointerDown) {
      onRotateHandlePointerDown(id, e as React.PointerEvent<HTMLElement>);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // 如果正在拖拽，使用拖拽工具处理
    if (dragTool.current && dragTool.current.isDragging()) {
      dragTool.current.handlePointerMove(e.clientX, e.clientY);
      return;
    }
    
    // 如果正在旋转，不执行正常的画布移动处理
    if (rotateTool.current && rotateTool.current.isRotating()) return;
    
    if (!onCanvasPointerMove) return;
    const point = screenToWorld(e);
    onCanvasPointerMove(point, e);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // 如果正在旋转，不执行正常的画布松开处理
    if (rotateTool.current && rotateTool.current.isRotating()) return;
    
    if (!onCanvasPointerUp) return;
    if (isDragging) setIsDragging(false);
    
    // 通知拖拽工具处理指针抬起事件
    if (dragTool.current) {
      dragTool.current.handlePointerUp();
    }
    
    // 旋转工具没有handlePointerUp方法，这里省略
    
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
      <div>
      {document.rootElementIds.map((id) => {
        const el = document.elements[id];
        if (el) {
          return renderShape(el);
        }
        return null;
      })}
    </div>
    
      <div className={styles.elementsLayer} ref={elementsLayerRef}>
        {renderedShapes}
      </div>

      <div className={styles.overlayLayer} ref={overlayLayerRef}>
        <SelectionOverlay
          selectedIds={selection.selectedIds}
          elements={document.elements}
          viewport={viewport}
          onRotateHandlePointerDown={handleRotateHandlePointerDown}
        />

        {selection.selectedIds.length === 1 && (
          <ElementToolbar
            element={document.elements[selection.selectedIds[0]]}
            viewport={viewport}
            onUpdateElement={handleUpdateElement}
          />
        )}
        {state.marqueeSelection && (
          <MarqueeSelectionBox
            startPoint={state.marqueeSelection.startPoint}
            endPoint={state.marqueeSelection.endPoint}
            viewport={viewport}
          />
        )}

        {/* 后续可在此添加：HoverOverlay / DragPreview / AlignmentGuides 等 */}
      </div>
    </div>
  );
};