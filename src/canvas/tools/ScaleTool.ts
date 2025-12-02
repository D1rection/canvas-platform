import type { ID, Point, CanvasElement } from '../schema/model';

/**
 * 缩放方向枚举
 */
export const ScaleDirection = {
  TOP_LEFT: 0,
  TOP_RIGHT: 1,
  BOTTOM_LEFT: 2,
  BOTTOM_RIGHT: 3,
  TOP: 4,
  RIGHT: 5,
  BOTTOM: 6,
  LEFT: 7
} as const;

export type ScaleDirection = typeof ScaleDirection[keyof typeof ScaleDirection];

/**
 * 缩放状态接口定义
 */
export interface ScaleState {
  isScaling: boolean;
  elementId: ID | undefined;
  direction: ScaleDirection;
  startClientX: number;
  startClientY: number;
  initialWidth: number;
  initialHeight: number;
  initialX: number;
  initialY: number;
  elementCenter: Point;
  aspectRatio: number;
}

/**
 * 缩放工具类，封装了缩放相关的方法和状态管理
 */
export class ScaleTool {
  private scaleState: ScaleState | null = null;
  private onUpdateElementCallback: ((id: ID, updates: Partial<CanvasElement>) => void) | undefined;
  private documentRef: { current: { elements: Record<ID, CanvasElement> } } | undefined;
  private viewportRef: { current: { x: number; y: number; scale: number } } | undefined;
  // 添加缩放结束回调
  public onScaleEnd?: () => void;

  /**
   * 初始化缩放工具
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
   * 更新缩放工具的依赖项
   */
  updateDependencies(
    onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void,
    documentRef?: { current: { elements: Record<ID, CanvasElement> } },
    viewportRef?: { current: { x: number; y: number; scale: number } }
  ) {
    if (onUpdateElement !== undefined) this.onUpdateElementCallback = onUpdateElement;
    if (documentRef !== undefined) this.documentRef = documentRef;
    if (viewportRef !== undefined) this.viewportRef = viewportRef;
  }

  /**
   * 处理缩放控制点的指针按下事件
   * @param id 元素ID
   * @param direction 缩放方向
   * @param e 指针事件
   * @returns 是否成功开始缩放
   */
  handleScaleHandlePointerDown(
    id: ID | undefined,
    direction: ScaleDirection,
    e: React.PointerEvent<HTMLElement>
  ): boolean {
    if (!id || !this.documentRef?.current?.elements[id] || !this.viewportRef?.current || !e) {
      return false;
    }
    
    const element = this.documentRef.current.elements[id];
    if (!('size' in element) || !element.transform) {
      return false;
    }
    
    const { size, transform } = element;
    // 计算元素中心点
    
    // 计算元素中心点
    const elementCenter: Point = {
      x: transform.x + size.width / 2,
      y: transform.y + size.height / 2,
    };
    
    // 记录缩放起始状态
    this.scaleState = {
      isScaling: true,
      elementId: id,
      direction,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialWidth: size.width,
      initialHeight: size.height,
      initialX: transform.x,
      initialY: transform.y,
      elementCenter,
      aspectRatio: size.width / size.height
    };
    
    // 防止默认行为和冒泡
    e.preventDefault();
    e.stopPropagation();
    
    // 添加全局事件监听器（使用更稳定的绑定方式）
    this.moveListener = this.handleGlobalPointerMove.bind(this);
    this.upListener = this.handleGlobalPointerUp.bind(this);
    document.addEventListener('pointermove', this.moveListener);
    document.addEventListener('pointerup', this.upListener);
    document.addEventListener('pointercancel', this.upListener);
    
    // 设置指针捕获，确保不会丢失指针事件
    if (e.currentTarget) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    
    // 更新鼠标样式
    document.body.style.cursor = this.getCursorForDirection(direction);
    
    return true;
  }
  
  /**
   * 获取对应缩放方向的鼠标光标样式
   * @param direction 缩放方向
   * @returns 光标样式字符串
   */
  private getCursorForDirection(direction: ScaleDirection): string {
    switch (direction) {
      case ScaleDirection.TOP_LEFT:
      case ScaleDirection.BOTTOM_RIGHT:
        return 'nwse-resize';
      case ScaleDirection.TOP_RIGHT:
      case ScaleDirection.BOTTOM_LEFT:
        return 'nesw-resize';
      case ScaleDirection.TOP:
      case ScaleDirection.BOTTOM:
        return 'ns-resize';
      case ScaleDirection.LEFT:
      case ScaleDirection.RIGHT:
        return 'ew-resize';
      default:
        return 'default';
    }
  }
  
  /**
   * 处理全局鼠标移动事件（用于缩放操作）
   * @param e 指针事件
   */
  private handleGlobalPointerMove(e: PointerEvent): void {
    if (!this.scaleState || !this.scaleState.isScaling || !this.scaleState.elementId ||
        !this.documentRef?.current || !this.viewportRef?.current || !this.onUpdateElementCallback) {
      return;
    }
    
    const {
      elementId,
      direction,
      startClientX,
      startClientY,
      initialWidth,
      initialHeight,
      initialX,
      initialY,
      elementCenter,
      aspectRatio
    } = this.scaleState;
    
    const element = this.documentRef.current.elements[elementId];
    if (!element || !('size' in element) || !element.transform) {
      return;
    }
    
    const scale = this.viewportRef.current?.scale || 1;
    
    // 计算缩放增量
    const deltaX = (e.clientX - startClientX) / scale;
    const deltaY = (e.clientY - startClientY) / scale;
    
    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newX = initialX;
    let newY = initialY;
    
    // 根据缩放方向计算新的尺寸和位置
    switch (direction) {
      case ScaleDirection.TOP_LEFT:
        newWidth = Math.max(10, initialWidth - deltaX);
        newHeight = Math.max(10, initialHeight - deltaY);
        // 保持宽高比
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
        newX = initialX + (initialWidth - newWidth);
        newY = initialY + (initialHeight - newHeight);
        break;
        
      case ScaleDirection.TOP_RIGHT:
        newWidth = Math.max(10, initialWidth + deltaX);
        newHeight = Math.max(10, initialHeight - deltaY);
        // 保持宽高比
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
        newY = initialY + (initialHeight - newHeight);
        break;
        
      case ScaleDirection.BOTTOM_LEFT:
        newWidth = Math.max(10, initialWidth - deltaX);
        newHeight = Math.max(10, initialHeight + deltaY);
        // 保持宽高比
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
        newX = initialX + (initialWidth - newWidth);
        break;
        
      case ScaleDirection.BOTTOM_RIGHT:
        newWidth = Math.max(10, initialWidth + deltaX);
        newHeight = Math.max(10, initialHeight + deltaY);
        // 保持宽高比
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
        break;
        
      case ScaleDirection.TOP:
        newHeight = Math.max(10, initialHeight - deltaY * 2);
        newWidth = newHeight * aspectRatio;
        newX = elementCenter.x - newWidth / 2;
        newY = elementCenter.y - newHeight / 2;
        break;
        
      case ScaleDirection.RIGHT:
        newWidth = Math.max(10, initialWidth + deltaX * 2);
        newHeight = newWidth / aspectRatio;
        newX = elementCenter.x - newWidth / 2;
        newY = elementCenter.y - newHeight / 2;
        break;
        
      case ScaleDirection.BOTTOM:
        newHeight = Math.max(10, initialHeight + deltaY * 2);
        newWidth = newHeight * aspectRatio;
        newX = elementCenter.x - newWidth / 2;
        newY = elementCenter.y - newHeight / 2;
        break;
        
      case ScaleDirection.LEFT:
        newWidth = Math.max(10, initialWidth - deltaX * 2);
        newHeight = newWidth / aspectRatio;
        newX = elementCenter.x - newWidth / 2;
        newY = elementCenter.y - newHeight / 2;
        break;
    }
    
    // 确保回调函数存在并执行更新
    if (this.onUpdateElementCallback) {
      this.onUpdateElementCallback(elementId, {
        transform: {
          ...element.transform,
          x: newX,
          y: newY
        },
        size: {
          width: newWidth,
          height: newHeight
        }
      });
    }
  }
  
  // 保存事件监听器引用，以便正确移除
  private moveListener: ((e: PointerEvent) => void) | null = null;
  private upListener: ((e: PointerEvent) => void) | null = null;

  /**
   * 处理全局鼠标松开事件（用于结束缩放操作）
   */
  private handleGlobalPointerUp(): void {
    // 清理缩放状态
    this.scaleState = null;
    
    // 移除全局事件监听器（使用保存的引用）
    if (this.moveListener) {
      document.removeEventListener('pointermove', this.moveListener);
      this.moveListener = null;
    }
    if (this.upListener) {
      document.removeEventListener('pointerup', this.upListener);
      document.removeEventListener('pointercancel', this.upListener);
      this.upListener = null;
    }
    
    // 恢复鼠标样式为默认状态
    document.body.style.cursor = '';
    
    // 触发缩放结束回调
    if (this.onScaleEnd) {
      this.onScaleEnd();
    }
  }

  /**
   * 获取当前缩放状态
   */
  getScaleState(): ScaleState | null {
    return this.scaleState;
  }

  /**
   * 检查是否正在缩放
   */
  isScaling(): boolean {
    return !!this.scaleState?.isScaling;
  }
  
  /**
   * 取消当前缩放
   */
  cancelScale(): void {
    if (this.scaleState?.isScaling) {
      this.handleGlobalPointerUp();
    }
  }
  
  /**
   * 获取当前正在缩放的元素ID
   */
  getActiveElementId(): ID | undefined {
    return this.scaleState?.elementId;
  }
}