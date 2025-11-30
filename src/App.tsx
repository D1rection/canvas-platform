import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasView } from "./components/canvas/CanvasView";
import { Toolbar, type ToolType } from "./components/toolbar/Toolbar";
import { RecoveryModal } from "./components/recovery/RecoveryModal";
import type { CanvasRuntimeState, ID, Point } from "./canvas/schema/model";
import type { CanvasContainer } from "./canvas/di/container";
import { getToolHandler, type ToolContext } from "./tools";
import styles from "./App.module.css";
import { ZoomControl } from "./components/zoomcontrol/ZoomControl";

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
    const unsubscribe = editorService.subscribe(setCanvasState);
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

  // 鼠标滚轮
  const handleWheel = (
    point: Point,
    e: React.WheelEvent<HTMLDivElement>
  ) => {
    if(e.ctrlKey || e.metaKey) editorService.zoomAt(point, e.deltaY < 0 ? 0.1 : -0.1);
    else if(e.shiftKey) {
      const unit = e.deltaX > 0 ? 50 : -50;
      editorService.moveViewport({x: unit, y: 0});
    }
    else {
      const unit = e.deltaY > 0 ? 50 : -50;
      editorService.moveViewport({x: 0, y: unit});
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
            <div className={styles.canvasViewportWrapper}>
              <CanvasView
                state={canvasState}
                cursor={toolHandler.cursor}
                onRegisterPanPreview={handleRegisterPanPreview}
                onCanvasPointerDown={handleCanvasPointerDown}
                onCanvasPointerMove={handleCanvasPointerMove}
                onCanvasPointerUp={handleCanvasPointerUp}
                onElementPointerDown={handleElementPointerDown}
                onWheel={handleWheel}
                onUpdateElement={handleUpdateElement}
              />
            </div>
      </div>
        </>
      )}
    </>
  );
}

export default App;
