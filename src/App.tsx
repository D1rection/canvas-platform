import { useEffect, useMemo, useState } from "react";
import { CanvasView } from "./components/canvas/CanvasView";
import { Toolbar, type ToolType } from "./components/toolbar/Toolbar";
import type { CanvasRuntimeState, ID, Point } from "./canvas/schema/model";
import type { CanvasContainer } from "./canvas/di/container";
import { getToolHandler, type ToolContext } from "./tools";
import styles from "./App.module.css";

interface AppProps {
  canvasContainer: CanvasContainer;
}

function App({ canvasContainer }: AppProps) {
  const { editorService } = canvasContainer;
  const [currentTool, setCurrentTool] = useState<ToolType>("select");
  const [canvasState, setCanvasState] = useState<CanvasRuntimeState>(
    () => editorService.getState(),
  );

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
      setTool: setCurrentTool,
    }),
    [editorService],
  );

  // 画布空白区域点击
  const handleCanvasPointerDown = (point: Point) => {
    toolHandler.onCanvasPointerDown?.(toolContext, point);
  };

  // 元素点击
  const handleElementPointerDown = (id: ID) => {
    toolHandler.onElementPointerDown?.(toolContext, id);
  };

  return (
    <>
      {/* 工具栏 */}
      <Toolbar currentTool={currentTool} onChangeTool={setCurrentTool} />
      {/* 画布容器 */}
      <div className={styles.canvasRoot}>
        <div className={styles.canvasViewportWrapper}>
          <CanvasView
            state={canvasState}
            cursor={toolHandler.cursor}
            onCanvasPointerDown={handleCanvasPointerDown}
            onElementPointerDown={handleElementPointerDown}
          />
        </div>
      </div>
    </>
  );
}

export default App;
