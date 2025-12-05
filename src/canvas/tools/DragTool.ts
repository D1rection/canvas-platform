import React from 'react';
import type { ID, CanvasElement } from '../schema/model';

/**
 * 拖拽状态接口定义
 */
export interface DragState {
  isDragging: boolean;
  hasStartedDragging: boolean; // 是否已经开始实际拖拽（移动超过阈值）
  elementId: ID | undefined;
  elementIds: ID[]; // 支持多个元素ID
  startClientX: number;
  startClientY: number;
  initialPositions: Record<ID, { x: number; y: number }>; // 每个元素的初始位置
  elementDOMElements: Record<ID, HTMLElement>; // 每个元素的 DOM 引用，用于预览
  originalTransforms: Record<ID, string>; // 每个元素原始的 transform 样式（包含旋转等）
  lastDeltaX: number; // 最后一次移动的deltaX（世界坐标）
  lastDeltaY: number; // 最后一次移动的deltaY（世界坐标）
  selectionBoxElement: HTMLElement | null; // 选中框的 DOM 引用，用于隐藏显示
  wasSelectionBoxVisible: boolean; // 选中框是否原本可见，用于恢复状态
}

/**
 * 拖拽工具类，封装了元素拖拽相关的方法和状态管理
 */
export class DragTool {
  private dragState: DragState | null = null;
  private onUpdateElementCallback: ((id: ID, updates: Partial<CanvasElement>) => void) | undefined;
  private documentRef: { current: { elements: Record<ID, CanvasElement> } } | undefined;
  private viewportRef: { current: { x: number; y: number; scale: number } } | undefined;
  private elementsLayerRef: { current: HTMLElement | null } | undefined;
  private overlayLayerRef: { current: HTMLElement | null } | undefined;

  /**
   * 初始化拖拽工具
   * @param onUpdateElement 元素更新回调函数
   * @param documentRef 文档引用
   * @param viewportRef 视口引用
   * @param elementsLayerRef 元素层 DOM 引用，用于预览
   * @param overlayLayerRef 覆盖层 DOM 引用，用于选中框操作
   */
  constructor(
    onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void,
    documentRef?: { current: { elements: Record<ID, CanvasElement> } },
    viewportRef?: { current: { x: number; y: number; scale: number } },
    elementsLayerRef?: { current: HTMLElement | null },
    overlayLayerRef?: { current: HTMLElement | null }
  ) {
    this.onUpdateElementCallback = onUpdateElement;
    this.documentRef = documentRef;
    this.viewportRef = viewportRef;
    this.elementsLayerRef = elementsLayerRef;
    this.overlayLayerRef = overlayLayerRef;
  }

  /**
   * 更新拖拽工具的依赖项
   */
  updateDependencies(
    onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void,
    documentRef?: { current: { elements: Record<ID, CanvasElement> } },
    viewportRef?: { current: { x: number; y: number; scale: number } },
    elementsLayerRef?: { current: HTMLElement | null },
    overlayLayerRef?: { current: HTMLElement | null }
  ) {
    this.onUpdateElementCallback = onUpdateElement;
    this.documentRef = documentRef;
    this.viewportRef = viewportRef;
    this.elementsLayerRef = elementsLayerRef;
    this.overlayLayerRef = overlayLayerRef;
  }

  /**
   * 通过元素ID查找对应的DOM元素
   */
  private findElementDOM(id: ID): HTMLElement | null {
    if (!this.elementsLayerRef?.current) {
      return null;
    }
    // 通过 data-id 属性查找元素
    return this.elementsLayerRef.current.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
  }

  /**
   * 查找选中框的DOM元素
   */
  private findSelectionBoxDOM(): HTMLElement | null {
    if (!this.overlayLayerRef?.current) {
      return null;
    }
    // 查找单选框或多选框
    const selectionBox = this.overlayLayerRef.current.querySelector('[data-selection-box]') as HTMLElement | null;
    return selectionBox;
  }

  /**
   * 处理元素拖拽起始事件
   * @param id 元素ID
   * @param e 指针事件对象
   * @param elementIds 可选的多个元素ID，用于多选拖拽
   * @returns 是否成功开始拖拽
   */
  handleElementPointerDown(
    id: ID | undefined,
    e: React.PointerEvent,
    elementIds?: ID[]
  ): boolean {
    if (!id || !this.documentRef?.current?.elements[id] || !this.viewportRef?.current) {
      return false;
    }

    const element = this.documentRef.current.elements[id];
    if (!element.transform) {
      return false;
    }

    // 准备初始位置记录和DOM元素引用
    const initialPositions: Record<ID, { x: number; y: number }> = {};
    const elementDOMElements: Record<ID, HTMLElement> = {};
    const originalTransforms: Record<ID, string> = {};
    
    // 如果提供了多个元素ID，记录每个元素的初始位置和DOM引用
    const idsToProcess = elementIds && elementIds.length > 0 ? elementIds : [id];
    
    for (const elId of idsToProcess) {
      const el = this.documentRef.current.elements[elId];
      if (el && el.transform) {
        initialPositions[elId] = {
          x: el.transform.x,
          y: el.transform.y
        };
        
        // 查找对应的DOM元素，并记录其原始 transform（通常包含 rotate 等）
        const domElement = this.findElementDOM(elId);
        if (domElement) {
          elementDOMElements[elId] = domElement;
          originalTransforms[elId] = domElement.style.transform || '';
        }
      }
    }

    // 如果找不到任何DOM元素，回退到原来的方式
    if (Object.keys(elementDOMElements).length === 0) {
      console.warn('DragTool: 无法找到元素DOM，将使用state更新方式');
    }

    // 查找选中框并隐藏它
    const selectionBoxElement = this.findSelectionBoxDOM();
    const wasSelectionBoxVisible = selectionBoxElement ? selectionBoxElement.style.display !== 'none' : false;
    if (selectionBoxElement) {
      selectionBoxElement.style.display = 'none';
    }

    this.dragState = {
      isDragging: true,
      hasStartedDragging: false, // 初始化为false，只有移动超过阈值后才设为true
      elementId: id,
      elementIds: idsToProcess,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialPositions: initialPositions,
      elementDOMElements: elementDOMElements,
      originalTransforms: originalTransforms,
      lastDeltaX: 0,
      lastDeltaY: 0,
      selectionBoxElement: selectionBoxElement,
      wasSelectionBoxVisible: wasSelectionBoxVisible
    };

    return true;
  }

  /**
   * 处理拖拽移动事件
   * @param clientX 当前客户端X坐标
   * @param clientY 当前客户端Y坐标
   * @returns 是否更新了元素位置
   */
  handlePointerMove(
    clientX: number,
    clientY: number
  ): boolean {
    if (!this.dragState?.isDragging || !this.viewportRef?.current) {
      return false;
    }

    const {
      startClientX,
      startClientY,
      elementIds,
      initialPositions,
      elementDOMElements,
      originalTransforms,
    } = this.dragState;
    const viewport = this.viewportRef.current;
    const scale = viewport.scale || 1;

    // 计算移动距离（屏幕坐标）
    const screenDeltaX = clientX - startClientX;
    const screenDeltaY = clientY - startClientY;
    
    // 移动阈值：只有移动超过这个距离才开始实际拖拽（修改DOM）
    const moveThreshold = 0.5;
    const hasMoved = Math.abs(screenDeltaX) >= moveThreshold || Math.abs(screenDeltaY) >= moveThreshold;
    
    // 如果还没有开始实际拖拽，检查是否应该开始
    if (!this.dragState.hasStartedDragging) {
      if (!hasMoved) {
        // 移动距离小于阈值，不修改DOM，避免单击时瞬移
        return false;
      }
      // 移动距离超过阈值，标记为已开始拖拽
      this.dragState.hasStartedDragging = true;
    }

    // 计算移动距离（世界坐标）
    const deltaX = screenDeltaX / scale;
    const deltaY = screenDeltaY / scale;

    // 保存最后一次移动距离（用于 pointerUp 提交最终 state）
    this.dragState.lastDeltaX = deltaX;
    this.dragState.lastDeltaY = deltaY;

    // 对每个选中的元素应用相同的移动距离（DOM 预览）
    let updated = false;
    for (const elId of elementIds) {
      const initialPos = initialPositions[elId];
      if (!initialPos) continue;

      const domElement = elementDOMElements[elId];
      
      // 优先使用 DOM 预览方式：在原有 transform 的基础上叠加 translate，避免直接修改 left/top
      if (domElement) {
        const previewDx = deltaX * scale;
        const previewDy = deltaY * scale;

        // 使用拖拽开始时记录的 transform，保持已有的 rotate/scale 等效果
        const baseTransform =
          originalTransforms[elId] ??
          domElement.style.transform ??
          '';

        // CSS 变换从右到左应用，将 translate 放在最左侧，表示最后执行，
        // 这样平移发生在屏幕坐标系下，不受旋转影响
        domElement.style.transform = `translate(${previewDx}px, ${previewDy}px) ${baseTransform}`;
        updated = true;
      } else if (this.onUpdateElementCallback) {
        // 回退方案：如果找不到DOM元素，使用state更新
        const currentElement = this.documentRef?.current?.elements[elId];
        const currentTransform = currentElement?.transform || {};
        
        const scaleX = (currentTransform as any)?.scaleX || 1;
        const scaleY = (currentTransform as any)?.scaleY || 1;
        const rotation = (currentTransform as any)?.rotation || 0;
        
        this.onUpdateElementCallback(elId, {
          transform: {
            x: initialPos.x + deltaX,
            y: initialPos.y + deltaY,
            scaleX,
            scaleY,
            rotation
          },
        });
        updated = true;
      }
    }

    return updated;
  }

  /**
   * 处理拖拽结束事件
   */
  handlePointerUp(): void {
    if (!this.dragState || !this.viewportRef?.current) {
      this.dragState = null;
      return;
    }

    const {
      elementIds,
      initialPositions,
      elementDOMElements,
      originalTransforms,
      lastDeltaX,
      lastDeltaY,
      hasStartedDragging,
    } = this.dragState;

    // 只有在实际开始拖拽后，才需要同步到 state
    if (hasStartedDragging && this.onUpdateElementCallback && this.documentRef?.current) {
      for (const elId of elementIds) {
        const initialPos = initialPositions[elId];
        if (!initialPos) continue;

        const currentElement = this.documentRef.current.elements[elId];
        const currentTransform = currentElement?.transform || {};

        const scaleX = (currentTransform as any)?.scaleX || 1;
        const scaleY = (currentTransform as any)?.scaleY || 1;
        const rotation = (currentTransform as any)?.rotation || 0;

        const finalX = initialPos.x + lastDeltaX;
        const finalY = initialPos.y + lastDeltaY;

        this.onUpdateElementCallback(elId, {
          transform: {
            x: finalX,
            y: finalY,
            scaleX,
            scaleY,
            rotation,
          },
        });

        // 恢复 DOM 上的 transform 到拖拽前的值，预览效果交给 React 重新渲染覆盖
        const domElement = elementDOMElements[elId];
        if (domElement) {
          const original = originalTransforms[elId];
          domElement.style.transform = original ?? domElement.style.transform ?? '';
        }
      }
    }

    // 恢复选中框的显示状态
    if (this.dragState.selectionBoxElement && this.dragState.wasSelectionBoxVisible) {
      this.dragState.selectionBoxElement.style.display = '';
    }

    this.dragState = null;
  }

  /**
   * 检查是否正在拖拽
   */
  isDragging(): boolean {
    return !!this.dragState?.isDragging;
  }

  /**
   * 取消当前拖拽
   */
  cancelDrag(): void {
    this.dragState = null;
  }
}
