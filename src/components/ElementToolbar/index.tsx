import React, { useState, useRef, useEffect } from "react";
import { ColorPicker } from "./ColorPicker";
import { BorderColorPicker } from "./BorderColorPicker"; // 引入边框颜色选择器
import { SizeControl } from "./SizeControl";
import { OpacitySlider } from "./OpacitySlider";
import { BorderWidthControl } from "./BorderWidthControl"; // 引入边框宽度控制
import type { ID, CanvasElement, ViewportState } from "../../canvas/schema/model";
import styles from "./ElementToolbar.module.css";

interface ElementToolbarProps {
  element: CanvasElement;
  viewport: ViewportState;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

export const ElementToolbar: React.FC<ElementToolbarProps> = ({
  element,
  viewport,
  onUpdateElement,
}) => {
  const [toolbarOffset, setToolbarOffset] = useState({ x: 0, y: 0 });
  const [isToolbarDragging, setIsToolbarDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 处理工具栏拖拽开始
  const handleToolbarDragStart = (e: React.MouseEvent) => {
    // 只有在点击工具栏背景区域时才允许拖拽
    if (e.target === toolbarRef.current) {
      setIsToolbarDragging(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      // 防止选择文本
      e.preventDefault();
      e.stopPropagation(); // 阻止冒泡到画布
    }
  };

  // 处理工具栏拖拽移动
  const handleToolbarDragMove = (e: MouseEvent) => {
    if (isToolbarDragging) {
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      setToolbarOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setDragStartPos({ x: e.clientX, y: e.clientY });
    }
  };

  // 处理工具栏拖拽结束
  const handleToolbarDragEnd = () => {
    setIsToolbarDragging(false);
  };

  // 添加和移除拖拽相关的事件监听器
  useEffect(() => {
    if (isToolbarDragging) {
      document.addEventListener("mousemove", handleToolbarDragMove);
      document.addEventListener("mouseup", handleToolbarDragEnd);

      if (document.body) {
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
    }

    return () => {
      document.removeEventListener("mousemove", handleToolbarDragMove);
      document.removeEventListener("mouseup", handleToolbarDragEnd);

      if (document.body) {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };
  }, [isToolbarDragging, dragStartPos]);


  // 计算工具栏位置（智能避让算法）
  const getToolbarPosition = () => {
    if (!element || !element.transform) {
      return { top: 0, left: 0 };
    }

    const toolbarWidth = 300; 
    const toolbarHeight = 80;
    const margin = 10;

    const containerWidth =
      typeof window !== "undefined" ? window.innerWidth : 1000;
    const containerHeight =
      typeof window !== "undefined" ? window.innerHeight : 600;

    const worldX = element.transform.x;
    const worldY = element.transform.y;
    const elementWidth = "size" in element ? element.size.width : 100;
    const elementHeight = "size" in element ? element.size.height : 100;

    const scale = viewport.scale;
    const viewportX = viewport.x;
    const viewportY = viewport.y;

    const screenX = (worldX - viewportX) * scale;
    const screenY = (worldY - viewportY) * scale;
    const screenWidth = elementWidth * scale;
    const screenHeight = elementHeight * scale;

    const elementCenterX = screenX + screenWidth / 2;
    const elementTop = screenY;
    const elementBottom = screenY + screenHeight;

    const availableSpaceTop = elementTop;
    const availableSpaceBottom = containerHeight - elementBottom;
    const availableSpaceLeft = elementCenterX - toolbarWidth / 2;
    const availableSpaceRight =
      containerWidth - (elementCenterX + toolbarWidth / 2);

    const positions = [
      // Top
      {
        position: {
          top: elementTop - toolbarHeight - margin,
          left: elementCenterX - toolbarWidth / 2,
        },
        score: availableSpaceTop > toolbarHeight + margin ? 100 + availableSpaceTop : 0, 
        direction: "top",
      },
      // Bottom
      {
        position: {
          top: elementBottom + margin,
          left: elementCenterX - toolbarWidth / 2,
        },
        score: availableSpaceBottom > toolbarHeight + margin ? 80 + availableSpaceBottom : 0,
        direction: "bottom",
      },
      // Left
      {
        position: {
          top: Math.max(0, elementTop + (screenHeight - toolbarHeight) / 2),
          left: screenX - toolbarWidth - margin,
        },
        score: availableSpaceLeft > toolbarWidth + margin ? 60 + availableSpaceLeft : 0, 
        direction: "left",
      },
      // Right
      {
        position: {
          top: Math.max(0, elementTop + (screenHeight - toolbarHeight) / 2),
          left: screenX + screenWidth + margin,
        },
        score: availableSpaceRight > toolbarWidth + margin ? 40 + availableSpaceRight : 0,
        direction: "right",
      },
    ];

    const bestPosition = positions.reduce(
      (best, current) => (current.score > best.score ? current : best),
      positions[0]
    );

    let top = bestPosition.position.top;
    let left = bestPosition.position.left;

    // 添加用户拖拽偏移
    top += toolbarOffset.y;
    left += toolbarOffset.x;

    // 应用最终边界检查
    left = Math.max(10, Math.min(left, containerWidth - toolbarWidth - 10));
    top = Math.max(10, Math.min(top, containerHeight - toolbarHeight - 10));

    return { top, left };
  };

  const position = getToolbarPosition();

  // 响应式工具栏宽度 (用于样式)
  const getResponsiveToolbarWidth = () => {
    const containerWidth =
      typeof window !== "undefined" ? window.innerWidth : 1000;
    if (containerWidth < 400) return 240;
    if (containerWidth < 600) return 280;
    return 300;
  };

  // 阻止所有内部事件冒泡到画布
  const handleToolbarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };


return (
  <div
    ref={toolbarRef}
    className={styles.toolbarWrapper}
    onClick={handleToolbarClick}
    onMouseDown={handleToolbarDragStart}
    style={{
      top: `${position.top}px`,
      left: `${position.left}px`,
      width: getResponsiveToolbarWidth(), 
      cursor: isToolbarDragging ? "grabbing" : "grab",
    }}
  >
    {/* 颜色选择器 */}
    <ColorPicker 
      element={element} 
      onUpdateElement={onUpdateElement} 
    />

    {/* 边框颜色选择器 */}
    <BorderColorPicker
      element={element}
      onUpdateElement={onUpdateElement}
    />

    {/* 大小调节区域 */}
    <SizeControl 
      element={element} 
      onUpdateElement={onUpdateElement} 
    />

    {/* 边框宽度控制 */}
    <BorderWidthControl
      element={element}
      onUpdateElement={onUpdateElement}
    />

    {/* 透明度调节 */}
    <OpacitySlider 
      element={element} 
      onUpdateElement={onUpdateElement} 
    />
  </div>
);
}
export default ElementToolbar;