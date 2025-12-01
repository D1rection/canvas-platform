import React from 'react';
import type { ID, CanvasElement } from '../schema/model';

/**
 * 拖拽状态接口定义
 */
export interface DragState {
  isDragging: boolean;
  elementId: ID | undefined;
  startClientX: number;
  startClientY: number;
  initialX: number;
  initialY: number;
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
   * @returns 是否成功开始拖拽
   */
  handleElementPointerDown(
    id: ID | undefined,
    e: React.PointerEvent
  ): boolean {
    if (!id || !this.documentRef?.current?.elements[id] || !this.viewportRef?.current) {
      return false;
    }

    const element = this.documentRef.current.elements[id];
    if (!element.transform) {
      return false;
    }

    this.dragState = {
      isDragging: true,
      elementId: id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialX: element.transform.x,
      initialY: element.transform.y,
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
    if (!this.dragState?.isDragging || !this.dragState.elementId || !this.viewportRef?.current || !this.onUpdateElementCallback) {
      return false;
    }

    const { startClientX, startClientY, initialX, initialY, elementId } = this.dragState;
    const scale = this.viewportRef.current?.scale || 1;

    // 计算移动距离（世界坐标）
    const deltaX = (clientX - startClientX) / scale;
    const deltaY = (clientY - startClientY) / scale;

    // 更新元素位置
    this.onUpdateElementCallback(elementId, {
      transform: {
        x: initialX + deltaX,
        y: initialY + deltaY,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
    });

    return true;
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
