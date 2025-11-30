// SizeControl.tsx

import React, { useState, useEffect } from "react";
import type { ID, CanvasElement } from "../../canvas/schema/model";
import {
  getElementSize,
  setElementDimensions,
  setElementSizeFromSlider,
  getElementSizeSliderValue,
} from "./utils";
import styles from "./ElementToolbar.module.css";

interface SizeControlProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

export const SizeControl: React.FC<SizeControlProps> = ({
  element,
  onUpdateElement,
}) => {
  const initialSize = getElementSize(element);
  const [width, setWidth] = useState(initialSize.width);
  const [height, setHeight] = useState(initialSize.height);
  const [isDragging, setIsDragging] = useState(false);
  // 保持宽高比开关，默认为开启
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  // 当元素改变时更新本地状态
  useEffect(() => {
    const newSize = getElementSize(element);
    setWidth(newSize.width);
    setHeight(newSize.height);
  }, [element]);

  // 处理尺寸更新并调用 onUpdateElement
  const updateElementDimensions = (newWidth: number, newHeight: number) => {
    setWidth(newWidth);
    setHeight(newHeight);
    const updates = setElementDimensions(element, newWidth, newHeight);
    onUpdateElement(element.id, updates);
  };

  // 处理宽度变化（保持宽高比）
  const handleWidthChange = (newWidth: number) => {
    const oldWidth = width;
    const oldHeight = height;

    newWidth = Math.max(1, newWidth);

    let newHeight = oldHeight;
    if (lockAspectRatio && oldWidth > 0 && oldHeight > 0) {
      // 保持宽高比
      const aspectRatio = oldHeight / oldWidth;
      newHeight = Math.max(1, newWidth * aspectRatio);
    }

    updateElementDimensions(newWidth, newHeight);
  };

  // 处理高度变化（保持宽高比）
  const handleHeightChange = (newHeight: number) => {
    const oldWidth = width;
    const oldHeight = height;

    newHeight = Math.max(1, newHeight);

    let newWidth = oldWidth;
    if (lockAspectRatio && oldWidth > 0 && oldHeight > 0) {
      // 保持宽高比
      const aspectRatio = oldWidth / oldHeight;
      newWidth = Math.max(1, newHeight * aspectRatio);
    }

    updateElementDimensions(newWidth, newHeight);
  };

  // 处理宽度输入框变化
  const handleWidthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!isNaN(value) && value > 0) {
      handleWidthChange(value);
    }
  };

  // 处理高度输入框变化
  const handleHeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!isNaN(value) && value > 0) {
      handleHeightChange(value);
    }
  };

  // 处理滑块拖拽开始/结束
  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  // 处理综合大小调整（尺寸滑块）
  const handleSizeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sizeValue = Number(e.target.value);

    const updates = setElementSizeFromSlider(element, sizeValue);
    onUpdateElement(element.id, updates);

    // 更新本地 state
    if (element.type === "text") {
      setWidth(sizeValue);
      setHeight(sizeValue); // text 的 height 代表 fontSize
    } else {
      // 重新获取元素大小以更新本地状态
      const newSize = getElementSize(element);
      setWidth(newSize.width);
      setHeight(newSize.height);
    }
  };

  // 切换宽高比锁定
  const toggleAspectRatioLock = () => {
    setLockAspectRatio((prev) => !prev);
  };

  // 形状/图片元素才显示宽高比锁定按钮
  const isSizable = element.type === "shape" || element.type === "image";

  // 文本元素的显示值是 fontSize (即 height 的值)，shape/image 的显示值是 width/height
  const displayWidth = isSizable ? width.toFixed(0) : height.toFixed(0);
  const displayHeight = height.toFixed(0);
  const placeholderW = isSizable ? "宽" : "字体";
  const placeholderH = isSizable ? "高" : "大小";

  return (
    <div
      className={styles.sizeControlContainer}
      // 阻止冒泡到工具栏容器，防止触发拖拽
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={styles.sizeControlHeader}>
        <label className={styles.sizeControlLabel}>尺寸</label>
        {/* 宽高比锁定按钮 */}
        {isSizable && (
          <button
            onClick={toggleAspectRatioLock}
            className={[
              styles.aspectRatioButton,
              lockAspectRatio ? styles.active : "",
            ].join(" ")}
            title={lockAspectRatio ? "取消保持宽高比" : "保持宽高比"}
          >
            {lockAspectRatio ? "🔗" : "🔓"}
          </button>
        )}
      </div>

      {/* 宽度和高度输入框 */}
      <div className={styles.sizeInputRow}>
        <div style={{ flex: 1 }}>
          <input
            type="number"
            value={displayWidth}
            onChange={handleWidthInputChange}
            min="1"
            max="1000"
            className={styles.sizeInput}
            placeholder={placeholderW}
          />
        </div>
        <span className={styles.sizeSeparator}>×</span>
        <div style={{ flex: 1 }}>
          <input
            type="number"
            value={displayHeight}
            onChange={handleHeightInputChange}
            min="1"
            max="1000"
            className={styles.sizeInput}
            placeholder={placeholderH}
          />
        </div>
      </div>

      {/* 综合大小滑块 */}
      <input
        type="range"
        min="1"
        max={element.type === "text" ? "100" : "500"} // 文本最大字体100，其他元素最大500
        value={getElementSizeSliderValue(element)}
        onChange={handleSizeSliderChange}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        className={styles.sizeSlider}
        data-dragging={isDragging}
        title="拖拽调整大小"
      />
      {/* 尺寸控制容器结束 */}
      <div
        className={styles.sizeControlContainer}
        onMouseDown={(e) => e.stopPropagation()}
        data-toolbar-element="true"
      ></div>
      {/* 尺寸预览和单位显示 */}
      <div className={styles.sizePreview}>
        <span>小</span>
        <span style={{ color: isDragging ? "#45B7D1" : "#999" }}>
          {element.type === "text"
            ? `${displayHeight} px (字体)`
            : `${displayWidth} × ${displayHeight} px`}
        </span>
        <span>大</span>
      </div>
    </div>
  );
};