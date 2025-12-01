import type { ID, Point, CanvasElement } from '../schema/model';

/**
 * 旋转状态接口定义
 */
export interface RotateState {
  isRotating: boolean;
  elementId: ID | undefined;
  startAngle: number;
  initialRotation: number;
  elementCenter: Point;
}

/**
 * 旋转工具类，封装了旋转相关的方法和状态管理
 */
export class RotateTool {
  private rotateState: RotateState | null = null;
  private onUpdateElementCallback: ((id: ID, updates: Partial<CanvasElement>) => void) | undefined;
  private documentRef: { current: { elements: Record<ID, CanvasElement> } } | undefined;
  private viewportRef: { current: { x: number; y: number; scale: number } } | undefined;
  private stylesRef: { root: string } | undefined;

  /**
   * 初始化旋转工具
   * @param onUpdateElement 元素更新回调函数
   * @param documentRef 文档引用
   * @param viewportRef 视口引用
   * @param stylesRef 样式引用
   */
  constructor(
    onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void,
    documentRef?: { current: { elements: Record<ID, CanvasElement> } },
    viewportRef?: { current: { x: number; y: number; scale: number } },
    stylesRef?: { root: string }
  ) {
    this.onUpdateElementCallback = onUpdateElement;
    this.documentRef = documentRef;
    this.viewportRef = viewportRef;
    this.stylesRef = stylesRef;
  }

  /**
   * 更新旋转工具的依赖项
   */
  updateDependencies(
    onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void,
    documentRef?: { current: { elements: Record<ID, CanvasElement> } },
    viewportRef?: { current: { x: number; y: number; scale: number } },
    stylesRef?: { root: string }
  ) {
    if (onUpdateElement !== undefined) this.onUpdateElementCallback = onUpdateElement;
    if (documentRef !== undefined) this.documentRef = documentRef;
    if (viewportRef !== undefined) this.viewportRef = viewportRef;
    if (stylesRef !== undefined) this.stylesRef = stylesRef;
  }

  /**
   * 计算两个点之间的角度
   * @param center 中心点坐标
   * @param point 目标点坐标
   * @returns 角度值（0-360度）
   */
  calculateAngle(center: Point, point: Point): number {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    // 调整角度为0-360度范围
    if (angle < 0) angle += 360;
    return angle;
  }

  /**
   * 处理旋转控制点的指针按下事件
   * @param id 元素ID
   * @param e 指针事件
   * @returns 是否成功开始旋转
   */
  handleRotateHandlePointerDown(
    id: ID | undefined,
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
    const viewport = this.viewportRef.current;
    
    // 计算元素中心点（世界坐标）
    const elementCenter: Point = {
      x: transform.x + size.width / 2,
      y: transform.y + size.height / 2,
    };
    
    // 计算当前鼠标位置相对于元素中心的角度
    const rootElement = document.querySelector(`.${this.stylesRef?.root || ''}`);
    if (!rootElement) {
      return false;
    }
    
    const rect = rootElement.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint: Point = {
      x: viewport.x + screenX / viewport.scale,
      y: viewport.y + screenY / viewport.scale,
    };
    
    const currentAngle = this.calculateAngle(elementCenter, worldPoint);
    
    this.rotateState = {
      isRotating: true,
      elementId: id,
      startAngle: currentAngle,
      initialRotation: transform.rotation || 0,
      elementCenter,
    };
    
    // 添加全局事件监听器，以捕获旋转过程中的鼠标移动和松开事件
    document.addEventListener('pointermove', this.handleGlobalPointerMove.bind(this));
    document.addEventListener('pointerup', this.handleGlobalPointerUp.bind(this));
    document.addEventListener('pointercancel', this.handleGlobalPointerUp.bind(this));
    
    // 更新鼠标样式
    document.body.style.cursor = 'grabbing';
    
    return true;
  }
  
  /**
   * 处理全局鼠标移动事件（用于旋转操作）
   * @param e 指针事件
   */
  private handleGlobalPointerMove(e: PointerEvent): void {
    if (!this.rotateState || !this.rotateState.isRotating || !this.rotateState.elementId ||
        !this.documentRef?.current || !this.viewportRef?.current) {
      return;
    }
    
    const { elementId, startAngle, initialRotation, elementCenter } = this.rotateState;
    const element = this.documentRef.current.elements[elementId];
    if (!element || !('transform' in element) || !element.transform) {
      return;
    }
    
    const rootElement = document.querySelector(`.${this.stylesRef?.root || ''}`);
    if (!rootElement) {
      return;
    }
    
    const rect = rootElement.getBoundingClientRect();
    const viewport = this.viewportRef.current;
    
    // 计算世界坐标
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint: Point = {
      x: viewport.x + screenX / viewport.scale,
      y: viewport.y + screenY / viewport.scale,
    };
    
    // 计算新的角度
    const newAngle = this.calculateAngle(elementCenter, worldPoint);
    // 计算角度差值
    let angleDiff = newAngle - startAngle;
    // 确保角度差值在合理范围内（-180到180之间）
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;
    
    // 计算新的旋转角度
    let newRotation = initialRotation + angleDiff;
    // 限制旋转角度在0-360度范围
    newRotation = ((newRotation % 360) + 360) % 360;
    
    // 更新元素的旋转角度
    // 由于旋转中心现在是几何中心，我们需要确保元素位置保持一致
    if (this.onUpdateElementCallback && element.transform) {
      this.onUpdateElementCallback(elementId, {
        transform: {
          ...element.transform,
          rotation: newRotation,
        },
      });
    }
  }
  
  /**
   * 处理全局鼠标松开事件（用于结束旋转操作）
   */
  private handleGlobalPointerUp(): void {
    // 清理旋转状态
    this.rotateState = null;
    
    // 移除全局事件监听器
    document.removeEventListener('pointermove', this.handleGlobalPointerMove.bind(this));
    document.removeEventListener('pointerup', this.handleGlobalPointerUp.bind(this));
    document.removeEventListener('pointercancel', this.handleGlobalPointerUp.bind(this));
    
    // 恢复鼠标样式为默认状态
    document.body.style.cursor = '';
  }

  /**
   * 获取当前旋转状态
   */
  getRotateState(): RotateState | null {
    return this.rotateState;
  }

  /**
   * 检查是否正在旋转
   */
  isRotating(): boolean {
    return !!this.rotateState?.isRotating;
  }
}
