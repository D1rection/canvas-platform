import type { ToolHandler } from "./types";

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
 * 选择工具
 *
 * - 点击元素：选中该元素
 * - 点击画布空白：清空选区
 */
export const selectTool: ToolHandler = {
  cursor: "default",
  onElementPointerDown: (ctx, id) => {
    ctx.editor.setSelection([id]);
  },

  onCanvasPointerDown: (ctx, point) => {
    // 点击空白区域时清空选区
    const state = ctx.editor.getState();
    if(state.selection.selectedIds.length > 0) {
      ctx.editor.resetSelection();
    }
    // 框选区域起始
    ctx.editor.startMarqueeSelection(point);
  },

  onCanvasPointerMove: (ctx, point, _ev) => {
    if(ctx.editor.getState().marqueeSelection?.startPoint) {
      ctx.editor.updateMarqueeSelection(point);
    }
  },

  onCanvasPointerUp: (ctx, point) => {
    ctx.editor.finishMarqueeSelection(point);
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
