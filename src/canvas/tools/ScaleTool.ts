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
  /**
   * 多选缩放相关信息（当 elementId 为 undefined 且存在多选时使用）
   */
  multi?: {
    /** 参与多选缩放的元素 ID 列表 */
    elementIds: ID[];
    /** 初始整体包围框（世界坐标） */
    bounds: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
    /** 每个元素的初始几何信息 */
    elements: Array<{
      id: ID;
      initialX: number;
      initialY: number;
      initialWidth: number;
      initialHeight: number;
      center: Point;
      rotation: number;
      isText: boolean;
      textFontSizes?: number[];
    }>;
  };
}

// 多选缩放状态的非空类型，方便在类型层面复用
type MultiScaleState = NonNullable<ScaleState['multi']>;

/**
 * 缩放工具类，封装了缩放相关的方法和状态管理
 */
export class ScaleTool {
  private scaleState: ScaleState | null = null;
  private onUpdateElementCallback: ((id: ID, updates: Partial<CanvasElement>) => void) | undefined;
  private documentRef: { current: { elements: Record<ID, CanvasElement> } } | undefined;
  private viewportRef: { current: { x: number; y: number; scale: number } } | undefined;
  private selectionRef:
    | { current: { selectedIds: ID[] } }
    | undefined;
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
    viewportRef?: { current: { x: number; y: number; scale: number } },
    selectionRef?: { current: { selectedIds: ID[] } }
  ) {
    this.onUpdateElementCallback = onUpdateElement;
    this.documentRef = documentRef;
    this.viewportRef = viewportRef;
    this.selectionRef = selectionRef;
  }

  /**
   * 更新缩放工具的依赖项
   */
  updateDependencies(
    onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void,
    documentRef?: { current: { elements: Record<ID, CanvasElement> } },
    viewportRef?: { current: { x: number; y: number; scale: number } },
    selectionRef?: { current: { selectedIds: ID[] } }
  ) {
    if (onUpdateElement !== undefined) this.onUpdateElementCallback = onUpdateElement;
    if (documentRef !== undefined) this.documentRef = documentRef;
    if (viewportRef !== undefined) this.viewportRef = viewportRef;
    if (selectionRef !== undefined) this.selectionRef = selectionRef;
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
    if (!this.viewportRef?.current || !this.documentRef?.current || !e) {
      return false;
    }

    // 先尝试单元素缩放
    if (id && this.documentRef.current.elements[id]) {
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
      
      // 记录缩放起始状态（单元素）
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
    } else {
      // 多选缩放：id 为 undefined，且有多个选中元素
      const selectedIds = this.selectionRef?.current?.selectedIds || [];
      const validIds = selectedIds.filter(
        (sid) => !!this.documentRef!.current.elements[sid]
      );
      if (validIds.length <= 1) {
        return false;
      }

      const elements = validIds
        .map((sid) => this.documentRef!.current.elements[sid])
        .filter(
          (el): el is CanvasElement & { size: { width: number; height: number } } =>
            !!el && "size" in el && !!el.transform
        );
      if (!elements.length) return false;

      // 计算初始整体包围框（世界坐标，忽略旋转，使用轴对齐包围）
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const elementInfos: MultiScaleState['elements'] = [];

      for (const el of elements) {
        const { size, transform } = el as any;
        const w = size.width;
        const h = size.height;
        const x = transform.x;
        const y = transform.y;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);

        elementInfos.push({
          id: el.id,
          initialX: x,
          initialY: y,
          initialWidth: w,
          initialHeight: h,
          center: {
            x: x + w / 2,
            y: y + h / 2,
          },
          rotation: transform.rotation || 0,
          isText: el.type === "text",
          textFontSizes:
            el.type === "text"
              ? (el as TextElement).spans.map((span) => span.style.fontSize)
              : undefined,
        });
      }

      if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
        return false;
      }

      const groupWidth = maxX - minX;
      const groupHeight = maxY - minY;
      if (groupWidth <= 0 || groupHeight <= 0) {
        return false;
      }

      // 以 group 的包围框为基准构造 anchorWorld
      const groupCenter: Point = {
        x: minX + groupWidth / 2,
        y: minY + groupHeight / 2,
      };
      const anchorLocalGroup = getAnchorLocal(groupWidth, groupHeight, direction);
      const anchorWorld: Point = {
        x: groupCenter.x + anchorLocalGroup.x,
        y: groupCenter.y + anchorLocalGroup.y,
      };

      this.scaleState = {
        isScaling: true,
        elementId: undefined,
        direction,
        startClientX: e.clientX,
        startClientY: e.clientY,
        initialWidth: groupWidth,
        initialHeight: groupHeight,
        initialX: minX,
        initialY: minY,
        elementCenter: groupCenter,
        aspectRatio: groupHeight !== 0 ? groupWidth / groupHeight : 1,
        keepAspect: !!e.shiftKey,
        anchorWorld,
        multi: {
          elementIds: validIds,
          bounds: { minX, minY, maxX, maxY },
          elements: elementInfos,
        },
      };
    }
    
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
    const callback = this.onUpdateElementCallback;
    if (
      !this.scaleState ||
      !this.scaleState.isScaling ||
      !this.documentRef?.current ||
      !this.viewportRef?.current ||
      !callback
    ) {
      return;
    }

    const {
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
      multi,
    } = this.scaleState;

    const scale = this.viewportRef.current?.scale || 1;

    // 计算在世界坐标系下的位移增量
    const worldDeltaX = (e.clientX - startClientX) / scale;
    const worldDeltaY = (e.clientY - startClientY) / scale;

    // 统一的最小尺寸限制，避免出现 0 或负尺寸
    const MIN_SIZE = 10;

    // 多选缩放
    if (multi) {
      let newGroupWidth = initialWidth;
      let newGroupHeight = initialHeight;

      // 多选的 group 按世界坐标缩放（不考虑旋转）
      switch (direction) {
        case ScaleDirection.TOP_LEFT:
          newGroupWidth = initialWidth - worldDeltaX;
          newGroupHeight = initialHeight - worldDeltaY;
          if (keepAspect) {
            if (Math.abs(worldDeltaX) > Math.abs(worldDeltaY)) {
              newGroupHeight = newGroupWidth / aspectRatio;
            } else {
              newGroupWidth = newGroupHeight * aspectRatio;
            }
          }
          break;
        case ScaleDirection.TOP_RIGHT:
          newGroupWidth = initialWidth + worldDeltaX;
          newGroupHeight = initialHeight - worldDeltaY;
          if (keepAspect) {
            if (Math.abs(worldDeltaX) > Math.abs(worldDeltaY)) {
              newGroupHeight = newGroupWidth / aspectRatio;
            } else {
              newGroupWidth = newGroupHeight * aspectRatio;
            }
          }
          break;
        case ScaleDirection.BOTTOM_LEFT:
          newGroupWidth = initialWidth - worldDeltaX;
          newGroupHeight = initialHeight + worldDeltaY;
          if (keepAspect) {
            if (Math.abs(worldDeltaX) > Math.abs(worldDeltaY)) {
              newGroupHeight = newGroupWidth / aspectRatio;
            } else {
              newGroupWidth = newGroupHeight * aspectRatio;
            }
          }
          break;
        case ScaleDirection.BOTTOM_RIGHT:
          newGroupWidth = initialWidth + worldDeltaX;
          newGroupHeight = initialHeight + worldDeltaY;
          if (keepAspect) {
            if (Math.abs(worldDeltaX) > Math.abs(worldDeltaY)) {
              newGroupHeight = newGroupWidth / aspectRatio;
            } else {
              newGroupWidth = newGroupHeight * aspectRatio;
            }
          }
          break;
        case ScaleDirection.TOP:
          newGroupHeight = initialHeight - worldDeltaY;
          break;
        case ScaleDirection.BOTTOM:
          newGroupHeight = initialHeight + worldDeltaY;
          break;
        case ScaleDirection.LEFT:
          newGroupWidth = initialWidth - worldDeltaX;
          break;
        case ScaleDirection.RIGHT:
          newGroupWidth = initialWidth + worldDeltaX;
          break;
      }

      // 限制 group 尺寸，避免 0 或负值
      newGroupWidth = Math.max(MIN_SIZE, newGroupWidth);
      newGroupHeight = Math.max(MIN_SIZE, newGroupHeight);

      // 计算 group 缩放因子
      const sx = newGroupWidth / initialWidth;
      const sy = newGroupHeight / initialHeight;

      // 按 group 的锚点缩放每个元素的位置与尺寸
      for (const info of multi.elements) {
        const element = this.documentRef.current.elements[info.id];
        if (!element || !("size" in element) || !element.transform) continue;

        // 以 anchorWorld 为缩放中心，缩放元素中心位置
        const dx = info.center.x - anchorWorld.x;
        const dy = info.center.y - anchorWorld.y;

        const newCenter: Point = {
          x: anchorWorld.x + dx * sx,
          y: anchorWorld.y + dy * sy,
        };

        let newWidth = info.initialWidth * Math.abs(sx);
        let newHeight = info.initialHeight * Math.abs(sy);

        newWidth = Math.max(MIN_SIZE, newWidth);
        newHeight = Math.max(MIN_SIZE, newHeight);

        const newX = newCenter.x - newWidth / 2;
        const newY = newCenter.y - newHeight / 2;

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

        // 多选缩放时，暂不自动调整文本字号，避免复杂的多文本联动场景

        callback(info.id, updates);
      }

      return;
    }

    // 单元素缩放逻辑（原有逻辑）
    const elementId = this.scaleState.elementId;
    if (!elementId) {
      return;
    }

    const element = this.documentRef.current.elements[elementId];
    if (!element || !("size" in element) || !element.transform) {
      return;
    }

    const isTextElement = element.type === "text";
    const isCornerDirection =
      direction === ScaleDirection.TOP_LEFT ||
      direction === ScaleDirection.TOP_RIGHT ||
      direction === ScaleDirection.BOTTOM_LEFT ||
      direction === ScaleDirection.BOTTOM_RIGHT;

    // 文本元素在四角缩放时，始终保持等比缩放，避免文字被拉伸变形
    const keepAspectEffective =
      keepAspect || (isTextElement && isCornerDirection);

    // 将位移增量投影到元素本地坐标系（考虑旋转）
    // 这样即便元素被旋转，缩放依然沿着元素自身的水平/垂直方向进行
    const rotation = element.transform.rotation || 0;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // 本地坐标中的增量（右为正，下为正）
    const deltaX = cos * worldDeltaX + sin * worldDeltaY;
    const deltaY = -sin * worldDeltaX + cos * worldDeltaY;

    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newX = initialX;
    let newY = initialY;

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
        break;

      case ScaleDirection.TOP:
        // TOP中点：垂直拉伸，保持宽度不变，保持底部位置不变
        newHeight = initialHeight - deltaY;
        newWidth = initialWidth; // 保持宽度不变
        break;

      case ScaleDirection.RIGHT:
        // RIGHT中点：水平拉伸，保持高度不变，保持左侧位置不变
        newWidth = initialWidth + deltaX;
        newHeight = initialHeight; // 保持高度不变
        break;

      case ScaleDirection.BOTTOM:
        // BOTTOM中点：垂直拉伸，保持宽度不变，保持顶部位置不变
        newHeight = initialHeight + deltaY;
        newWidth = initialWidth; // 保持宽度不变
        break;

      case ScaleDirection.LEFT:
        // LEFT中点：水平拉伸，保持高度不变，保持右侧位置不变
        newWidth = initialWidth - deltaX;
        newHeight = initialHeight; // 保持高度不变
        break;
    }

    newWidth = Math.max(MIN_SIZE, newWidth);
    newHeight = Math.max(MIN_SIZE, newHeight);

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
    callback(elementId, updates);
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
