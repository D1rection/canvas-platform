import React, { useState, useRef, useEffect } from "react";
import type {
  CanvasElement,
  ID,
  ViewportState,
} from "../../schema/model";

interface ElementToolbarProps {
  element: CanvasElement;
  viewport: ViewportState;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

// 预设颜色选项
const COLOR_PRESETS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F8C471",
  "#82E0AA",
  "#F1948A",
  "#85C1E9",
  "#D7BDE2",
  "#000000",
  "#333333",
  "#666666",
  "#999999",
  "#FFFFFF",
];

// 获取元素颜色
const getElementColor = (element: CanvasElement): string => {
  switch (element.type) {
    case "shape":
      return element.style.fill || "#000000";
    case "text":
      return element.spans[0]?.style.color || "#000000";
    default:
      return "#000000";
  }
};

// 设置元素颜色
const setElementColor = (element: CanvasElement, color: string) => {
  switch (element.type) {
    case "shape":
      return {
        style: {
          ...element.style,
          fill: color,
          // 对于形状元素，同时设置边框色，提供更好的视觉效果
          strokeColor: color,
        },
      };
    case "text":
      return {
        spans: element.spans.map((span) => ({
          ...span,
          style: { ...span.style, color },
        })),
      };
    default:
      return {};
  }
};

// 获取元素宽度
const getElementWidth = (element: CanvasElement): number => {
  if ("size" in element) {
    return element.size.width;
  }
  return 100;
};

// 获取元素高度
const getElementHeight = (element: CanvasElement): number => {
  if ("size" in element) {
    return element.size.height;
  }
  return 100;
};

// 设置元素宽度和高度
const setElementDimensions = (
  element: CanvasElement,
  width: number,
  height: number
) => {
  if ("size" in element) {
    // 确保尺寸不会过小
    const minSize = 1;
    const validWidth = Math.max(minSize, width);
    const validHeight = Math.max(minSize, height);

    return {
      size: {
        width: validWidth,
        height: validHeight,
      },
    };
  }
  return {};
};



// 设置元素大小
const setElementSize = (element: CanvasElement, size: number) => {
  let result = {};

  switch (element.type) {
    case "text":
      result = {
        spans: element.spans.map((span) => ({
          ...span,
          style: { ...span.style, fontSize: size },
        })),
      };
      break;
    case "shape":
    case "image":
      const aspectRatio = element.size.width / element.size.height;
      result = {
        size: {
          width: size,
          height: size / aspectRatio,
        },
      };
      break;
    default:
      result = {};
  }

  return result;
};

// 获取元素透明度
const getElementOpacity = (element: CanvasElement): number => {
  // 从元素的opacity属性获取值，如果不存在则返回默认值1
  return element.opacity ?? 1;
};

export const ElementToolbar: React.FC<ElementToolbarProps> = ({
  element,
  viewport,
  onUpdateElement,
}) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [customColor, setCustomColor] = useState(getElementColor(element));
  const [width, setWidth] = useState(getElementWidth(element));
  const [height, setHeight] = useState(getElementHeight(element));
  const [isDragging, setIsDragging] = useState(false);
  const [toolbarOffset, setToolbarOffset] = useState({ x: 0, y: 0 });
  const [isToolbarDragging, setIsToolbarDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭颜色选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setIsColorPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 更新自定义颜色
  useEffect(() => {
    const newColor = getElementColor(element);
    setCustomColor(newColor);
  }, [element]);

  // 更新尺寸状态
  useEffect(() => {
    if ("size" in element) {
      setWidth(element.size.width);
      setHeight(element.size.height);
    }
  }, [element]);

  // 处理颜色选择
  const handleColorSelect = (color: string, event?: React.MouseEvent) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    const colorUpdates = setElementColor(element, color);
    onUpdateElement(element.id, colorUpdates);
    setIsColorPickerOpen(false);
  };

  // 处理宽度变化
  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    // 保持宽高比
    const aspectRatio = height / width;
    const newHeight = Math.max(1, newWidth * aspectRatio);
    setHeight(newHeight);

    const updates = setElementDimensions(element, newWidth, newHeight);
    onUpdateElement(element.id, updates);
  };

  // 处理高度变化
  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    // 保持宽高比
    const aspectRatio = width / height;
    const newWidth = Math.max(1, newHeight * aspectRatio);
    setWidth(newWidth);

    const updates = setElementDimensions(element, newWidth, newHeight);
    onUpdateElement(element.id, updates);
  };

  // 处理自由大小调整（不保持宽高比）
  const handleSizeChange = (size: number) => {
    if (!element?.id) {
      return;
    }
    
    const clampedSize = Math.max(1, Math.min(100, size));
    const sizeUpdates = setElementSize(element, clampedSize);
    
    onUpdateElement(element.id, sizeUpdates);
  };

  // 处理宽度输入框变化
  const handleWidthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!isNaN(value)) {
      handleWidthChange(value);
    }
  };

  // 处理高度输入框变化
  const handleHeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!isNaN(value)) {
      handleHeightChange(value);
    }
  };

  // 处理滑块拖拽开始
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // 处理滑块拖拽结束
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // 处理工具栏拖拽开始
  const handleToolbarDragStart = (e: React.MouseEvent) => {
    // 只有在点击工具栏背景区域时才允许拖拽
    if (e.target === toolbarRef.current) {
      setIsToolbarDragging(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      // 防止选择文本
      e.preventDefault();
    }
  };

  // 处理工具栏拖拽移动
  const handleToolbarDragMove = (e: MouseEvent) => {
    if (isToolbarDragging && toolbarRef.current) {
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      // 更新工具栏偏移位置
      setToolbarOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      // 更新拖拽起始位置
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

      // 添加全局拖拽样式
      if (document.body) {
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
    }

    return () => {
      document.removeEventListener("mousemove", handleToolbarDragMove);
      document.removeEventListener("mouseup", handleToolbarDragEnd);

      // 恢复默认样式
      if (document.body) {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };
  }, [isToolbarDragging, dragStartPos]);

  // 计算工具栏位置（智能避让算法）
  const getToolbarPosition = () => {
    // 安全检查
    if (!element || !element.transform) {
      return { top: 0, left: 0 };
    }

    const toolbarWidth = 300;
    const toolbarHeight = 80;
    const margin = 10;

    // 获取视口容器大小
    const containerWidth =
      typeof window !== "undefined" ? window.innerWidth : 1000;
    const containerHeight =
      typeof window !== "undefined" ? window.innerHeight : 600;

    // 获取元素的世界坐标和大小
    const worldX = element.transform.x;
    const worldY = element.transform.y;
    const elementWidth = "size" in element ? element.size.width : 100;
    const elementHeight = "size" in element ? element.size.height : 100;

    // 获取视口信息
    const scale = viewport.scale;
    const viewportX = viewport.x;
    const viewportY = viewport.y;

    // 计算元素在屏幕上的位置（世界坐标转屏幕坐标）
    const screenX = (worldX - viewportX) * scale;
    const screenY = (worldY - viewportY) * scale;
    const screenWidth = elementWidth * scale;
    const screenHeight = elementHeight * scale;

    // 计算元素中心点在屏幕上的位置
    const elementCenterX = screenX + screenWidth / 2;
    const elementTop = screenY;
    const elementBottom = screenY + screenHeight;

    // 计算各方向可用空间
    const availableSpaceTop = elementTop;
    const availableSpaceBottom = containerHeight - elementBottom;
    const availableSpaceLeft = elementCenterX - toolbarWidth / 2;
    const availableSpaceRight =
      containerWidth - (elementCenterX + toolbarWidth / 2);

    // 存储各候选位置及其评分
    const positions = [
      {
        position: {
          top: elementTop - toolbarHeight - margin,
          left: elementCenterX - toolbarWidth / 2,
        },
        // 优先考虑上方，其次是下方，最后是左右两侧
        score:
          availableSpaceTop > toolbarHeight + margin
            ? 100 + availableSpaceTop
            : 0, // 上方有足够空间时优先选择
        direction: "top",
      },
      {
        position: {
          top: elementBottom + margin,
          left: elementCenterX - toolbarWidth / 2,
        },
        score:
          availableSpaceBottom > toolbarHeight + margin
            ? 80 + availableSpaceBottom
            : 0, // 其次考虑下方
        direction: "bottom",
      },
      {
        position: {
          top: Math.max(0, elementTop + (screenHeight - toolbarHeight) / 2),
          left: screenX - toolbarWidth - margin,
        },
        score:
          availableSpaceLeft > toolbarWidth + margin
            ? 60 + availableSpaceLeft
            : 0, // 再次考虑左侧
        direction: "left",
      },
      {
        position: {
          top: Math.max(0, elementTop + (screenHeight - toolbarHeight) / 2),
          left: screenX + screenWidth + margin,
        },
        score:
          availableSpaceRight > toolbarWidth + margin
            ? 40 + availableSpaceRight
            : 0, // 最后考虑右侧
        direction: "right",
      },
    ];

    // 找出最佳位置（得分最高的位置）
    const bestPosition = positions.reduce(
      (best, current) => (current.score > best.score ? current : best),
      positions[0]
    );

    // 如果没有理想位置（所有方向空间都不足），则强制显示在上方，但保证不超出视口
    let top = bestPosition.position.top;
    let left = bestPosition.position.left;

    // 添加用户拖拽偏移（仅在用户手动调整过位置后应用）
    if (toolbarOffset.x !== 0 || toolbarOffset.y !== 0) {
      top += toolbarOffset.y;
      left += toolbarOffset.x;
    }

    // 应用最终边界检查
    // 确保不超出左边界，同时考虑屏幕安全区域
    left = Math.max(10, Math.min(left, containerWidth - toolbarWidth - 10));
    // 确保不超出上边界
    top = Math.max(10, Math.min(top, containerHeight - toolbarHeight - 10));

    return { top, left };
  };

  // 处理工具栏点击事件，阻止冒泡到画布
  const handleToolbarClick = (e: React.MouseEvent) => {
    // 阻止事件冒泡到父元素，防止点击工具栏时触发画布的点击事件
    e.stopPropagation();
  };

  // 处理颜色选择器开关
  const handleColorPickerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsColorPickerOpen(!isColorPickerOpen);
  };

  const position = getToolbarPosition();

  // 响应式工具栏宽度调整
  const getResponsiveToolbarWidth = () => {
    const containerWidth =
      typeof window !== "undefined" ? window.innerWidth : 1000;
    // 在小屏幕上适当缩小工具栏宽度
    if (containerWidth < 400) return 240;
    if (containerWidth < 600) return 280;
    return 300;
  };

  return (
    <div
      ref={toolbarRef}
      className="element-toolbar"
      onClick={handleToolbarClick}
      onMouseDown={handleToolbarDragStart}
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: "white",
        borderRadius: "12px", // 增大圆角使设计更现代
        padding: "12px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)", // 优化阴影效果
        border: "1px solid #e8e8e8",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        minWidth: "240px", // 允许更小的最小宽度
        width: getResponsiveToolbarWidth(), // 响应式宽度
        zIndex: 1000, // 确保在大多数UI元素之上
        pointerEvents: "auto",
        transition: "top 0.2s ease, left 0.2s ease, transform 0.1s ease", // 更平滑的过渡
        cursor: isToolbarDragging ? "grabbing" : "grab",
        // 添加半透明效果以提升视觉层次感
        backdropFilter: "blur(8px)",
        backgroundColor: "rgba(255, 255, 255, 0.97)",
      }}
    >
      {/* 颜色选择器 */}
      <div className="color-picker-container" ref={colorPickerRef}>
        <button
          className="color-trigger"
          onClick={handleColorPickerToggle}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            border: `2px solid ${getElementColor(element)}`, // 使用当前颜色作为边框
            background: getElementColor(element),
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: getElementColor(element) > "#888888" ? "#000" : "#fff",
            fontSize: "12px",
            // 添加微交互效果
            transition: "transform 0.1s ease",
            transform: isColorPickerOpen ? "scale(1.05)" : "scale(1)",
            // 添加阴影
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
          title="选择颜色"
        >
          ●
        </button>

        {isColorPickerOpen && (
          <div
            className="color-picker-dropdown"
            onClick={(e) => {
              e.stopPropagation();
            }}
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "8px",
              background: "white",
              borderRadius: "12px", // 增大圆角
              padding: "12px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)", // 更明显的阴影
              border: "1px solid #e8e8e8",
              width: "220px", // 略微增大宽度
              zIndex: 1001,
              // 添加半透明效果
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(255, 255, 255, 0.97)",
            }}
          >
            {/* 预设颜色网格 */}
            <div
              className="color-presets"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "6px",
                marginBottom: "12px",
              }}
            >
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  className="color-option"
                  onClick={(e) => handleColorSelect(color, e)}
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "4px",
                    background: color,
                    border: color === "#FFFFFF" ? "1px solid #e0e0e0" : "none",
                    cursor: "pointer",
                  }}
                  title={color}
                />
              ))}
            </div>

            {/* 自定义颜色选择器 */}
            <div className="custom-color-section">
              <label
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                自定义颜色:
              </label>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    setCustomColor(newColor);
                    handleColorSelect(newColor, e as any);
                  }}
                  style={{
                    width: "40px",
                    height: "32px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  onBlur={() => handleColorSelect(customColor)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleColorSelect(customColor);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 大小调节区域 */}
      <div className="size-control-container" style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              color: "#666",
              fontWeight: "500",
            }}
          >
            尺寸
          </label>
        </div>

        {/* 宽度和高度输入框 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              value={width.toFixed(0)}
              onChange={handleWidthInputChange}
              min="1"
              max="1000"
              style={{
                width: "100%",
                padding: "4px 6px",
                fontSize: "11px",
                border: "1px solid #e0e0e0",
                borderRadius: "3px",
                textAlign: "center",
              }}
              placeholder="宽"
            />
          </div>
          <span
            style={{ fontSize: "12px", color: "#999", alignSelf: "center" }}
          >
            ×
          </span>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              value={height.toFixed(0)}
              onChange={handleHeightInputChange}
              min="1"
              max="1000"
              style={{
                width: "100%",
                padding: "4px 6px",
                fontSize: "11px",
                border: "1px solid #e0e0e0",
                borderRadius: "3px",
                textAlign: "center",
              }}
              placeholder="高"
            />
          </div>
        </div>

        {/* 综合大小滑块 */}
        <input
          type="range"
          min="1"
          max="100"
          value={Math.sqrt(width * height)}
          onChange={(e) => handleSizeChange(Number(e.target.value))}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
          style={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            background: isDragging
              ? "linear-gradient(to right, #45B7D1, #3498DB)"
              : "linear-gradient(to right, #4ECDC4, #45B7D1)",
            outline: "none",
            WebkitAppearance: "none",
            cursor: "pointer",
          }}
          className="size-slider"
          title="拖拽调整大小"
        />

        {/* 尺寸预览和单位显示 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "10px",
            color: "#999",
            marginTop: "2px",
          }}
        >
          <span>小</span>
          <span style={{ color: isDragging ? "#45B7D1" : "#999" }}>
            {width.toFixed(0)} × {height.toFixed(0)} px
          </span>
          <span>大</span>
        </div>
      </div>

      {/* 透明度调节（可选功能） */}
      <div className="opacity-slider-container" style={{ width: "80px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              color: "#666",
              fontWeight: "500",
            }}
          >
            透明度
          </label>
          <span
            style={{
              fontSize: "12px",
              color: "#333",
              fontWeight: "600",
            }}
          >
            {Math.round(getElementOpacity(element) * 100)}%
          </span>
        </div>
        {/* 注意：根据 model.ts 的定义，元素没有直接的 opacity 属性 */}
        {/* 此处保留UI，但暂不实现功能，因为需要扩展元素模型 */}
        <input
          type="range"
          min="0"
          max="100"
          value={getElementOpacity(element) * 100}
          onChange={(e) => {
            if (onUpdateElement) {
              // 将滑块值(0-100)转换为透明度(0-1)
              const opacity = parseInt(e.target.value) / 100;
              // 调用回调更新元素透明度
              onUpdateElement(element.id, { opacity });
            }
          }}
          style={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            background: "linear-gradient(to right, #ccc, #666)",
            outline: "none",
            WebkitAppearance: "none",
          }}
        />
      </div>
    </div>
  );
};

export default ElementToolbar;
