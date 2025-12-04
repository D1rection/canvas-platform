import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  CanvasRuntimeState,
  ID,
  Point,
  ViewportState,
  CanvasElement,
  ShapeElement,
  ImageElement as ImageElementType,
} from "../../canvas/schema/model";
import {
  RectShape,
  CircleShape,
  TriangleShape,
  ImageElement,
  TextElement,
  SelectionOverlay,
} from "../../canvas/renderer";
import ElementToolbar from "../ElementToolbar"; // Import the default wrapped component with error boundary
import styles from "./CanvasView.module.css";
import { MarqueeSelectionBox } from "../../canvas/renderer/overlay/MarqueeSelectionBox";
import { RotateTool } from "../../canvas/tools/RotateTool";
import { ScaleTool, ScaleDirection } from "../../canvas/tools/ScaleTool";

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
    e: React.PointerEvent<Element>
  ) => void;
  
  /** 缩放控制点鼠标点击 */
  onScaleHandlePointerDown?: (
    id: ID | undefined,
    direction: number,
    e: React.PointerEvent<HTMLElement>
  ) => void;
  /** 选中框鼠标点击 */
  onSelectionBoxPointerDown?: (
    selectedIds: ID[],
    e: React.PointerEvent<Element>
  ) => void;
  /** 注册元素层 DOM 引用回调 */
  onRegisterElementsLayerRef?: (ref: React.RefObject<HTMLDivElement | null>) => void;
  /** 注册覆盖层 DOM 引用回调 */
  onRegisterOverlayLayerRef?: (ref: React.RefObject<HTMLDivElement | null>) => void;
}

/**
 * Canvas 视图组件
 *
 * 结构：
 * - elementsLayer：渲染所有可见元素（Shape、Image等）
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
  onScaleHandlePointerDown,
  onSelectionBoxPointerDown,
  onRegisterElementsLayerRef,
  onRegisterOverlayLayerRef,
}) => {
  const { document, viewport, selection } = state;
  const scale = viewport.scale;

  console.log("Document elements before render:", document.elements);  // 输出文档元素

  // 方案D：增强的状态同步监控
  useEffect(() => {
    try {
      // 验证document和selection对象的有效性
      if (!document || !selection) {
        console.error('Invalid canvas state: Missing document or selection');
        return;
      }

      console.log("=== State Sync Monitor ===");
      console.log(
        "Document elements count:",
        document.elements ? Object.keys(document.elements).length : 0
      );
      console.log("Selected IDs:", selection.selectedIds || []);

      // 检查每个选中的元素是否仍然存在
      if (Array.isArray(selection.selectedIds) && document.elements) {
        selection.selectedIds.forEach((selectedId) => {
          const elementExists = !!document.elements[selectedId];
          
          if (!elementExists) {
            console.error(
              `CRITICAL: Selected element ${selectedId} not found in document!`
            );
            // 可以在这里添加恢复逻辑或通知父组件处理无效选择
          }
        });
      }
    } catch (error) {
      console.error('Error in state sync monitor:', error);
    }
  }, [document, selection]);

  // 是否正在拖拽画布
  const [isDragging, setIsDragging] = useState(false);
  // 是否正在进行编辑操作（拖拽、缩放、旋转）
  const [isEditing, setIsEditing] = useState(false);
  const elementsLayerRef = useRef<HTMLDivElement | null>(null);
  const overlayLayerRef = useRef<HTMLDivElement | null>(null);
  const documentRef = useRef(document);
  const viewportRef = useRef(viewport);
  // 旋转工具实例
  const rotateTool = useRef<RotateTool | null>(null);
  // 缩放工具实例
  const scaleTool = useRef<ScaleTool | null>(null);

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
    
    // 初始化或更新缩放工具
    if (!scaleTool.current) {
      scaleTool.current = new ScaleTool(onUpdateElement, documentRef, viewportRef);
    } else {
      scaleTool.current.updateDependencies(
        onUpdateElement,
        documentRef,
        viewportRef
      );
    }
  }, [document, viewport, onUpdateElement, styles.root]);
  
  
  // 旋转工具已经在上面的useEffect中初始化和更新

  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    // 安全检查：确保id有效且onUpdateElement是函数
    if (!id || typeof id !== 'string') {
      console.error('Invalid element ID for update:', id);
      return;
    }

    // 验证元素是否存在
    if (!document.elements || !document.elements[id]) {
      console.error(`Cannot update non-existent element: ${id}`);
      return;
    }

    // 验证updates是否为对象
    if (!updates || typeof updates !== 'object') {
      console.error('Invalid updates object:', updates);
      return;
    }

    try {
      if (onUpdateElement) {
        onUpdateElement(id, updates);
      }
    } catch (error) {
      console.error(`Error updating element ${id}:`, error);
    }
  };

  const handleShapePointerDown = React.useCallback(
    (id: string, e: React.PointerEvent<HTMLDivElement>) => {
      // 画布拖拽模式（cursor === 'grab'）不应触发元素拖拽工具
      if (!isDragging && cursor === "grab") {
        setIsDragging(true);
      }
      onElementPointerDown?.(id, e);
      e.stopPropagation();
    },
    [isDragging, cursor, onElementPointerDown]
  );

  const renderElement = React.useCallback(
    (el: any) => {
      console.log("Rendering element:", el);
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

      try {
        // 根据元素类型进行类型守卫和正确的属性传递
        if (el.type === "shape") {
          const shapeElement = el as ShapeElement;
          const shapeProps = {
            element: shapeElement,
            viewport: viewport as ViewportState,
            scale,
            onPointerDown: (e: React.PointerEvent<any>) =>
              handleShapePointerDown(el.id, e),
            isHovered: selection.hoveredId === el.id,
            isSelected: selection.selectedIds.includes(el.id),
          };

          if (shapeElement.shape === "rect") {
            return <RectShape key={el.id} {...shapeProps} />;
          }
          if (shapeElement.shape === "circle") {
            return <CircleShape key={el.id} {...shapeProps} />;
          }
          if (shapeElement.shape === "triangle") {
            return <TriangleShape key={el.id} {...shapeProps} />;
          }
          // 处理未知形状类型
          console.warn(`Unknown shape type: ${shapeElement.shape}`);
          return <RectShape key={el.id} {...shapeProps} />;
        }
        if (el.type === "image") {
          const imageElement = el as ImageElementType;
          const imageProps = {
            element: imageElement,
            viewport: viewport as ViewportState,
            scale,
            onPointerDown: (e: React.PointerEvent<any>) =>
              handleShapePointerDown(el.id, e),
            isSelected: selection.selectedIds.includes(el.id),
          };
          return <ImageElement key={el.id} {...imageProps} />;
        }
        // 处理未知元素类型
        console.warn(`Unknown element type: ${el.type}`);
      } catch (error) {
        console.error(`Error rendering element ${el.id}:`, error);
      }
      if (el.type === "text") {
        console.log("Rendering text element:", el);
        return <TextElement key={el.id} {...commonProps} />;
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

  const renderedElements = React.useMemo(() => {
    // 安全检查：确保rootElementIds是数组
    if (!Array.isArray(document.rootElementIds)) {
      console.error('Invalid document structure: rootElementIds is not an array');
      return [];
    }
    
    // 安全检查：确保elements是对象
    if (!document.elements || typeof document.elements !== 'object') {
      console.error('Invalid document structure: elements is not an object');
      return [];
    }

    return document.rootElementIds.map((id) => {
      // 跳过无效的id
      if (!id || typeof id !== 'string') {
        console.warn('Invalid element ID:', id);
        return null;
      }
      
      const el = document.elements[id];
      if (!el) {
        console.warn(`Element with ID ${id} not found`);
        return null;
      }
      
      if (!el.visible) return null;
      return renderElement(el);
    }).filter(Boolean); // 过滤掉null值
  }, [document.rootElementIds, document.elements, renderElement]);

  const screenToWorld = (
    e: React.PointerEvent<HTMLDivElement> | React.WheelEvent<HTMLDivElement>
  ): Point => {
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      
      // 安全检查：确保scale有效且非零
      const safeScale = scale && scale !== 0 ? scale : 1;
      
      return {
        x: (viewport?.x || 0) + screenX / safeScale,
        y: (viewport?.y || 0) + screenY / safeScale,
      };
    } catch (error) {
      console.error('Error converting screen to world coordinates:', error);
      // 返回安全的默认值
      return { x: 0, y: 0 };
    }
  };

  // 检测是否为元素拖拽操作
  const isElementDragOperation = (e: React.PointerEvent<HTMLDivElement>): boolean => {
    const target = e.target as HTMLElement;
    // 检查是否点击了选中元素或选择框
    return Boolean(
      selection.selectedIds.length > 0 &&
      !target.closest(`.${styles.toolbarWrapper}`) &&
      !target.closest('[data-toolbar-element="true"]') &&
      (target.closest('[class*="selection"]') || 
       target.closest('[data-element-id]'))
    );
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (e.button !== 0) {
      return;
    }

    // 如果是元素拖拽操作，设置编辑状态
    if (isElementDragOperation(e)) {
      setIsEditing(true);
    }

    // 增强的工具栏相关元素检测
    const isToolbarRelated =
      // 工具栏容器检测
      target.closest(`.${styles.toolbarWrapper}`) !== null ||
      // 工具栏内部元素检测
      target.closest('[data-toolbar-element="true"]') !== null ||
      // 颜色选择器相关
      target.closest('[class*="colorPicker"]') !== null ||
      target.classList.contains("colorTrigger") ||
      target.classList.contains("presetColor") ||
      // 控制器相关
      target.closest('[class*="sizeControl"]') !== null ||
      target.closest('[class*="opacitySlider"]') !== null ||
      target.closest('[class*="borderWidth"]') !== null ||
      target.closest('[class*="cornerRadius"]') !== null ||
      // 输入控件
      (target.tagName === "INPUT" && target.getAttribute("type") === "range") ||
      // 滑块组件
      target.classList.contains("sliderThumb") ||
      target.classList.contains("sliderTrack");

    // 防止点击工具栏时触发画布事件
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
    // 设置编辑状态为true
    setIsEditing(true);
    
    // 使用旋转工具处理旋转控制点的点击事件
    if (rotateTool.current) {
      // 进行类型断言以匹配rotateTool的期望类型
      rotateTool.current.handleRotateHandlePointerDown(id, e as React.PointerEvent<HTMLElement>);
      
      // 监听旋转结束事件
      const originalOnRotateEnd = rotateTool.current.onRotateEnd;
      rotateTool.current.onRotateEnd = () => {
        if (originalOnRotateEnd) originalOnRotateEnd();
        setIsEditing(false);
      };
    }
    
    // 通知外部处理旋转开始
    if (onRotateHandlePointerDown) {
      onRotateHandlePointerDown(id, e as React.PointerEvent<HTMLElement>);
    }
  };
  
  // 处理缩放控制点的指针按下事件
  const handleScaleHandlePointerDown = (id: ID | undefined, direction: number, e: React.PointerEvent<Element>) => {
    // 设置编辑状态为true
    setIsEditing(true);
    
    // 使用缩放工具处理缩放控制点的点击事件
    if (scaleTool.current) {
      // 进行类型断言以匹配scaleTool的期望类型
      scaleTool.current.handleScaleHandlePointerDown(id, direction as ScaleDirection, e as React.PointerEvent<HTMLElement>);
      
      // 监听缩放结束事件
      const originalOnScaleEnd = scaleTool.current.onScaleEnd;
      scaleTool.current.onScaleEnd = () => {
        if (originalOnScaleEnd) originalOnScaleEnd();
        setIsEditing(false);
      };
    }
    
    // 通知外部处理缩放开始
    if (typeof onScaleHandlePointerDown === 'function') {
      onScaleHandlePointerDown(id, direction, e as React.PointerEvent<HTMLElement>);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // 如果正在旋转，不执行正常的画布移动处理
    if (rotateTool.current && rotateTool.current.isRotating()) return;

    // 如果正在缩放，不执行正常的画布移动处理
    if (scaleTool.current && scaleTool.current.isScaling()) return;

    if (!onCanvasPointerMove) return;
    const point = screenToWorld(e);
    onCanvasPointerMove(point, e);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // 如果正在旋转，不执行正常的画布松开处理
    if (rotateTool.current && rotateTool.current.isRotating()) return;

    // 如果正在缩放，不执行正常的画布松开处理
    if (scaleTool.current && scaleTool.current.isScaling()) return;

    if (!onCanvasPointerUp) return;
    if (isDragging) setIsDragging(false);
    
    // 重置编辑状态
    if (isEditing) {
      setIsEditing(false);
    }

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

  // 注册元素层 DOM 引用
  useEffect(() => {
    if (onRegisterElementsLayerRef) {
      onRegisterElementsLayerRef(elementsLayerRef);
    }
  }, [onRegisterElementsLayerRef]);

  // 注册覆盖层 DOM 引用
  useEffect(() => {
    if (onRegisterOverlayLayerRef) {
      onRegisterOverlayLayerRef(overlayLayerRef);
    }
  }, [onRegisterOverlayLayerRef]);

  return (
    <div
      className={styles.root}
      style={{ cursor: canvasCursor }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onWheel={handleWheel}
    >
      {/* 元素层 */}
      <div className={styles.elementsLayer} ref={elementsLayerRef}>
        {renderedElements}
      </div>

      {/* 覆盖层 */}
      <div className={styles.overlayLayer} ref={overlayLayerRef}>
        {/* 选择覆盖层 */}
        <SelectionOverlay
          selectedIds={selection.selectedIds || []}
          elements={document.elements || {}}
          viewport={viewport}
          onRotateHandlePointerDown={handleRotateHandlePointerDown}
          onScaleHandlePointerDown={handleScaleHandlePointerDown}
          onSelectionBoxPointerDown={(e: React.PointerEvent<Element>) => {
            try {
              // 设置编辑状态为true，表示开始拖拽操作
              setIsEditing(true);
              
              // 调用父组件的选中框拖拽处理
              if (onSelectionBoxPointerDown) {
                onSelectionBoxPointerDown(selection.selectedIds || [], e);
              } else {
                e.stopPropagation();
              }
              
              // 监听全局pointerup事件以检测拖拽结束
              const handleGlobalPointerUp = () => {
                setIsEditing(false);
                try {
                  globalThis.document.removeEventListener('pointerup', handleGlobalPointerUp);
                } catch (removeEventError) {
                  console.error('Error removing pointerup event listener:', removeEventError);
                }
              };
              
              try {
                globalThis.document.addEventListener('pointerup', handleGlobalPointerUp);
              } catch (addEventError) {
                console.error('Error adding pointerup event listener:', addEventError);
                setIsEditing(false);
              }
            } catch (error) {
              console.error('Error handling selection box pointer down:', error);
              setIsEditing(false);
            }
          }}
        />

        {/* 渲染工具栏时确保有有效的元素 */}
        {selection.selectedIds?.length > 0 && 
         document.elements && 
         document.elements[selection.selectedIds[0]] && (
          <ElementToolbar
            element={document.elements[selection.selectedIds[0]]}
            elements={selection.selectedIds
              .map(id => document.elements[id])
              .filter((el): el is CanvasElement => Boolean(el))}
            onUpdateElement={handleUpdateElement}
            isEditing={isEditing}
            viewport={viewport}
          />
        )}
        
        {/* 渲染 marquee 选择框 */}
        {state.marqueeSelection && 
         state.marqueeSelection.startPoint && 
         state.marqueeSelection.endPoint && (
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
