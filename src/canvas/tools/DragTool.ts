import React from 'react';
import type { ID, CanvasElement } from '../schema/model';

/**
 * 拖拽状态接口定义
 */
export interface DragState {
  isDragging: boolean;
  elementId: ID | undefined;
  elementIds: ID[]; // 支持多个元素ID
  startClientX: number;
  startClientY: number;
  initialPositions: Record<ID, { x: number; y: number }>; // 每个元素的初始位置
}

/**
 * 拖拽工具类，封装了元素拖拽相关的方法和状态管理
 */
export class DragTool {
  private dragState: DragState | null = null;
  private onUpdateElementCallback: ((id: ID, updates: Partial<CanvasElement>) => void) | undefined;
  private documentRef: { current: { elements: Record<ID, CanvasElement> } } | undefined;
  private viewportRef: { current: { x: number; y: number; scale: number } } | undefined;

  /**
   * 初始化拖拽工具
   * @param onUpdateElement 元素更新回调函数
   * @param documentRef 文档引用
   * @param viewportRef 视口引用
   */
  constructor(
    onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void,
    documentRef?: { current: { elements: Record<ID, CanvasElement> } },
    viewportRef?: { current: { x: number; y: number; scale: number } }
  ) {
    this.onUpdateElementCallback = onUpdateElement;
    this.documentRef = documentRef;
    this.viewportRef = viewportRef;
  }

  /**
   * 更新拖拽工具的依赖项
   */
  updateDependencies(
    onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void,
    documentRef?: { current: { elements: Record<ID, CanvasElement> } },
    viewportRef?: { current: { x: number; y: number; scale: number } }
  ) {
    this.onUpdateElementCallback = onUpdateElement;
    this.documentRef = documentRef;
    this.viewportRef = viewportRef;
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

    // 准备初始位置记录
    const initialPositions: Record<ID, { x: number; y: number }> = {};
    
    // 如果提供了多个元素ID，记录每个元素的初始位置
    const idsToProcess = elementIds && elementIds.length > 0 ? elementIds : [id];
    
    for (const elId of idsToProcess) {
      const el = this.documentRef.current.elements[elId];
      if (el && el.transform) {
        initialPositions[elId] = {
          x: el.transform.x,
          y: el.transform.y
        };
      }
    }

    this.dragState = {
      isDragging: true,
      elementId: id,
      elementIds: idsToProcess,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialPositions: initialPositions
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
    if (!this.dragState?.isDragging || !this.viewportRef?.current || !this.onUpdateElementCallback) {
      return false;
    }

    const { startClientX, startClientY, elementIds, initialPositions } = this.dragState;
    const scale = this.viewportRef.current?.scale || 1;

    // 计算移动距离（世界坐标）
    const deltaX = (clientX - startClientX) / scale;
    const deltaY = (clientY - startClientY) / scale;

    // 对每个选中的元素应用相同的移动距离
    let updated = false;
    for (const elId of elementIds) {
      const initialPos = initialPositions[elId];
      if (initialPos) {
        this.onUpdateElementCallback(elId, {
          transform: {
            x: initialPos.x + deltaX,
            y: initialPos.y + deltaY,
            scaleX: 1,
            scaleY: 1,
            rotation: 0
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
