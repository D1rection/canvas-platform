import type {
  IEditorService,
  IIDService,
  IStorageService,
} from "../schema/interfaces";
import type {
  CanvasElement,
  CanvasPersistedState,
  CanvasRuntimeState,
  ID,
  ImageFilter,
  Point,
  ShapeElement,
  ShapeStyle,
  Size,
  TextSpan,
  Transform,
  ViewportState,
} from "../schema/model";

const documentID = "canvas_document_id";

/**
 * 创建一个基于闭包的画布编辑服务实现。
 * - 内部维护 `CanvasRuntimeState` 核心草稿数据结构
 */
export interface EditorDependencies {
  /** ID 生成服务 */
  idService: IIDService;
  /** 持久化服务 */
  storageService?: IStorageService;
}

export function createEditorService(deps: EditorDependencies): IEditorService {
  const { idService, storageService } = deps;

  /**
   * 初始状态
   */
  const initialState: CanvasRuntimeState = {
    document: {
      id: documentID,
      elements: {},
      rootElementIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    viewport: {
      x: 0,
      y: 0,
      scale: 1,
    },
    selection: {
      selectedIds: [],
    },
    clipboard: null,
    marqueeSelection: null,
  };

  /**
   * 当前画布运行时状态
   */
  let state: CanvasRuntimeState = initialState;

  /**
   * 订阅者列表
   */
  const listeners = new Set<(state: CanvasRuntimeState) => void>();

  /**
   * 操作历史栈 - 用于撤销/重做功能
   */
  interface HistoryRecord {
    state: CanvasRuntimeState;
    timestamp: number;
    description?: string;
  }

  // 历史记录栈
  const historyStack: HistoryRecord[] = [];
  // 重做栈
  const redoStack: HistoryRecord[] = [];
  // 历史记录最大数量限制
  const MAX_HISTORY_SIZE = 50;

  // 初始化历史记录
  historyStack.push({
    state: { ...initialState },
    timestamp: Date.now(),
    description: '初始状态'
  });

  // 是否正在执行撤销/重做操作的标志
  let isUndoRedoOperation = false;

  /**
   * 获取当前画布运行时状态
   * @returns 当前画布运行时状态
   */
  const getState: IEditorService["getState"] = () => {
    return state;
  };

  /**
   * 订阅画布运行时状态
   * @param listener 订阅者/观察者
   * @returns 取消订阅函数
   */
  const subscribe: IEditorService["subscribe"] = (listener) => {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  };

  /**
   * 通知所有订阅者/观察者
   */
  const notify = () => {
    for (const listener of listeners) {
      listener(state);
    }
  };

  /**
   * 更新画布运行时状态
   * @param nextState 新的画布运行时状态
   * @param options 额外选项
   *  - persist: 是否写入持久化存储（默认 true）
   *  - description: 操作描述（用于历史记录）
   */
  const setState = (
    nextState: CanvasRuntimeState,
    options?: { persist?: boolean, description?: string },
  ) => {
    if (nextState === state) {
      return;
    }
    
    // 如果不是撤销/重做操作，记录历史
    if (!isUndoRedoOperation) {
      // 保存当前状态到历史栈
      historyStack.push({
        state: JSON.parse(JSON.stringify(state)), // 深拷贝当前状态
        timestamp: Date.now(),
        description: options?.description || '操作'
      });
      
      // 限制历史记录大小
      if (historyStack.length > MAX_HISTORY_SIZE) {
        historyStack.shift();
      }
      
      // 清空重做栈
      redoStack.length = 0;
    }
    
    state = nextState;
    notify();

    const shouldPersist = options?.persist ?? true;
    if (shouldPersist && storageService) {
      const persisted: CanvasPersistedState = {
        document: state.document,
        viewport: state.viewport,
      };
      storageService.saveState(state.document.id, persisted);
    }
  };

  /**
   * 设置视口状态
   * @param _viewport 新的视口状态
   */
  const setViewport: IEditorService["setViewport"] = (
    _viewport: ViewportState
  ) => {
    const nextState: CanvasRuntimeState = {
      ...state,
      viewport: _viewport,
    };
    // 不触发持久化
    setState(nextState, { persist: false });
  };

  /**
   * 移动视口
   * @param _delta 移动的距离
   */
  const moveViewport: IEditorService["moveViewport"] = (_delta: Point) => {
    const nextState: CanvasRuntimeState = {
      ...state,
      viewport: {
        ...state.viewport,
        x: state.viewport.x + _delta.x,
        y: state.viewport.y + _delta.y,
      },
    };
    // 不触发持久化
    setState(nextState, { persist: false });
  };

  /**
   * 重置视口
   */
  const resetViewport: IEditorService["resetViewport"] = () => {
    const nextState: CanvasRuntimeState = {
      ...state,
      viewport: {
        x: 0,
        y: 0,
        scale: 1,
      },
    };
    // 不触发持久化
    setState(nextState, { persist: false });
  };

  /**
   * 缩放视口
   * @param _point 缩放的中心点
   * @param _factor 缩放倍数变化因子
   */
  const zoomAt: IEditorService["zoomAt"] = (_point: Point, _factor: number) => {
    if (_factor === 0) {
      return;
    }

    const viewport = state.viewport;
    const scale = viewport.scale;
    const nextScale = scale + _factor;

    const minScale = 0.1;
    const maxScale = 5;
    if(nextScale < minScale || nextScale > maxScale) {
      return;
    }

    const { x: vx0, y: vy0 } = viewport;
    const { x: wx, y: wy } = _point;

    // 以场景坐标 _point 为缩放中心，保持该点在视口上的位置不变
    // 推导公式：
    //   S = (W - vx0) * scale = (W - vx1) * nextScale
    //   => vx1 = W - (W - vx0) * (scale / nextScale)
    const vx1 = wx - (wx - vx0) * (scale / nextScale);
    const vy1 = wy - (wy - vy0) * (scale / nextScale);

    const nextState: CanvasRuntimeState = {
      ...state,
      viewport: {
        ...viewport,
        x: vx1,
        y: vy1,
        scale: nextScale,
      },
    };

    // 不触发持久化
    setState(nextState, { persist: false });
  };

  /**
   * 添加形状
   * @param _payload 形状的payload
   * @returns 新添加的元素的ID
   */
  const addShape: IEditorService["addShape"] = (_payload) => {
    const id = idService.generateNextID();
    const shape = _payload.shape;

    /** 默认样式 */
    const defaultStyle: ShapeStyle = {
      fill: '#ffffff',
      strokeColor: '#b5b5b5',
      strokeWidth: 1,
    };

    /** 默认大小 */
    const defaultSize: Size = { width: 100, height: 100 };

    const style: ShapeStyle = { ...defaultStyle, ..._payload.style };
    const size: Size = _payload.size ?? defaultSize;

    // 计算初始位置：优先使用 payload.position，否则默认放在当前视口中心附近
    const viewport = state.viewport;
    const defaultX = viewport.x + size.width / 2;
    const defaultY = viewport.y + size.height / 2;
    const position: Point = _payload.position ?? { x: defaultX, y: defaultY };

    const newElement: ShapeElement = {
      id,
      type: "shape",
      shape,
      style,
      size,
      transform: {
        x: position.x,
        y: position.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      visible: true,
      locked: false,
      parentId: null,
      zIndex: 0,
      opacity: 1, // 默认不透明
    };

    const nextState: CanvasRuntimeState = {
      ...state,
      document: {
        ...state.document,
        elements: { ...state.document.elements, [id]: newElement },
        rootElementIds: [...state.document.rootElementIds, id],
        updatedAt: Date.now(),
      },
      selection: {
        // 新添加的元素默认选中
        selectedIds: [id],
      },
    };

    setState(nextState);

    return id;
  };

  /**
   * 更新单个元素的通用字段
   * @param _id 目标元素 ID
   * @param _patch 需要更新的字段集合
   */

  const updateElement: IEditorService["updateElement"] = (
    _id: ID,
    _patch: Partial<CanvasElement>
  ) => {
    const target = state.document.elements[_id];

    // 关键修改：静默处理而不是抛出错误
    if (!target) {
      console.warn(
        `[SAFE] Element ${_id} not found in document, update skipped`
      );
      return; // 静默返回，不抛出错误
    }

    const nextElement = {
      ...target,
      ..._patch,
    } as CanvasElement;

    const nextState: CanvasRuntimeState = {
      ...state,
      document: {
        ...state.document,
        elements: {
          ...state.document.elements,
          [_id]: nextElement,
        },
        updatedAt: Date.now(),
      },
    };

    // 添加操作描述，区分是图片元素修改还是其他元素修改
    const description = target.type === 'image' ? '修改图片元素' : '修改元素';
    setState(nextState, { description });
  };

  /**
   * 变换单个元素
   * @param _id 目标元素 ID
   * @param _patch 需要更新的变换字段集合
   */
  const transformElement: IEditorService["transformElement"] = (
    _id: ID,
    _patch: Partial<Transform>
  ) => {
    const target = state.document.elements[_id];
    if (!target) {
      throw new Error(`Element with id ${_id} not found`);
    }

    const nextElement = {
      ...target,
      transform: {
        ...target.transform,
        ..._patch,
      },
    } as CanvasElement;

    const nextState: CanvasRuntimeState = {
      ...state,
      document: {
        ...state.document,
        elements: {
          ...state.document.elements,
          [_id]: nextElement,
        },
        updatedAt: Date.now(),
      },
    };

    // 添加操作描述，区分是图片元素变换还是其他元素变换
    const description = target.type === 'image' ? '变换图片元素' : '变换元素';
    setState(nextState, { description });
  };

  /**
   * 删除单个元素
   * @param _id 目标元素 ID
   */
  const deleteElement: IEditorService["deleteElement"] = (_id: ID) => {
    const target = state.document.elements[_id];
    if (!target) {
      throw new Error(`Element with id ${_id} not found`);
    }

    // 从 elements 字典中移除该元素
    const { [_id]: _removed, ...restElements } = state.document.elements;

    const nextState: CanvasRuntimeState = {
      ...state,
      document: {
        ...state.document,
        elements: restElements,
        rootElementIds: state.document.rootElementIds.filter(
          (rid) => rid !== _id
        ),
        updatedAt: Date.now(),
      },
      selection: {
        ...state.selection,
        selectedIds: state.selection.selectedIds.filter((sid) => sid !== _id),
      },
    };

    setState(nextState);
  };

  /**
   * 设置选区
   * @param _ids 目标元素 ID 列表
   */
  const setSelection: IEditorService["setSelection"] = (_ids: ID[]) => {
    const nextState: CanvasRuntimeState = {
      ...state,
      selection: {
        ...state.selection,
        selectedIds: _ids,
      },
    };

    // 不触发持久化
    setState(nextState, { persist: false });
  };

  /**
   * 移动选区
   * @param _delta 移动的距离
   */
  const moveSelection: IEditorService["moveSelection"] = (_delta: Point) => {
    const { x, y } = _delta;
    if (x === 0 && y === 0) {
      return;
    }

    const selectedIds = state.selection.selectedIds;
    if (!selectedIds.length) {
      return;
    }

    const nextElements: typeof state.document.elements = {
      ...state.document.elements,
    };

    for (const id of selectedIds) {
      const el = nextElements[id];
      if (!el) continue;

      nextElements[id] = {
        ...el,
        transform: {
          ...el.transform,
          x: el.transform.x + x,
          y: el.transform.y + y,
        },
      };
    }

    const nextState: CanvasRuntimeState = {
      ...state,
      document: {
        ...state.document,
        elements: nextElements,
        updatedAt: Date.now(),
      },
    };

    // 不触发持久化
    setState(nextState, { persist: false });
  };

  /**
   * 重置选区
   */
  const resetSelection: IEditorService["resetSelection"] = () => {
    const nextState: CanvasRuntimeState = {
      ...state,
      selection: {
        ...state.selection,
        selectedIds: [],
      },
    };
    // 不触发持久化
    setState(nextState, { persist: false });
  };

  /**
   * 删除当前选区中的所有元素
   */
  const deleteSelection: IEditorService["deleteSelection"] = () => {
    const selectedIds = state.selection.selectedIds;
    if (!selectedIds.length) {
      return;
    }

    const toDelete = new Set<ID>(selectedIds);

    // 过滤 elements
    const nextElements: typeof state.document.elements = {};
    for (const [id, el] of Object.entries(state.document.elements)) {
      if (!toDelete.has(id as ID)) {
        nextElements[id] = el;
      }
    }

    const nextState: CanvasRuntimeState = {
      ...state,
      document: {
        ...state.document,
        elements: nextElements,
        rootElementIds: state.document.rootElementIds.filter(
          (rid) => !toDelete.has(rid)
        ),
        updatedAt: Date.now(),
      },
      selection: {
        ...state.selection,
        selectedIds: [],
      },
    };

    setState(nextState);
  };

  // ─────────────────────────────────────────────────────────────
  // 图片相关
  // ─────────────────────────────────────────────────────────────

  /**
   * 添加图片元素
   * @param _payload 图片配置
   * @returns 新添加的元素 ID
   */
  const addImage: IEditorService["addImage"] = (_payload) => {
  const id = idService.generateNextID(); // 生成新 ID
  const { src, naturalSize, size = naturalSize, filters = [] } = _payload;

  // 默认的样式和变换
  const defaultTransform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  const newElement: CanvasElement = {
    id,
    type: 'image',
    src,
    naturalSize,
    size,
    transform: defaultTransform,
    visible: true,
    filters,
    locked: false,
    zIndex: 0,
    opacity: 1
  };

  // 更新状态
  const nextState: CanvasRuntimeState = {
    ...state,
    document: {
      ...state.document,
      elements: { ...state.document.elements, [id]: newElement },
      rootElementIds: [...state.document.rootElementIds, id],
      updatedAt: Date.now(),
    },
    selection: {
      selectedIds: [id], // 新添加的元素默认选中
    },
  };

  setState(nextState); // 更新状态
  return id; // 返回新元素的 ID
};

  /**
   * 更新图片滤镜
   * @param _id 目标图片元素 ID
   * @param _filters 新的滤镜列表
   */
  const updateImageFilters: IEditorService["updateImageFilters"] = (
    _id: ID,
    _filters: ImageFilter[]
  ) => {
    // TODO: 实现图片滤镜更新逻辑
    throw new Error("updateImageFilters not implemented");
  };

  // ─────────────────────────────────────────────────────────────
  // 文本相关（待实现）
  // ─────────────────────────────────────────────────────────────

  /**
   * 添加文本元素
   * @param _payload 文本配置
   * @returns 新添加的元素 ID
   */
  const addText: IEditorService["addText"] = (_payload) => {
    // TODO: 实现文本元素添加逻辑
    throw new Error("addText not implemented");
  };

  /**
   * 更新文本内容
   * @param _id 目标文本元素 ID
   * @param _spans 新的文本片段数组
   */
  const updateTextContent: IEditorService["updateTextContent"] = (
    _id: ID,
    _spans: TextSpan[]
  ) => {
    // TODO: 实现文本内容更新逻辑
    throw new Error("updateTextContent not implemented");
  };

  // ─────────────────────────────────────────────────────────────
  // 元素缩放（待实现）
  // ─────────────────────────────────────────────────────────────

  /**
   * 缩放单个元素
   * @param _id 目标元素 ID
   * @param _newSize 新尺寸
   * @param _anchor 缩放锚点
   */
  const resizeElement: IEditorService["resizeElement"] = (
    _id: ID,
    _newSize: Size,
    _anchor?: "nw" | "ne" | "sw" | "se"
  ) => {
    // TODO: 实现元素缩放逻辑
    throw new Error("resizeElement not implemented");
  };

  /**
   * 缩放选中元素
   * @param _factor 缩放因子
   * @param _anchor 缩放锚点
   */
  const resizeSelection: IEditorService["resizeSelection"] = (
    _factor: number,
    _anchor?: "nw" | "ne" | "sw" | "se"
  ) => {
    // TODO: 实现选区缩放逻辑
    throw new Error("resizeSelection not implemented");
  };

  // ─────────────────────────────────────────────────────────────
  // 复制粘贴
  // ─────────────────────────────────────────────────────────────

  /**
   * 粘贴计数器 - 用于累积偏移
   * 防止连续粘贴时元素重叠
   */
  let pasteCount = 0;

  /**
   * 复制选中元素到剪贴板
   */
  const copySelection: IEditorService["copySelection"] = () => {
    const { selectedIds } = state.selection;
    const { elements } = state.document;

    const copiedElements = selectedIds
      .map(id => elements[id])
      .filter(Boolean)
      .map(el => ({
        ...el,
        id: idService.generateNextID(),
      }));

    const nextState: CanvasRuntimeState = {
      ...state,
      clipboard: {
        elements: copiedElements,
        copiedAt: Date.now(),
      },
    };

    pasteCount = 0;

    setState(nextState, { persist: false });
  };

  /**
   * 粘贴剪贴板内容
   * @param _offset 位置偏移（剪贴板内容的基准偏移）
   * @param _pointerPosition 鼠标位置（场景坐标，如果提供则直接粘贴到该位置）
   * @returns 新粘贴的元素 ID 列表
   */
  const paste: IEditorService["paste"] = (_offset?: Point, _pointerPosition?: Point) => {
    if (state.clipboard === null || state.clipboard.elements.length === 0) {
      return [];
    }

    const { elements: copiedElements } = state.clipboard;
    const pastedIds: ID[] = [];
    const newElements: Record<ID, CanvasElement> = {};

    // 如果提供了鼠标位置，直接将元素粘贴到鼠标位置
    if (_pointerPosition) {
      pasteCount = 0; // 重置计数器

      const firstElement = copiedElements[0];
      if (firstElement) {
        // 计算相对偏移：其他元素相对于第一个元素的偏移
        const deltaX = _pointerPosition.x - firstElement.transform.x;
        const deltaY = _pointerPosition.y - firstElement.transform.y;

        copiedElements.forEach((element) => {
          const newId = idService.generateNextID();

          const newElement: CanvasElement = {
            ...element,
            id: newId,
            transform: {
              ...element.transform,
              x: element.transform.x + deltaX,
              y: element.transform.y + deltaY,
            },
          };

          newElements[newId] = newElement;
          pastedIds.push(newId);
        });
      }
    } else {
      // 没有鼠标位置，使用累积的偏移量逻辑
      const baseOffset = _offset || { x: 20, y: 20 };
      pasteCount += 1; // 增加计数器，确保每次粘贴都有不同偏移

      copiedElements.forEach((element, _index) => {
        const newId = idService.generateNextID();

        // 计算累积偏移：基础偏移 * 计数器
        const totalOffsetX = baseOffset.x * pasteCount;
        const totalOffsetY = baseOffset.y * pasteCount;

        const newElement: CanvasElement = {
          ...element,
          id: newId,
          transform: {
            ...element.transform,
            x: element.transform.x + totalOffsetX,
            y: element.transform.y + totalOffsetY,
          },
        };

        newElements[newId] = newElement;
        pastedIds.push(newId);
      });
    }

    // 更新文档状态
    const nextState: CanvasRuntimeState = {
      ...state,
      document: {
        ...state.document,
        elements: {
          ...state.document.elements,
          ...newElements,
        },
        rootElementIds: [
          ...state.document.rootElementIds,
          ...pastedIds,
        ],
        updatedAt: Date.now(),
      },
      selection: {
        ...state.selection,
        selectedIds: pastedIds, // 选中新粘贴的元素
      },
    };

    setState(nextState);
    return pastedIds;
  };

  // ─────────────────────────────────────────────────────────────
  // 悬停状态
  // ─────────────────────────────────────────────────────────────

  /**
   * 设置悬停元素
   * @param _id 悬停元素 ID，null 清除悬停
   */
  const setHovered: IEditorService["setHovered"] = (_id: ID | null) => {
    const nextState: CanvasRuntimeState = {
      ...state,
      selection: {
        ...state.selection,
        hoveredId: _id ?? undefined,
      },
    };
    setState(nextState, { persist: false });
  };

  // ─────────────────────────────────────────────────────────────
  // 持久化
  // ─────────────────────────────────────────────────────────────

  /**
   * 检查是否存在持久化数据
   * @returns 是否存在可恢复的数据
   */
  const hasPersistedState: IEditorService["hasPersistedState"] = async () => {
    if (!storageService) {
      return false;
    }
    const persisted = await storageService.loadState(documentID);
    if (!persisted) {
      return false;
    }
    // 检查是否有实际内容（至少有一个元素）
    return persisted.document.rootElementIds.length > 0;
  };

  /**
   * 从持久化存储加载状态
   * @returns 是否成功加载
   */
  const loadPersistedState: IEditorService["loadPersistedState"] = async () => {
    if (!storageService) {
      return false;
    }
    const persisted = await storageService.loadState(documentID);
    if (!persisted) {
      return false;
    }

    const nextState: CanvasRuntimeState = {
      document: persisted.document,
      viewport: persisted.viewport ?? { x: 0, y: 0, scale: 1 },
      selection: { selectedIds: [] },
      clipboard: null,
      marqueeSelection: null,
    };

    // 直接赋值
    state = nextState;
    notify();
    return true;
  };

  /**
   * 清空持久化存储并重置为空画布
   */
  const clearPersistedState: IEditorService["clearPersistedState"] =
    async () => {
      // 重置为初始状态
      state = {
        document: {
          id: documentID,
          elements: {},
          rootElementIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        viewport: { x: 0, y: 0, scale: 1 },
        selection: { selectedIds: [] },
        clipboard: null,
        marqueeSelection: null,
      };
      notify();

      // 保存空状态到存储
      if (storageService) {
        await storageService.saveState(documentID, {
          document: state.document,
          viewport: state.viewport,
        });
      }
    };

  // ─────────────────────────────────────────────────────────────
  // 撤销/重做（待实现）
  // ─────────────────────────────────────────────────────────────

  /**
   * 撤销上一步操作
   * @returns 是否成功撤销
   */
  const undo: IEditorService["undo"] = () => {
    if (historyStack.length <= 1) {
      return false;
    }
    
    // 保存当前状态到重做栈
    redoStack.push({
      state: JSON.parse(JSON.stringify(state)),
      timestamp: Date.now(),
      description: '撤销前状态'
    });
    
    // 从历史栈中弹出前一个状态
    const previousState = historyStack.pop();
    if (!previousState) {
      return false;
    }
    
    // 设置为撤销/重做操作，避免再次记录历史
    isUndoRedoOperation = true;
    
    try {
      // 恢复到前一个状态
      state = JSON.parse(JSON.stringify(previousState.state));
      notify();
      return true;
    } catch (error) {
      console.error('撤销操作失败:', error);
      return false;
    } finally {
      // 重置操作标志
      isUndoRedoOperation = false;
    }
  };

  /**
   * 重做上一步撤销的操作
   * @returns 是否成功重做
   */
  const redo: IEditorService["redo"] = () => {
    if (redoStack.length === 0) {
      return false;
    }
    
    // 保存当前状态到历史栈
    historyStack.push({
      state: JSON.parse(JSON.stringify(state)),
      timestamp: Date.now(),
      description: '重做前状态'
    });
    
    // 从重做栈中弹出下一个状态
    const nextState = redoStack.pop();
    if (!nextState) {
      return false;
    }
    
    // 设置为撤销/重做操作，避免再次记录历史
    isUndoRedoOperation = true;
    
    try {
      // 恢复到下一个状态
      state = JSON.parse(JSON.stringify(nextState.state));
      notify();
      return true;
    } catch (error) {
      console.error('重做操作失败:', error);
      return false;
    } finally {
      // 重置操作标志
      isUndoRedoOperation = false;
    }
  };

  /**
   * 是否可以撤销
   */
  const canUndo: IEditorService["canUndo"] = () => {
    return historyStack.length > 1;
  };

  /**
   * 是否可以重做
   */
  const canRedo: IEditorService["canRedo"] = () => {
    return redoStack.length > 0;
  };

  // ─────────────────────────────────────────────────────────────
  // 框选相关
  // ─────────────────────────────────────────────────────────────

  /**
   * 开始框选操作
   * @param _startPoint 框选的起始点（场景坐标）
   */
  const startMarqueeSelection: IEditorService["startMarqueeSelection"] = (_startPoint: Point) => {
    const nextState: CanvasRuntimeState = {
      ...state,
      marqueeSelection: {
        startPoint: _startPoint,
        endPoint: _startPoint,
      },
    };
    setState(nextState, { persist: false });
  };

  /**
   * 更新框选操作
   * @param _currentPoint 框选的当前点（场景坐标）
   */
  const updateMarqueeSelection: IEditorService["updateMarqueeSelection"] = (_currentPoint: Point) => {
    if (!state.marqueeSelection) {
      console.warn('[MarqueeSelection] No active marquee selection to update');
      return;
    }

    const nextState: CanvasRuntimeState = {
      ...state,
      marqueeSelection: {
        ...state.marqueeSelection,
        endPoint: _currentPoint,
      },
    };
    setState(nextState, { persist: false });
  };

  /**
   * 完成框选操作，并根据框选范围选中相交的元素
   * @param _endPoint 框选的结束点（场景坐标）
   * @returns 选中的元素ID数组
   */
  const finishMarqueeSelection: IEditorService["finishMarqueeSelection"] = (_endPoint: Point) => {
    if (!state.marqueeSelection) {
      // console.warn('[MarqueeSelection] No active marquee selection to finish');
      return [];
    }

    // 计算框选矩形
    const marqueeRect = {
      x: Math.min(state.marqueeSelection.startPoint.x, _endPoint.x),
      y: Math.min(state.marqueeSelection.startPoint.y, _endPoint.y),
      width: Math.abs(_endPoint.x - state.marqueeSelection.startPoint.x),
      height: Math.abs(_endPoint.y - state.marqueeSelection.startPoint.y),
    };

    // 最小框选阈值
    if (marqueeRect.width < 5 || marqueeRect.height < 5) {
      const nextState = { ...state, marqueeSelection: null };
      setState(nextState, { persist: false });
      return [];
    }

    // 查找相交的元素
    const selectedIds: ID[] = [];
    for (const elementId of state.document.rootElementIds) {
      const element = state.document.elements[elementId];
      if (!element || !element.visible) continue;

      // 只处理有尺寸的元素（如图形元素）
      if ("size" in element) {
        const elementRect = {
          x: element.transform.x,
          y: element.transform.y,
          width: element.size.width,
          height: element.size.height,
        };

        // 使用分离轴定理检测相交
        if (
          !(elementRect.x > marqueeRect.x + marqueeRect.width ||
            elementRect.x + elementRect.width < marqueeRect.x ||
            elementRect.y > marqueeRect.y + marqueeRect.height ||
            elementRect.y + elementRect.height < marqueeRect.y)
        ) {
          selectedIds.push(elementId);
        }
      }
    }

    const nextState: CanvasRuntimeState = {
      ...state,
      selection: {
        ...state.selection,
        selectedIds,
      },
      marqueeSelection: null,
    };
    setState(nextState, { persist: false });

    return selectedIds;
  };

  /**
   * 取消框选操作
   */
  const cancelMarqueeSelection: IEditorService["cancelMarqueeSelection"] = () => {
    if (!state.marqueeSelection) {
      return;
    }

    const nextState: CanvasRuntimeState = {
      ...state,
      marqueeSelection: null,
    };
    setState(nextState, { persist: false });
  };

  return {
    getState,
    subscribe,
    setViewport,
    moveViewport,
    resetViewport,
    zoomAt,
    addShape,
    updateElement,
    transformElement,
    deleteElement,
    setSelection,
    moveSelection,
    resetSelection,
    deleteSelection,
    addImage,
    updateImageFilters,
    addText,
    updateTextContent,
    resizeElement,
    resizeSelection,
    copySelection,
    paste,
    setHovered,
    hasPersistedState,
    loadPersistedState,
    clearPersistedState,
    undo,
    redo,
    canUndo,
    canRedo,
    startMarqueeSelection,
    updateMarqueeSelection,
    finishMarqueeSelection,
    cancelMarqueeSelection,
  };
}
