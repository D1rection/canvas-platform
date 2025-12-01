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
  // 从state中解构变量，确保在使用前声明
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

  // 是否正在拖拽
  const [isDragging, setIsDragging] = useState(false);
  const elementsLayerRef = useRef<HTMLDivElement | null>(null);
  const overlayLayerRef = useRef<HTMLDivElement | null>(null);

  // 增强的 handleUpdateElement 带有完整防护
  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    console.log("=== handleUpdateElement with Full Protection ===");
    console.log("Target element ID:", id);
    console.log("Available elements:", Object.keys(document.elements));

    // 多层防护检查
    if (!id) {
      console.error("Update attempted with null/undefined ID");
      return;
    }

    if (!document.elements[id]) {
      console.error(`Element ${id} not found in document.elements`);
      console.log("Current document state:", document);
      return;
    }

    try {
      // 使用回调通知父组件更新元素
      if (onUpdateElement) {
        onUpdateElement(id, updates);
        console.log("Update notification sent to parent component");
      } else {
        console.warn("onUpdateElement callback not provided");
      }
      console.log("Update completed successfully");
    } catch (error) {
      console.error("Failed to update element:", error);
      console.trace();
    }
  };

  /**
   * 元素上的指针按下处理
   */
  const handleShapePointerDown = (
    id: string,
    e: React.PointerEvent<HTMLDivElement>
  ) => {

    if (!isDragging && cursor === "grab") setIsDragging(true);
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

    // if (el.type === "image") {
    //   const { element: _, ...imageProps } = commonProps;
    //   return <ImageElement key={el.id} element={el as any} {...imageProps} />;
    // }
    // TODO: 后续添加其他图形类型
    return null;
  };

  /**
   * 屏幕坐标转场景坐标
   */
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

  /**
   * 画布空白区域的指针按下处理 - 修复后的工具栏检测逻辑
   */
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // 仅响应鼠标左键 (button === 0)
    if (e.button !== 0) {
      return;
    }

    // 更精确的工具栏检测逻辑，允许特定输入元素正常工作
    const isToolbarRelated =
      // 检查工具栏容器
      target.closest('[data-toolbar-element="true"]') !== null ||
      // 检查工具栏内的组件
      target.closest('[class*="colorPicker"]') !== null ||
      target.closest('[class*="sizeControl"]') !== null ||
      target.closest('[class*="opacitySlider"]') !== null ||
      target.closest('[class*="borderWidth"]') !== null ||
      // 检查所有滑块元素
      (target.tagName === "INPUT" && target.getAttribute("type") === "range") ||
      // 检查特定类名
      target.classList.contains("colorTrigger") ||
      target.classList.contains("presetColor") ||
      target.classList.contains("sliderThumb") ||
      target.classList.contains("sliderTrack") ||
      // 检查 CSS 模块类名
      target.closest(`.${styles.toolbarWrapper}`) !== null;

    if (isToolbarRelated) {
      console.log("Toolbar interaction detected, stopping propagation");
      e.stopPropagation();
      return;
    }

    if (!onCanvasPointerDown) return;

    if (!isDragging && cursor === "grab") setIsDragging(true);
    const point = screenToWorld(e);
    onCanvasPointerDown(point, e);
  };

  /**
   * 画布指针移动
   */
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onCanvasPointerMove) return;
    const point = screenToWorld(e);
    onCanvasPointerMove(point, e);
  };

  /**
   * 画布指针松开
   */
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

  /**
   * 画布指针样式
   */
  const canvasCursor = useMemo(() => {
    if (!cursor) return "default";
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

        {/* 元素工具栏：当且仅当有一个元素被选中时显示 */}
        {selection.selectedIds.length === 1 && (
          <ElementToolbar
            element={document.elements[selection.selectedIds[0]]}
            viewport={viewport}
            onUpdateElement={handleUpdateElement}
          />
        )}

        {/* 后续可在此添加：HoverOverlay / DragPreview / AlignmentGuides 等 */}
      </div>
    </div>
  );
};
