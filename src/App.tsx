import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { CanvasView } from "./components/canvas/CanvasView";
import { Toolbar, type ToolType } from "./components/toolbar/Toolbar";
import { RecoveryModal } from "./components/recovery/RecoveryModal";
import type { CanvasRuntimeState, ID, Point } from "./canvas/schema/model";
import type { CanvasContainer } from "./canvas/di/container";
import { getToolHandler, type ToolContext } from "./tools";
import styles from "./App.module.css";
import { ZoomControl } from "./components/zoomcontrol/ZoomControl";
import { VerticalScrollbar } from "./components/scrollbar/VerticalScrollbar";

interface AppProps {
  canvasContainer: CanvasContainer;
}

function App({ canvasContainer }: AppProps) {
  const { editorService } = canvasContainer;
  const [currentTool, setCurrentTool] = useState<ToolType>("select");
  const [canvasState, setCanvasState] = useState<CanvasRuntimeState>(() =>
    editorService.getState(),
  );
  // 画布平移预览
  const panPreviewApplyRef = useRef<((offset: { dx: number; dy: number } | null) => void) | null>(null);
  // 元素层 DOM 引用，用于拖拽预览
  const elementsLayerRef = useRef<HTMLElement | null>(null);
  // 覆盖层 DOM 引用，用于选中框操作
  const overlayLayerRef = useRef<HTMLElement | null>(null);
  const temporaryToolRef = useRef<ToolType | null>(null);
  // 画布视口容器 DOM 引用，用于计算可视高度
  const viewportWrapperRef = useRef<HTMLDivElement | null>(null);
  const [viewportPixelHeight, setViewportPixelHeight] = useState(0);


  // 设置工具
  const setTool = (tool: ToolType) => {
    if(tool !== currentTool) {
      editorService.resetSelection();
    }
    setCurrentTool(tool);
  };

  // 恢复弹窗状态
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 检查是否有持久化数据
  useEffect(() => {
    const checkPersistedState = async () => {
      const hasData = await editorService.hasPersistedState();
      if (hasData) {
        setShowRecoveryModal(true);
      } else {
        setIsInitialized(true);
      }
    };
    checkPersistedState();
  }, [editorService]);

  // 监听画布容器尺寸变化，用于驱动画布滚动条
  useEffect(() => {
    const element = viewportWrapperRef.current;
    if (!element) {
      return;
    }

    // 使用 ResizeObserver 确保在全屏等场景下也能拿到正确高度
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setViewportPixelHeight(entry.contentRect.height);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [viewportWrapperRef.current]);


  // 恢复画布
  const handleRecover = useCallback(async () => {
    await editorService.loadPersistedState();
    setShowRecoveryModal(false);
    setIsInitialized(true);
  }, [editorService]);

  // 重置为空画布
  const handleReset = useCallback(async () => {
    await editorService.clearPersistedState();
    setShowRecoveryModal(false);
    setIsInitialized(true);
  }, [editorService]);

  // 订阅编辑层状态，驱动渲染
  useEffect(() => {
  const unsubscribe = editorService.subscribe((next) => {
    setCanvasState({ ...next }); // 强制新引用
  });
  return unsubscribe;
}, [editorService]);

  // 获取当前工具的处理器
  const toolHandler = getToolHandler(currentTool);

  // 工具上下文：传递给工具处理器的依赖
  const toolContext: ToolContext = useMemo(
    () => ({
      editor: editorService,
      setTool: setTool,
      setPanPreview: (offset) => {
        panPreviewApplyRef.current?.(offset);
      },
      message: {
        success: (content: string) => Message.success(content),
        error: (content: string) => Message.error(content),
        warning: (content: string) => Message.warning(content),
        info: (content: string) => Message.info(content),
      },
      elementsLayerRef: elementsLayerRef,
      overlayLayerRef: overlayLayerRef,
    }),
    [editorService, currentTool],
  );

  // 画布空白区域点击
  const handleCanvasPointerDown = (
    point: Point,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    toolHandler.onCanvasPointerDown?.(toolContext, point, e.nativeEvent);
  };

  // 画布鼠标移动
  const handleCanvasPointerMove = (
    point: Point,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    toolHandler.onCanvasPointerMove?.(toolContext, point, e.nativeEvent);
  };

  // 画布鼠标松开
  const handleCanvasPointerUp = (
    point: Point,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    toolHandler.onCanvasPointerUp?.(toolContext, point, e.nativeEvent);
  };

  // 元素鼠标点击
  const handleElementPointerDown = (
    id: ID,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    toolHandler.onElementPointerDown?.(toolContext, id, e.nativeEvent);
  };

  // 选中框鼠标点击
  const handleSelectionBoxPointerDown = (
    selectedIds: ID[],
    e: React.PointerEvent<Element>,
  ) => {
    toolHandler.onSelectionBoxPointerDown?.(toolContext, selectedIds, e.nativeEvent);
  };

  // 鼠标滚轮
  const handleWheel = (
    point: Point,
    e: React.WheelEvent<HTMLDivElement>
  ) => {
    if (e.ctrlKey || e.metaKey) {
      editorService.zoomAt(point, e.deltaY < 0 ? 0.1 : -0.1);
      return;
    }

    // deltaMode === 0 的滚轮事件通常来自触控板，表示以像素为单位的平移
    if (e.deltaMode === 0) {
      const viewport = editorService.getState().viewport;
      const scale = viewport.scale || 1;
      const moveX = e.deltaX / scale;
      const moveY = e.deltaY / scale;
      editorService.moveViewport({ x: moveX, y: moveY });
      return;
    }

    if (e.shiftKey) {
      const unit = e.deltaY > 0 ? -50 : 50;
      editorService.moveViewport({ x: unit, y: 0 });
    } else {
      const unit = e.deltaY > 0 ? 50 : -50;
      editorService.moveViewport({ x: 0, y: unit });
    }
  };

  // 缩放控制
  const handleChangeScale = (nextScale: number) => {
    const { viewport } = editorService.getState();
    const currentScale = viewport.scale;
    const delta = nextScale - currentScale;
    if (delta === 0) return;

    // 估算视口中心对应的场景坐标
    const viewportWidth =
      typeof window !== "undefined" ? window.innerWidth : 0;
    const viewportHeight =
      typeof window !== "undefined" ? window.innerHeight : 0;

    const centerPoint: Point = {
      x: viewport.x + viewportWidth / 2 / currentScale,
      y: viewport.y + viewportHeight / 2 / currentScale,
    };

    editorService.zoomAt(centerPoint, delta);
  };

  // 更新元素属性
  const handleUpdateElement = (id: ID, updates: any) => {
    try {
      editorService.updateElement(id, updates);
    } catch (error) {
      console.error("Failed to update element in App:", error);
    }
  };

  // 注册画布平移预览回调
  const handleRegisterPanPreview = (
    apply: (offset: { dx: number; dy: number } | null) => void,
  ) => {
    panPreviewApplyRef.current = apply;
  };

  // 注册元素层 DOM 引用回调
  const handleRegisterElementsLayerRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    elementsLayerRef.current = ref.current;
  };

  // 注册覆盖层 DOM 引用回调
  const handleRegisterOverlayLayerRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    overlayLayerRef.current = ref.current;
  };

  // 通过视口 y 值滚动画布
  const handleScrollViewportToY = (nextY: number) => {
    const current = editorService.getState().viewport;
    editorService.setViewport({
      ...current,
      y: nextY,
    });
  };

  // 全局键盘事件监听
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (
        e.code === "Space" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.repeat &&
        !isEditable
      ) {
        e.preventDefault();
        if (temporaryToolRef.current === null) {
          temporaryToolRef.current = currentTool;
          setTool("pan");
        }
        return;
      }

      // 处理撤销/重做快捷键
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (editorService.canUndo()) {
            editorService.undo();
            Message.success('撤销操作');
          }
          return;
        }
        if ((e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
          e.preventDefault();
          if (editorService.canRedo()) {
            editorService.redo();
            Message.success('重做操作');
          }
          return;
        }
      }
      
      const lowerKey = e.key.toLowerCase();
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const toolMap: Record<string, ToolType> = {
          v: "select",
          h: "pan",
          r: "rect",
          c: "circle",
          a: "triangle",
          t: "text",
          i: "image",
        };
        const mappedTool = toolMap[lowerKey];
        if (mappedTool && mappedTool !== currentTool) {
          e.preventDefault();
          setTool(mappedTool);
          return;
        }
      }

      // 其他快捷键交给工具处理器
      toolHandler.onKeyDown?.(toolContext, e);
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toolHandler, toolContext, editorService, currentTool, setTool]);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (temporaryToolRef.current) {
        e.preventDefault();
        const nextTool = temporaryToolRef.current;
        temporaryToolRef.current = null;
        setTool(nextTool);
      }
    };
    window.addEventListener("keyup", handleKeyUp, { passive: false });
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, [setTool]);


  // 全局右键菜单
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toolHandler.onContextMenu?.(toolContext, e);
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, [toolHandler, toolContext]);

  return (
    <>
      {/* 恢复弹窗 */}
      <RecoveryModal
        visible={showRecoveryModal}
        onRecover={handleRecover}
        onReset={handleReset}
      />

      {/* 初始化完成后才显示画布 */}
      {isInitialized && (
        <>
          {/* 工具栏 */}
          <Toolbar currentTool={currentTool} onChangeTool={setTool} />
          {/* 缩放栏 */}
          <ZoomControl
            scale={canvasState.viewport.scale}
            onChangeScale={handleChangeScale}
          />
          {/* 画布容器 */}
          <div className={styles.canvasRoot}>
            <div
              className={styles.canvasViewportWrapper}
              ref={viewportWrapperRef}
            >
              <CanvasView
                state={canvasState}
                cursor={toolHandler.cursor}
                onRegisterPanPreview={handleRegisterPanPreview}
                onRegisterElementsLayerRef={handleRegisterElementsLayerRef}
                onRegisterOverlayLayerRef={handleRegisterOverlayLayerRef}
                onCanvasPointerDown={handleCanvasPointerDown}
                onCanvasPointerMove={handleCanvasPointerMove}
                onCanvasPointerUp={handleCanvasPointerUp}
                onElementPointerDown={handleElementPointerDown}
                onSelectionBoxPointerDown={handleSelectionBoxPointerDown}
                onWheel={handleWheel}
                onUpdateElement={handleUpdateElement}
              />
              {viewportPixelHeight > 0 && (
                <VerticalScrollbar
                  document={canvasState.document}
                  viewport={canvasState.viewport}
                  viewportPixelHeight={viewportPixelHeight}
                  onChangeViewportY={handleScrollViewportToY}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default App;
