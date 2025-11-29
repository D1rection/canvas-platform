import type { IHistoryService } from "../schema/interfaces";

export interface HistoryServiceOptions {
  /** 最大历史记录数，默认 50 */
  maxSize?: number;
}

/**
 * 创建历史记录服务
 *
 * 开发思路：
 * 1. 维护两个栈：undoStack（撤销栈）和 redoStack（重做栈）
 * 2. push：每次修改 document 前，将当前快照 push 到 undoStack，清空 redoStack
 * 3. undo：将当前状态 push 到 redoStack，从 undoStack pop 并返回
 * 4. redo：将当前状态 push 到 undoStack，从 redoStack pop 并返回
 * 5. 使用 structuredClone 深拷贝，避免引用问题
 * 6. 可配置 maxSize 限制历史记录数量，超出时移除最早的记录
 *
 * 使用方式：
 * - 在 editor.ts 的 EditorDependencies 中添加 historyService
 * - 在 setState 或修改 document 的操作前调用 historyService.push()
 * - 绑定快捷键 Ctrl+Z / Ctrl+Shift+Z 调用 undo / redo
 */
export function createHistoryService<T>(
  _options: HistoryServiceOptions = {}
): IHistoryService<T> {
  // TODO: 从 options 中解构 maxSize，默认 50
  // const { maxSize = 50 } = _options;

  // TODO: 初始化双栈
  // let undoStack: T[] = [];
  // let redoStack: T[] = [];

  /**
   * 记录快照到 undo 栈
   *
   * TODO:
   * 1. 将 snapshot 深拷贝后 push 到 undoStack
   * 2. 如果 undoStack.length > maxSize，shift 移除最早的
   * 3. 清空 redoStack（新操作会使 redo 历史失效）
   */
  const push: IHistoryService<T>["push"] = (_snapshot) => {
    throw new Error("push not implemented");
  };

  /**
   * 撤销
   *
   * TODO:
   * 1. 检查 undoStack 是否为空，为空返回 null
   * 2. 将 current 深拷贝后 push 到 redoStack
   * 3. 从 undoStack pop 并返回
   */
  const undo: IHistoryService<T>["undo"] = (_current) => {
    throw new Error("undo not implemented");
  };

  /**
   * 重做
   *
   * TODO:
   * 1. 检查 redoStack 是否为空，为空返回 null
   * 2. 将 current 深拷贝后 push 到 undoStack
   * 3. 从 redoStack pop 并返回
   */
  const redo: IHistoryService<T>["redo"] = (_current) => {
    throw new Error("redo not implemented");
  };

  /**
   * 是否可以撤销
   *
   * TODO: 返回 undoStack.length > 0
   */
  const canUndo: IHistoryService<T>["canUndo"] = () => {
    return false;
  };

  /**
   * 是否可以重做
   *
   * TODO: 返回 redoStack.length > 0
   */
  const canRedo: IHistoryService<T>["canRedo"] = () => {
    return false;
  };

  /**
   * 清空历史记录
   *
   * TODO: 重置 undoStack = [] 和 redoStack = []
   */
  const clear: IHistoryService<T>["clear"] = () => {
    throw new Error("clear not implemented");
  };

  return {
    push,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
  };
}

