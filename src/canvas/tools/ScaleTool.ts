import type { ID, Point, CanvasElement, TextElement } from '../schema/model';

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

// 文本缩放时的字号范围（与文本工具栏保持一致）
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 72;

/**
 * 根据缩放方向，获取「固定锚点」在元素本地坐标系（以几何中心为原点）下的位置
 * - 例如：右下角控制点缩放时，锚点为左上角
 */
function getAnchorLocal(width: number, height: number, direction: ScaleDirection): Point {
  const halfW = width / 2;
  const halfH = height / 2;

  switch (direction) {
    case ScaleDirection.BOTTOM_RIGHT:
      // 锚点：左上角
      return { x: -halfW, y: -halfH };
    case ScaleDirection.TOP_LEFT:
      // 锚点：右下角
      return { x: halfW, y: halfH };
    case ScaleDirection.TOP_RIGHT:
      // 锚点：左下角
      return { x: -halfW, y: halfH };
    case ScaleDirection.BOTTOM_LEFT:
      // 锚点：右上角
      return { x: halfW, y: -halfH };

    case ScaleDirection.TOP:
      // 锚点：下边中心
      return { x: 0, y: halfH };
    case ScaleDirection.BOTTOM:
      // 锚点：上边中心
      return { x: 0, y: -halfH };
    case ScaleDirection.LEFT:
      // 锚点：右边中心
      return { x: halfW, y: 0 };
    case ScaleDirection.RIGHT:
      // 锚点：左边中心
      return { x: -halfW, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

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
  /** 是否保持宽高比（按下 Shift 时开启） */
  keepAspect: boolean;
  /** 固定不动的缩放锚点（世界坐标） */
  anchorWorld: Point;
  /**
   * 文本元素在缩放开始时各个 span 的初始字号
   * - 仅在 element.type === "text" 时存在
   */
  initialTextFontSizes?: number[];
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

    // 计算元素中心点（世界坐标）
    const elementCenter: Point = {
      x: transform.x + size.width / 2,
      y: transform.y + size.height / 2,
    };

    // 计算当前缩放方向对应的锚点（本地坐标，以几何中心为原点）
    const anchorLocal = getAnchorLocal(size.width, size.height, direction);
    const rotation = transform.rotation || 0;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // 将锚点从本地坐标转换到世界坐标，后续缩放过程中保持该点不动
    const anchorWorld: Point = {
      x: elementCenter.x + anchorLocal.x * cos - anchorLocal.y * sin,
      y: elementCenter.y + anchorLocal.x * sin + anchorLocal.y * cos,
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
      aspectRatio: size.height !== 0 ? size.width / size.height : 1,
      keepAspect: !!e.shiftKey,
      anchorWorld,
      initialTextFontSizes:
        element.type === "text"
          ? (element as TextElement).spans.map((span) => span.style.fontSize)
          : undefined,
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
      aspectRatio,
      keepAspect,
      anchorWorld,
    } = this.scaleState;

    const element = this.documentRef.current.elements[elementId];
    if (!element || !('size' in element) || !element.transform) {
      return;
    }

    const scale = this.viewportRef.current?.scale || 1;
    const isTextElement = element.type === "text";
    const isCornerDirection =
      direction === ScaleDirection.TOP_LEFT ||
      direction === ScaleDirection.TOP_RIGHT ||
      direction === ScaleDirection.BOTTOM_LEFT ||
      direction === ScaleDirection.BOTTOM_RIGHT;

    // 文本元素在四角缩放时，始终保持等比缩放，避免文字被拉伸变形
    const keepAspectEffective = keepAspect || (isTextElement && isCornerDirection);

    // 计算在世界坐标系下的位移增量
    const worldDeltaX = (e.clientX - startClientX) / scale;
    const worldDeltaY = (e.clientY - startClientY) / scale;

    // 将位移增量投影到元素本地坐标系（考虑旋转）
    // 这样即便元素被旋转，缩放依然沿着元素自身的水平/垂直方向进行
    const rotation = element.transform.rotation || 0;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // 本地坐标中的增量（右为正，下为正）
    const deltaX =  cos * worldDeltaX + sin * worldDeltaY;
    const deltaY = -sin * worldDeltaX + cos * worldDeltaY;

    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newX = initialX;
    let newY = initialY;

    // 统一的最小尺寸限制，避免出现 0 或负尺寸
    const MIN_SIZE = 10;

    // 根据缩放方向计算新的尺寸和位置
    // 约定：四个角的控制点以对角为锚点（缩放中心）
    switch (direction) {
      case ScaleDirection.TOP_LEFT:
        // 以右下角为锚点，左上角跟随拖动
        newWidth = initialWidth - deltaX;
        newHeight = initialHeight - deltaY;
        if (keepAspectEffective) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        newWidth = Math.max(MIN_SIZE, newWidth);
        newHeight = Math.max(MIN_SIZE, newHeight);
        break;

      case ScaleDirection.TOP_RIGHT:
        // 以左下角为锚点，右上角跟随拖动
        newWidth = initialWidth + deltaX;
        newHeight = initialHeight - deltaY;
        if (keepAspectEffective) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        newWidth = Math.max(MIN_SIZE, newWidth);
        newHeight = Math.max(MIN_SIZE, newHeight);
        break;

      case ScaleDirection.BOTTOM_LEFT:
        // 以右上角为锚点，左下角跟随拖动
        newWidth = initialWidth - deltaX;
        newHeight = initialHeight + deltaY;
        if (keepAspectEffective) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        newWidth = Math.max(MIN_SIZE, newWidth);
        newHeight = Math.max(MIN_SIZE, newHeight);
        break;

      case ScaleDirection.BOTTOM_RIGHT:
        // 以左上角为锚点，右下角跟随拖动
        newWidth = initialWidth + deltaX;
        newHeight = initialHeight + deltaY;
        if (keepAspectEffective) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        newWidth = Math.max(MIN_SIZE, newWidth);
        newHeight = Math.max(MIN_SIZE, newHeight);
        break;

      case ScaleDirection.TOP:
        // TOP中点：垂直拉伸，保持宽度不变，保持底部位置不变
        newHeight = Math.max(MIN_SIZE, initialHeight - deltaY);
        newWidth = initialWidth; // 保持宽度不变
        break;

      case ScaleDirection.RIGHT:
        // RIGHT中点：水平拉伸，保持高度不变，保持左侧位置不变
        newWidth = Math.max(MIN_SIZE, initialWidth + deltaX);
        newHeight = initialHeight; // 保持高度不变
        break;

      case ScaleDirection.BOTTOM:
        // BOTTOM中点：垂直拉伸，保持宽度不变，保持顶部位置不变
        newHeight = Math.max(MIN_SIZE, initialHeight + deltaY);
        newWidth = initialWidth; // 保持宽度不变
        break;

      case ScaleDirection.LEFT:
        // LEFT中点：水平拉伸，保持高度不变，保持右侧位置不变
        newWidth = Math.max(MIN_SIZE, initialWidth - deltaX);
        newHeight = initialHeight; // 保持高度不变
        break;
    }

    // 重新根据「固定锚点」计算新的元素位置（transform.x/y）
    // 目标：缩放前后，anchorWorld 在世界坐标中保持不变
    const anchorLocalNew = getAnchorLocal(newWidth, newHeight, direction);
    const centerWorldNew: Point = {
      x: anchorWorld.x - (anchorLocalNew.x * cos - anchorLocalNew.y * sin),
      y: anchorWorld.y - (anchorLocalNew.x * sin + anchorLocalNew.y * cos),
    };

    newX = centerWorldNew.x - newWidth / 2;
    newY = centerWorldNew.y - newHeight / 2;
    
    // 组装通用更新字段（位置 + 尺寸）
    const updates: Partial<CanvasElement> = {
      transform: {
        ...element.transform,
        x: newX,
        y: newY,
      },
      size: {
        width: newWidth,
        height: newHeight,
      },
    };

    // 文本元素在四角缩放时，同步按比例调整字号
    if (
      isTextElement &&
      isCornerDirection &&
      this.scaleState.initialTextFontSizes &&
      initialWidth > 0
    ) {
      const textElement = element as TextElement;
      const scaleFactor = newWidth / initialWidth;

      const newSpans = textElement.spans.map((span, index) => {
        const initialFontSize =
          this.scaleState?.initialTextFontSizes?.[index] ?? span.style.fontSize;
        const scaledSize = initialFontSize * scaleFactor;
        const clampedSize = Math.min(
          MAX_FONT_SIZE,
          Math.max(MIN_FONT_SIZE, scaledSize)
        );
        return {
          ...span,
          style: {
            ...span.style,
            fontSize: clampedSize,
          },
        };
      });

      (updates as Partial<TextElement>).spans = newSpans;
    }

    // 确保回调函数存在并执行更新
    if (this.onUpdateElementCallback) {
      this.onUpdateElementCallback(elementId, updates);
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
