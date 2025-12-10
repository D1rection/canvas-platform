import type React from "react";
import type {
  ID,
  Point,
  CanvasElement,
  Size,
  Transform,
} from "../schema/model";

/**
 * 多选旋转时，每个元素的初始信息
 */
interface MultiRotateElementInfo {
  id: ID;
  center: Point;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  initialRotation: number;
}

/**
 * 多选旋转相关状态
 */
interface MultiRotateState {
  pivot: Point;
  elements: MultiRotateElementInfo[];
}

/**
 * 旋转状态接口定义
 */
export interface RotateState {
  isRotating: boolean;
  /** 单选元素的 id，多选时为 undefined */
  elementId: ID | undefined;
  /** 鼠标按下时，pointer 相对于 pivot 的初始角度 */
  startAngle: number;
  /** 单元素旋转时的初始 rotation，多选时不用 */
  initialRotation: number;
  /** 旋转中心（单选：元素中心；多选：大选框中心） */
  elementCenter: Point;
  /** 多选旋转的附加信息 */
  multi?: MultiRotateState;
}

// === 工具函数：从 transform + size 计算旋转后的四个顶点（世界坐标） ===
function getElementCorners(transform: Transform, size: Size): Point[] {
  const { x, y, rotation, scaleX, scaleY } = transform;
  const { width, height } = size;

  const scaledWidth = width * scaleX;
  const scaledHeight = height * scaleY;

  const localCorners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  const centerX = scaledWidth / 2;
  const centerY = scaledHeight / 2;

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return localCorners.map((corner) => {
    const cx = corner.x * scaleX;
    const cy = corner.y * scaleY;

    const relativeX = cx - centerX;
    const relativeY = cy - centerY;

    const rotatedX = relativeX * cos - relativeY * sin;
    const rotatedY = relativeX * sin + relativeY * cos;

    return {
      x: x + centerX + rotatedX,
      y: y + centerY + rotatedY,
    };
  });
}

/**
 * 计算一组元素旋转后的整体包围盒（世界坐标）
 */
function calculateWorldBounds(
  elements: Array<CanvasElement & { size: Size }>,
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (!elements.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    const corners = getElementCorners(el.transform, el.size);
    corners.forEach((corner) => {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    });
  });

  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * 旋转工具类，封装了旋转相关的方法和状态管理
 */
export class RotateTool {
  private rotateState: RotateState | null = null;
  private onUpdateElementCallback:
    | ((id: ID, updates: Partial<CanvasElement>) => void)
    | undefined;
  private documentRef:
    | { current: { elements: Record<ID, CanvasElement> } }
    | undefined;
  private viewportRef:
    | { current: { x: number; y: number; scale: number } }
    | undefined;
  private stylesRef: { root: string } | undefined;
  private selectionRef:
    | { current: { selectedIds: ID[] } }
    | undefined;

  // DOM 预览：记录最后一次单元素 / 多元素旋转结果
  private lastSinglePreview:
    | {
        id: ID;
        rotation: number;
      }
    | null = null;

  private lastMultiPreview: Map<ID, { x: number; y: number; rotation: number }> | null =
    null;

  // 保存事件监听器引用，确保能正确移除
  private moveListener: ((e: PointerEvent) => void) | null = null;
  private upListener: ((e: PointerEvent) => void) | null = null;

  // 旋转结束回调（由外部 CanvasView 设置）
  public onRotateEnd?: () => void;

  /**
   * 初始化旋转工具
   * @param onUpdateElement 元素更新回调函数
   * @param documentRef 文档引用
   * @param viewportRef 视口引用
   * @param stylesRef 样式引用
   * @param selectionRef 选中状态引用（用于多选旋转）
   */
  constructor(
    onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void,
    documentRef?: { current: { elements: Record<ID, CanvasElement> } },
    viewportRef?: { current: { x: number; y: number; scale: number } },
    stylesRef?: { root: string },
    selectionRef?: { current: { selectedIds: ID[] } },
  ) {
    this.onUpdateElementCallback = onUpdateElement;
    this.documentRef = documentRef;
    this.viewportRef = viewportRef;
    this.stylesRef = stylesRef;
    this.selectionRef = selectionRef;
  }

  /**
   * 更新旋转工具的依赖项
   */
  updateDependencies(
    onUpdateElement?: (id: ID, updates: Partial<CanvasElement>) => void,
    documentRef?: { current: { elements: Record<ID, CanvasElement> } },
    viewportRef?: { current: { x: number; y: number; scale: number } },
    stylesRef?: { root: string },
    selectionRef?: { current: { selectedIds: ID[] } },
  ) {
    if (onUpdateElement !== undefined)
      this.onUpdateElementCallback = onUpdateElement;
    if (documentRef !== undefined) this.documentRef = documentRef;
    if (viewportRef !== undefined) this.viewportRef = viewportRef;
    if (stylesRef !== undefined) this.stylesRef = stylesRef;
    if (selectionRef !== undefined) this.selectionRef = selectionRef;
  }

  /**
   * 计算两个点之间的角度（0-360）
   */
  private calculateAngle(center: Point, point: Point): number {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    return angle;
  }

  /**
   * 单元素旋转预览：直接修改 DOM 中的 transform，不改 state
   */
  private applySingleRotationPreview(id: ID, rotation: number): void {
    const el = document.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (!el) return;

    const model = this.documentRef?.current?.elements[id];
    if (model?.type === "text") {
      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) {
        inner.style.transform = `rotate(${rotation}deg)`;
      }
    } else {
      el.style.transform = `rotate(${rotation}deg)`;
    }

    // 同步单选/文本选框的旋转
    const selectorSuffix = `[data-element-id="${id}"]`;
    const singleBox = document.querySelector<HTMLElement>(
      `[data-selection-box="single"]${selectorSuffix}`,
    );
    if (singleBox) {
      singleBox.style.transform = `rotate(${rotation}deg)`;
    }
    const textBox = document.querySelector<HTMLElement>(
      `[data-selection-box="text"]${selectorSuffix}`,
    );
    if (textBox) {
      textBox.style.transform = `rotate(${rotation}deg)`;
    }
  }

  /**
   * 多选旋转时，更新单个元素的 DOM 预览（位置 + 旋转）
   */
  private applyElementRotationPreview(
    id: ID,
    newX: number,
    newY: number,
    width: number,
    height: number,
    rotation: number,
  ): void {
    if (!this.viewportRef?.current) return;
    const { x: vx, y: vy, scale } = this.viewportRef.current;

    const screenX = (newX - vx) * scale;
    const screenY = (newY - vy) * scale;
    const screenW = width * scale;
    const screenH = height * scale;

    const el = document.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (!el) return;

    const model = this.documentRef?.current?.elements[id];

    const style = el.style;
    style.left = `${screenX}px`;
    style.top = `${screenY}px`;
    style.width = `${screenW}px`;
    style.height = `${screenH}px`;

    if (model?.type === "text") {
      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) {
        inner.style.transform = `rotate(${rotation}deg)`;
      }
    } else {
      style.transform = `rotate(${rotation}deg)`;
    }
  }

  /**
   * 多选旋转时，更新大选框（MultiSelectionBox）的 DOM 预览
   */
  private applyMultiSelectionPreview(
    groupMinX: number,
    groupMinY: number,
    groupWidth: number,
    groupHeight: number,
  ): void {
    if (!this.viewportRef?.current) return;
    const { x: vx, y: vy, scale } = this.viewportRef.current;

    const left = (groupMinX - vx) * scale;
    const top = (groupMinY - vy) * scale;
    const width = groupWidth * scale;
    const height = groupHeight * scale;

    const box = document.querySelector<HTMLElement>(
      '[data-selection-box="true"]',
    );
    if (!box) return;

    const style = box.style;
    style.left = `${left}px`;
    style.top = `${top}px`;
    style.width = `${width}px`;
    style.height = `${height}px`;
  }

  /**
   * 处理旋转控制点的指针按下事件
   * @param id 单选元素 ID，多选时为 undefined
   */
  handleRotateHandlePointerDown(
    id: ID | undefined,
    e: React.PointerEvent<HTMLElement>,
  ): boolean {
    if (!this.documentRef?.current || !this.viewportRef?.current || !e) {
      return false;
    }

    const viewport = this.viewportRef.current;
    const rootElement = document.querySelector(`.${this.stylesRef?.root || ""}`);
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

    // 多选旋转：以大选框中心为 pivot
    if (!id) {
      const selectedIds = this.selectionRef?.current?.selectedIds || [];
      if (selectedIds.length < 2) return false;

      const elements = selectedIds
        .map((elId) => this.documentRef!.current.elements[elId])
        .filter(
          (el): el is CanvasElement & { size: Size } =>
            !!el && "size" in el && !!(el as CanvasElement & { size: Size }).size,
        );

      if (elements.length < 2) return false;

      const bounds = calculateWorldBounds(elements);
      if (!bounds) return false;

      const pivot: Point = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      };

      const currentAngle = this.calculateAngle(pivot, worldPoint);

      const multi: MultiRotateState = {
        pivot,
        elements: elements.map((el) => ({
          id: el.id,
          center: {
            x: el.transform.x + el.size.width / 2,
            y: el.transform.y + el.size.height / 2,
          },
          width: el.size.width,
          height: el.size.height,
          scaleX: el.transform.scaleX ?? 1,
          scaleY: el.transform.scaleY ?? 1,
          initialRotation: el.transform.rotation ?? 0,
        })),
      };

      this.rotateState = {
        isRotating: true,
        elementId: undefined,
        startAngle: currentAngle,
        initialRotation: 0,
        elementCenter: pivot,
        multi,
      };
    } else {
      // 单元素旋转：以元素中心为 pivot
      const element = this.documentRef.current.elements[id];
      if (!element || !("size" in element) || !element.transform) {
        return false;
      }

      const { size, transform } = element as CanvasElement & { size: Size };

      const elementCenter: Point = {
        x: transform.x + size.width / 2,
        y: transform.y + size.height / 2,
      };

      const currentAngle = this.calculateAngle(elementCenter, worldPoint);

      this.rotateState = {
        isRotating: true,
        elementId: id,
        startAngle: currentAngle,
        initialRotation: transform.rotation || 0,
        elementCenter,
      };
    }

    // 注册全局事件监听（使用固定引用，便于移除）
    this.moveListener = (event: PointerEvent) => this.handleGlobalPointerMove(event);
    this.upListener = () => this.handleGlobalPointerUp();

    document.addEventListener("pointermove", this.moveListener);
    document.addEventListener("pointerup", this.upListener);
    document.addEventListener("pointercancel", this.upListener);

    document.body.style.cursor = "grabbing";

    // 开始旋转前清空上一次预览
    this.lastSinglePreview = null;
    this.lastMultiPreview = null;

    return true;
  }

  /**
   * 处理全局鼠标移动事件（用于旋转操作）
   */
  private handleGlobalPointerMove(e: PointerEvent): void {
    if (
      !this.rotateState ||
      !this.rotateState.isRotating ||
      !this.viewportRef?.current
    ) {
      return;
    }

    const { startAngle, initialRotation, elementCenter, elementId, multi } =
      this.rotateState;

    const viewport = this.viewportRef.current;
    const rootElement = document.querySelector(`.${this.stylesRef?.root || ""}`);
    if (!rootElement) {
      return;
    }

    const rect = rootElement.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint: Point = {
      x: viewport.x + screenX / viewport.scale,
      y: viewport.y + screenY / viewport.scale,
    };

    const newAngle = this.calculateAngle(elementCenter, worldPoint);
    let angleDiff = newAngle - startAngle;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;

    if (multi && multi.elements.length > 0 && this.documentRef?.current) {
      // 多选旋转
      const rad = (angleDiff * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const pivot = multi.pivot;

      if (!this.lastMultiPreview) {
        this.lastMultiPreview = new Map();
      }
      this.lastMultiPreview.clear();

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const info of multi.elements) {
        const {
          id,
          center,
          width,
          height,
          scaleX,
          scaleY,
          initialRotation: baseRot,
        } = info;

        const dx0 = center.x - pivot.x;
        const dy0 = center.y - pivot.y;
        const dx = dx0 * cos - dy0 * sin;
        const dy = dx0 * sin + dy0 * cos;
        const newCenterX = pivot.x + dx;
        const newCenterY = pivot.y + dy;

        const newRotation = ((baseRot + angleDiff) % 360 + 360) % 360;

        const newX = newCenterX - width / 2;
        const newY = newCenterY - height / 2;

        this.lastMultiPreview.set(id, {
          x: newX,
          y: newY,
          rotation: newRotation,
        });

        this.applyElementRotationPreview(
          id,
          newX,
          newY,
          width,
          height,
          newRotation,
        );

        // 计算该元素旋转后的四个角，用于更新整体包围盒
        const virtualTransform: Transform = {
          x: newX,
          y: newY,
          scaleX,
          scaleY,
          rotation: newRotation,
        };
        const corners = getElementCorners(virtualTransform, {
          width,
          height,
        });
        corners.forEach((corner) => {
          minX = Math.min(minX, corner.x);
          minY = Math.min(minY, corner.y);
          maxX = Math.max(maxX, corner.x);
          maxY = Math.max(maxY, corner.y);
        });
      }

      if (Number.isFinite(minX)) {
        this.applyMultiSelectionPreview(minX, minY, maxX - minX, maxY - minY);
      }
    } else if (elementId && this.documentRef?.current) {
      // 单元素旋转
      const element = this.documentRef.current.elements[elementId];
      if (!element || !element.transform) return;

      let newRotation = initialRotation + angleDiff;
      newRotation = ((newRotation % 360) + 360) % 360;

      this.lastSinglePreview = { id: elementId, rotation: newRotation };
      this.applySingleRotationPreview(elementId, newRotation);
    }
  }

  /**
   * 处理全局鼠标松开事件（用于结束旋转操作）
   */
  private handleGlobalPointerUp(): void {
    const callback = this.onUpdateElementCallback;
    const singlePreview = this.lastSinglePreview;
    const multiPreview = this.lastMultiPreview;

    // 清空预览缓存
    this.lastSinglePreview = null;
    this.lastMultiPreview = null;

    // 清理旋转状态
    this.rotateState = null;

    // 移除全局事件监听器
    if (this.moveListener) {
      document.removeEventListener("pointermove", this.moveListener);
      this.moveListener = null;
    }
    if (this.upListener) {
      document.removeEventListener("pointerup", this.upListener);
      document.removeEventListener("pointercancel", this.upListener);
      this.upListener = null;
    }

    // 恢复鼠标样式为默认状态
    document.body.style.cursor = "";

    // 在鼠标松开时，将最后一次 DOM 预览的结果一次性写入状态
    if (callback && this.documentRef?.current) {
      if (multiPreview && multiPreview.size > 0) {
        multiPreview.forEach((info, id) => {
          const element = this.documentRef!.current.elements[id];
          if (!element || !element.transform) return;

          callback(id, {
            transform: {
              ...element.transform,
              x: info.x,
              y: info.y,
              rotation: info.rotation,
            },
          });
        });
      } else if (singlePreview) {
        const element = this.documentRef.current.elements[singlePreview.id];
        if (element && element.transform) {
          callback(singlePreview.id, {
            transform: {
              ...element.transform,
              rotation: singlePreview.rotation,
            },
          });
        }
      }
    }

    // 触发旋转结束回调
    if (this.onRotateEnd) {
      this.onRotateEnd();
    }
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

