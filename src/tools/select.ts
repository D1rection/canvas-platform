import type { ToolHandler, ToolContext } from "./types";
import type { ID, Point } from "../canvas/schema/model";
import { DragTool } from "../canvas/tools/DragTool";

// 创建选择工具专用的拖拽工具实例
const dragTool = new DragTool();

// 框选时的全局事件监听器状态
let marqueeGlobalListeners: {
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
} | null = null;

// 元素拖拽时的全局事件监听器状态
let dragGlobalListeners: {
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
} | null = null;

/**
 * 初始化选择工具的拖拽依赖
 */
export function initSelectToolDependencies(
  updateElement: (id: string, updates: any) => void,
  documentRef: { current: any },
  viewportRef: { current: any },
  elementsLayerRef?: { current: HTMLElement | null }
) {
  dragTool.updateDependencies(updateElement, documentRef, viewportRef, elementsLayerRef);
}

/**
 * 检查元素是否正在被拖拽
 */
export function isElementBeingDragged(): boolean {
  return dragTool.isDragging();
}

/**
 * 创建右键菜单
 */
function createContextMenu(
  x: number,
  y: number,
  items: Array<{ label: string; onClick: () => void; disabled?: boolean }>,
  onClose: () => void
): HTMLElement {
  // 创建菜单容器
  const menu = document.createElement("div");
  menu.style.position = "fixed";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.backgroundColor = "#fff";
  menu.style.border = "1px solid #ccc";
  menu.style.borderRadius = "8px";
  menu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  menu.style.padding = "4px 0";
  menu.style.minWidth = "120px";
  menu.style.zIndex = "10000";
  menu.style.fontSize = "14px";
  menu.style.fontFamily = "system-ui, -apple-system, sans-serif";

  // 创建菜单项
  items.forEach((item) => {
    const menuItem = document.createElement("div");
    menuItem.textContent = item.label;
    menuItem.style.padding = "8px 16px";
    menuItem.style.cursor = item.disabled ? "not-allowed" : "pointer";
    menuItem.style.color = item.disabled ? "#999" : "#333";
    menuItem.style.userSelect = "none";
    menuItem.style.transition = "background-color 0.2s";

    if (!item.disabled) {
      menuItem.addEventListener("mouseenter", () => {
        menuItem.style.backgroundColor = "#f0f0f0";
      });
      menuItem.addEventListener("mouseleave", () => {
        menuItem.style.backgroundColor = "transparent";
      });
      menuItem.addEventListener("click", (e) => {
        e.stopPropagation();
        item.onClick();
        onClose();
      });
    }

    menu.appendChild(menuItem);
  });

  // 确保菜单不会超出视口
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - rect.width - 10}px`;
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - rect.height - 10}px`;
  }

  return menu;
}

/**
 * 移除右键菜单
 */
function removeContextMenu(menu: HTMLElement | null) {
  if (menu && menu.parentNode) {
    menu.parentNode.removeChild(menu);
  }
}

/**
 * 将屏幕坐标转换为世界坐标
 */
function screenToWorld(
  clientX: number,
  clientY: number,
  canvasElement: HTMLElement | null,
  viewport: { x: number; y: number; scale: number }
): Point | null {
  if (!canvasElement) return null;
  
  const rect = canvasElement.getBoundingClientRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;
  const scale = viewport.scale || 1;
  
  return {
    x: viewport.x + screenX / scale,
    y: viewport.y + screenY / scale,
  };
}

/**
 * 设置框选的全局事件监听器
 */
function setupMarqueeGlobalListeners(ctx: ToolContext, initialEv: PointerEvent) {
  // 如果已经有监听器，先清理
  cleanupMarqueeGlobalListeners();
  
  // 获取 canvas 元素（通过 overlayLayerRef 或 elementsLayerRef 的父元素）
  const canvasElement = 
    ctx.overlayLayerRef?.current?.parentElement ||
    ctx.elementsLayerRef?.current?.parentElement ||
    null;
  
  if (!canvasElement) {
    console.warn('无法找到 canvas 元素，无法设置全局监听器');
    return;
  }
  
  const onPointerMove = (e: PointerEvent) => {
    // 只处理主指针（通常是鼠标左键）
    if (e.pointerId !== initialEv.pointerId) return;
    
    const state = ctx.editor.getState();
    const point = screenToWorld(e.clientX, e.clientY, canvasElement, state.viewport);
    
    if (point && state.marqueeSelection?.startPoint) {
      ctx.editor.updateMarqueeSelection(point);
    }
  };
  
  const onPointerUp = (e: PointerEvent) => {
    // 只处理主指针
    if (e.pointerId !== initialEv.pointerId) return;
    
    const state = ctx.editor.getState();
    const point = screenToWorld(e.clientX, e.clientY, canvasElement, state.viewport);
    
    if (point && state.marqueeSelection?.startPoint) {
      ctx.editor.finishMarqueeSelection(point);
    }
    
    // 清理全局监听器
    cleanupMarqueeGlobalListeners();
  };
  
  // 添加全局监听器
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp); // 处理指针取消事件
  
  marqueeGlobalListeners = {
    onPointerMove,
    onPointerUp,
  };
}

/**
 * 清理框选的全局事件监听器
 */
function cleanupMarqueeGlobalListeners() {
  if (marqueeGlobalListeners) {
    document.removeEventListener('pointermove', marqueeGlobalListeners.onPointerMove);
    document.removeEventListener('pointerup', marqueeGlobalListeners.onPointerUp);
    document.removeEventListener('pointercancel', marqueeGlobalListeners.onPointerUp);
    marqueeGlobalListeners = null;
  }
}

/**
 * 设置元素拖拽的全局事件监听器
 * - 解决拖拽元素时鼠标移出画布 / 浏览器，无法收到 pointerup 的问题
 */
function setupDragGlobalListeners(initialEv: PointerEvent) {
  // 如果已经有监听器，先清理
  cleanupDragGlobalListeners();

  const onPointerMove = (e: PointerEvent) => {
    // 只处理同一指针
    if (e.pointerId !== initialEv.pointerId) return;
    // 只有在仍然处于拖拽状态时才处理
    if (!isElementBeingDragged()) return;

    dragTool.handlePointerMove(e.clientX, e.clientY);
  };

  const onPointerUp = (e: PointerEvent) => {
    // 只处理同一指针
    if (e.pointerId !== initialEv.pointerId) return;

    if (isElementBeingDragged()) {
      dragTool.handlePointerUp();
    }

    // 清理全局监听器
    cleanupDragGlobalListeners();
  };

  // 添加全局监听器
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);

  dragGlobalListeners = {
    onPointerMove,
    onPointerUp,
  };
}

/**
 * 清理元素拖拽的全局事件监听器
 */
function cleanupDragGlobalListeners() {
  if (dragGlobalListeners) {
    document.removeEventListener("pointermove", dragGlobalListeners.onPointerMove);
    document.removeEventListener("pointerup", dragGlobalListeners.onPointerUp);
    document.removeEventListener("pointercancel", dragGlobalListeners.onPointerUp);
    dragGlobalListeners = null;
  }
}

/**
 * 统一的元素拖拽开始处理函数
 */
function handleElementDragStart(ctx: ToolContext, mainId: ID, elementIds: ID[], ev: PointerEvent) {
  if (ev.button !== 0) return; // 只处理左键

  // 更新拖拽工具的依赖
  const state = ctx.editor.getState();
  // 从 ToolContext 获取 elementsLayerRef 和 overlayLayerRef（如果已设置）
  const elementsLayerRef = ctx.elementsLayerRef;
  const overlayLayerRef = ctx.overlayLayerRef;
  dragTool.updateDependencies(
    (id: string, updates: any) => ctx.editor.updateElement(id, updates),
    { current: state.document },
    { current: state.viewport },
    elementsLayerRef,
    overlayLayerRef
  );

  // 使用 requestAnimationFrame 延迟执行，确保选中框已渲染
  requestAnimationFrame(() => {
    // 启动拖拽
    const started = dragTool.handleElementPointerDown(mainId, ev as any, elementIds);

    // 启动成功后，设置全局拖拽监听，避免鼠标拖出画布/浏览器时丢失事件
    if (started) {
      setupDragGlobalListeners(ev);
    }
  });
}


/**
 * 选择工具
 *
 * - 点击元素：选中该元素
 * - 框选元素：框选元素
 * - 拖拽元素：拖拽元素
 * - 点击画布空白：清空选区
 */
export const selectTool: ToolHandler = {
  cursor: "default",
  onElementPointerDown: (ctx, id, ev) => {
    if (!ev) return;
    
    const state = ctx.editor.getState();
    const currentSelection = [...state.selection.selectedIds];
    
    // 如果按住 Ctrl/Cmd 键，添加/移除元素到/从选区
    if (ev.ctrlKey || ev.metaKey) {
      // 检查元素是否已经在选区中
      const index = currentSelection.indexOf(id);
      if (index >= 0) {
        // 如果元素已经在选区中，移除它
        currentSelection.splice(index, 1);
      } else {
        // 否则，添加元素到选区
        currentSelection.push(id);
      }
      ctx.editor.setSelection(currentSelection);
    } else {
      // 否则，只选择当前元素
      ctx.editor.setSelection([id]);
      
      // 处理元素拖拽
      handleElementDragStart(ctx, id, [id], ev);
    }
  },

  onSelectionBoxPointerDown: (ctx, selectedIds, ev) => {
    // 当点击选中框时，如果有选中元素，则拖拽所有选中元素
    if (selectedIds.length > 0) {
      handleElementDragStart(ctx, selectedIds[0], selectedIds, ev);
    }
  },

  onCanvasPointerDown: (ctx, point, ev) => {
    // 点击空白区域时清空选区（只有在不拖拽时）
    if (!isElementBeingDragged()) {
      const state = ctx.editor.getState();
      if(state.selection.selectedIds.length > 0) {
        ctx.editor.resetSelection();
      }
      // 框选区域起始
      ctx.editor.startMarqueeSelection(point);
      
      // 添加全局指针事件监听器，确保即使指针移出画布也能正确结束框选
      setupMarqueeGlobalListeners(ctx, ev);
    }
  },

  onCanvasPointerMove: (ctx, point, _ev) => {
    // 只处理框选，元素拖拽的 move 由全局监听器处理
    if (ctx.editor.getState().marqueeSelection?.startPoint) {
      ctx.editor.updateMarqueeSelection(point);
    }
  },

  onCanvasPointerUp: (ctx, point) => {
    // 只处理框选结束，元素拖拽的 up 由全局监听器处理
    if (ctx.editor.getState().marqueeSelection?.startPoint) {
      ctx.editor.finishMarqueeSelection(point);
    }
    // 清理框选的全局监听器
    cleanupMarqueeGlobalListeners();
  },

  onKeyDown: (ctx, ev) => {
    if((ev.ctrlKey || ev.metaKey) && ev.key === "c") {
      ev.preventDefault();
      ctx.editor.copySelection();
      ctx.message?.success('已复制元素');
      return;
    }
    if((ev.ctrlKey || ev.metaKey) && ev.key === "v") {
      ev.preventDefault();
      ctx.editor.paste();
      ctx.message?.success('已粘贴元素');
      return;
    }
  },

  onContextMenu: (ctx, ev) => {
    ev.preventDefault();
    
    const state = ctx.editor.getState();
    const { selection } = state;

    // 获取鼠标在画布上的场景坐标
    const canvasElement = (ev.target as HTMLElement).closest('[class*="root"]') as HTMLElement;
    let mouseX = 0;
    let mouseY = 0;
    
    if (canvasElement) {
      const rect = canvasElement.getBoundingClientRect();
      mouseX = (ev.clientX - rect.left) / (state.viewport.scale || 1) + state.viewport.x;
      mouseY = (ev.clientY - rect.top) / (state.viewport.scale || 1) + state.viewport.y;
    }

    // 构建菜单项
    const menuItems: Array<{ label: string; onClick: () => void; disabled?: boolean }> = [];

    // 如果有选中元素，显示复制和删除选项
    if (selection.selectedIds.length > 0) {
      menuItems.push({
        label: "复制",
        onClick: () => {
          ctx.editor.copySelection();
          ctx.message?.success('已复制元素');
        },
      });

      menuItems.push({
        label: "删除",
        onClick: () => {
          selection.selectedIds.forEach((id) => {
            ctx.editor.deleteElement(id);
          });
          ctx.editor.resetSelection();
          ctx.message?.success('已删除元素');
        },
      });
    }

    // 如果有剪贴板内容，显示粘贴选项
    if (state.clipboard?.elements?.length) {
      menuItems.push({
        label: "粘贴",
        onClick: () => {
          ctx.editor.paste(undefined, { x: mouseX, y: mouseY });
          ctx.message?.success('已粘贴元素到鼠标位置');
        },
      });
    }

    // 如果没有任何菜单项，不显示菜单
    if (menuItems.length === 0) {
      return;
    }

    // 创建并显示菜单
    let menu: HTMLElement | null = null;
    
    const closeMenu = () => {
      removeContextMenu(menu);
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("contextmenu", closeMenu);
      document.removeEventListener("keydown", handleEscape);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };

    menu = createContextMenu(ev.clientX, ev.clientY, menuItems, closeMenu);

    // 点击其他地方关闭菜单
    setTimeout(() => {
      document.addEventListener("click", closeMenu);
      document.addEventListener("contextmenu", closeMenu);
      document.addEventListener("keydown", handleEscape);
    }, 0);
  },
};
