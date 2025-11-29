import type { IEditorService, IIDService, IStorageService } from "../schema/interfaces";
import type { CanvasElement, CanvasPersistedState, CanvasRuntimeState, ID, ImageFilter, Point, ShapeElement, ShapeStyle, Size, TextSpan, Transform, ViewportState } from "../schema/model";

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
   * 获取当前画布运行时状态
   * @returns 当前画布运行时状态
   */
  const getState: IEditorService["getState"] = () => {
    return state;
  }

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
   */
  const setState = (nextState: CanvasRuntimeState) => {
    if (nextState === state) {
      return;
    }
    state = nextState;
    notify();

    if (storageService) {
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
  const setViewport: IEditorService["setViewport"] = (_viewport: ViewportState) => {
    const nextState: CanvasRuntimeState = {
      ...state,
      viewport: _viewport,
    };
    setState(nextState);
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
    setState(nextState);
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
    setState(nextState);
  };

  /**
   * 缩放视口
   * @param _point 缩放的中心点
   * @param _factor 缩放因子
   */
  const zoomAt: IEditorService["zoomAt"] = (_point: Point, _factor: number) => {
    const nextState: CanvasRuntimeState = {
      ...state,
      viewport: {
        ...state.viewport,
        scale: state.viewport.scale * _factor,
      },
    };
    setState(nextState);
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
      fill: '#000000',
      strokeColor: '#000000',
      strokeWidth: 1,
    };

    /** 默认大小 */
    const defaultSize: Size = { width: 100, height: 100 };

    const style: ShapeStyle = { ...defaultStyle, ..._payload.style };
    const size: Size = _payload.size ?? defaultSize;

    // 计算在当前视口中心位置的场景坐标
    const viewport = state.viewport;
    const centerX = viewport.x + (size.width / 2);
    const centerY = viewport.y + (size.height / 2);

    const newElement: ShapeElement = {
      id,
      type: 'shape',
      shape,
      style,
      size,
      transform: {
        x: centerX,
        y: centerY,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      visible: true,
      locked: false,
      parentId: null,
      zIndex: 0,
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
      }
    };

    setState(nextState);

    return id;
  };

  /**
   * 更新单个元素的通用字段
   * @param _id 目标元素 ID
   * @param _patch 需要更新的字段集合
   */
  const updateElement: IEditorService["updateElement"] = (_id: ID, _patch: Partial<CanvasElement>) => {
    const target = state.document.elements[_id];
    if (!target) {
      throw new Error(`Element with id ${_id} not found`);
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

    setState(nextState);
  };

  /**
   * 变换单个元素
   * @param _id 目标元素 ID
   * @param _patch 需要更新的变换字段集合
   */
  const transformElement: IEditorService["transformElement"] = (_id: ID, _patch: Partial<Transform>) => {
    const target = state.document.elements[_id];
    if (!target) {
      throw new Error(`Element with id ${_id} not found`);
    }

    const nextElement = {
      ...target,
      transform: {
        ...target.transform,
        ..._patch,
      }
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
    }

    setState(nextState);
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
        rootElementIds: state.document.rootElementIds.filter((rid) => rid !== _id),
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
    setState(nextState);
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

    setState(nextState);
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
    setState(nextState);
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
          (rid) => !toDelete.has(rid),
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
  // 图片相关（待实现）
  // ─────────────────────────────────────────────────────────────

  /**
   * 添加图片元素
   * @param _payload 图片配置
   * @returns 新添加的元素 ID
   */
  const addImage: IEditorService["addImage"] = (_payload) => {
    // TODO: 实现图片元素添加逻辑
    throw new Error("addImage not implemented");
  };

  /**
   * 更新图片滤镜
   * @param _id 目标图片元素 ID
   * @param _filters 新的滤镜列表
   */
  const updateImageFilters: IEditorService["updateImageFilters"] = (_id: ID, _filters: ImageFilter[]) => {
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
  const updateTextContent: IEditorService["updateTextContent"] = (_id: ID, _spans: TextSpan[]) => {
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
  const resizeElement: IEditorService["resizeElement"] = (_id: ID, _newSize: Size, _anchor?: 'nw' | 'ne' | 'sw' | 'se') => {
    // TODO: 实现元素缩放逻辑
    throw new Error("resizeElement not implemented");
  };

  /**
   * 缩放选中元素
   * @param _factor 缩放因子
   * @param _anchor 缩放锚点
   */
  const resizeSelection: IEditorService["resizeSelection"] = (_factor: number, _anchor?: 'nw' | 'ne' | 'sw' | 'se') => {
    // TODO: 实现选区缩放逻辑
    throw new Error("resizeSelection not implemented");
  };

  // ─────────────────────────────────────────────────────────────
  // 复制粘贴（待实现）
  // ─────────────────────────────────────────────────────────────

  /**
   * 复制选中元素到剪贴板
   */
  const copySelection: IEditorService["copySelection"] = () => {
    // TODO: 实现复制逻辑
    throw new Error("copySelection not implemented");
  };

  /**
   * 粘贴剪贴板内容
   * @param _offset 位置偏移
   * @returns 新粘贴的元素 ID 列表
   */
  const paste: IEditorService["paste"] = (_offset?: Point) => {
    // TODO: 实现粘贴逻辑
    throw new Error("paste not implemented");
  };

  // ─────────────────────────────────────────────────────────────
  // 悬停状态（待实现）
  // ─────────────────────────────────────────────────────────────

  /**
   * 设置悬停元素
   * @param _id 悬停元素 ID，null 清除悬停
   */
  const setHovered: IEditorService["setHovered"] = (_id: ID | null) => {
    // TODO: 实现悬停状态逻辑
    throw new Error("setHovered not implemented");
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
    };

    // 直接赋值
    state = nextState;
    notify();
    return true;
  };

  /**
   * 清空持久化存储并重置为空画布
   */
  const clearPersistedState: IEditorService["clearPersistedState"] = async () => {
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
    // TODO: 实现撤销逻辑，需要注入 historyService
    throw new Error("undo not implemented");
  };

  /**
   * 重做上一步撤销的操作
   * @returns 是否成功重做
   */
  const redo: IEditorService["redo"] = () => {
    // TODO: 实现重做逻辑，需要注入 historyService
    throw new Error("redo not implemented");
  };

  /**
   * 是否可以撤销
   */
  const canUndo: IEditorService["canUndo"] = () => {
    // TODO: 实现，需要注入 historyService
    return false;
  };

  /**
   * 是否可以重做
   */
  const canRedo: IEditorService["canRedo"] = () => {
    // TODO: 实现，需要注入 historyService
    return false;
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
  };
}