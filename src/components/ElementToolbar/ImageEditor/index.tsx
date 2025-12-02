// ImageEditor/index.tsx
import React from "react";
import type { CanvasElement, ID, ShapeElement, ImageElement } from "../../../canvas/schema/model";
import { OpacitySlider } from "../OpacitySlider";
import { BorderColorPicker } from "../BorderColorPicker";
import { BorderWidthControl } from "../BorderWidthControl";
import { FilterControls } from "./controls/FilterControls";
import { PresetControls } from "./controls/PresetControls";
import { ImageEditProvider } from "./contexts/ImageEditContext";
import styles from "./ImageEditor.module.css";

interface ImageEditorProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
  viewport?: { scale: number }; // 用于位置计算的视口信息
  isEditing?: boolean; // 编辑状态标志
}

const ImageEditorImpl: React.FC<ImageEditorProps> = ({ 
  element, 
  onUpdateElement,
  viewport,
  isEditing = false 
}) => {
  // 重置功能
  const handleReset = () => {
    const updates: Record<string, any> = {
      opacity: 1,
    };

    // 只有形状元素才有style属性
    if (element.type === 'shape') {
      const shapeElement = element as ShapeElement;
      updates.style = {
        ...shapeElement.style,
        strokeColor: "#000000",
        strokeWidth: 0,
      };
    }

    // 只有图片元素才有filters属性，且格式为数组
    if (element.type === 'image') {
      updates.filters = []; // 重置为空数组
    }

    onUpdateElement(element.id, updates);
  };

  // 计算元素的尺寸信息 - 与ElementToolbar保持一致的计算逻辑
  const getElementBounds = (element: CanvasElement) => {
    if (!element.transform) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

    // 获取视口缩放比例，默认值为1
    const viewportScale = viewport?.scale || 1;
    
    // 元素的原始坐标和变换
    const elementX = element.transform.x;
    const elementY = element.transform.y;
    // 获取元素的缩放比例，如果没有设置则默认为1
    const elementScaleX = element.transform.scaleX || 1;
    const elementScaleY = element.transform.scaleY || 1;
    let width = 100; // 默认宽度
    let height = 100; // 默认高度

    // 根据元素类型获取尺寸信息
    if (element.type === 'shape') {
      const shapeElement = element as ShapeElement;
      if ('width' in shapeElement) {
        width = Number(shapeElement.width) || 100;
      } else if ('radius' in shapeElement) {
        width = height = (Number(shapeElement.radius) || 50) * 2;
      }
      if ('height' in shapeElement) {
        height = Number(shapeElement.height) || 100;
      }
    } else if (element.type === 'image') {
      const imageElement = element as ImageElement;
      if (imageElement.naturalSize) {
        width = imageElement.naturalSize.width || 100;
        height = imageElement.naturalSize.height || 100;
      }
    }

    // 应用元素自身的缩放比例
    width *= elementScaleX;
    height *= elementScaleY;
    
    // 将坐标转换为屏幕坐标系（考虑视口缩放）
    const screenX = elementX * viewportScale;
    const screenY = elementY * viewportScale;
    const screenWidth = width * viewportScale;
    const screenHeight = height * viewportScale;

    // 返回在屏幕坐标系中的元素边界
    return { 
      x: screenX, 
      y: screenY, 
      width: screenWidth, 
      height: screenHeight 
    };
  };

  // 计算工具栏位置 - 与ElementToolbar保持一致的智能定位系统
  const getToolbarPosition = () => {
    if (!element) {
      // 如果没有元素，默认显示在视口顶部
      return { top: 10, left: 10 };
    }

    const toolbarWidth = 300;
    const toolbarHeight = 400; // 图像编辑器高度较大
    const margin = 10;
    const containerWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
    const containerHeight = typeof window !== "undefined" ? window.innerHeight : 600;

    // 获取元素的边界
    const bounds = getElementBounds(element);
    
    // 计算元素的中心点和其他位置信息
    const boundsCenterX = bounds.x + bounds.width / 2;
    const boundsCenterY = bounds.y + bounds.height / 2;
    const boundsTop = bounds.y;
    const boundsBottom = bounds.y + bounds.height;
    
    // 边界检查函数：确保目标位置不会超出视口
    const clampX = (x: number) => Math.max(margin, Math.min(x, containerWidth - toolbarWidth - margin));
    const clampY = (y: number) => Math.max(margin, Math.min(y, containerHeight - toolbarHeight - margin));
    
    // 重叠检测函数：检查工具栏是否与元素重叠
    const checkOverlap = (top: number, left: number) => {
      const rect1 = { 
        left, 
        top, 
        right: left + toolbarWidth, 
        bottom: top + toolbarHeight 
      };
      const rect2 = { 
        left: bounds.x, 
        top: bounds.y, 
        right: bounds.x + bounds.width, 
        bottom: bounds.y + bounds.height 
      };
      
      // 矩形重叠检测算法
      return !(rect1.right < rect2.left || 
               rect1.left > rect2.right || 
               rect1.bottom < rect2.top || 
               rect1.top > rect2.bottom);
    };
    
    // 计算可能的位置，包括缩放视口适配
    const positions = [
      { top: boundsBottom + margin, left: boundsCenterX - toolbarWidth / 2, name: 'below' }, // 元素下方（首选）
      { top: boundsTop - toolbarHeight - margin, left: boundsCenterX - toolbarWidth / 2, name: 'above' }, // 元素上方
      { top: boundsCenterY - toolbarHeight / 2, left: bounds.x + bounds.width + margin, name: 'right' }, // 元素右侧居中
      { top: boundsCenterY - toolbarHeight / 2, left: bounds.x - toolbarWidth - margin, name: 'left' }, // 元素左侧居中
      { top: containerHeight - toolbarHeight - margin * 2, left: containerWidth / 2 - toolbarWidth / 2, name: 'bottom-center' }, // 视口底部中央
      { top: margin * 2, left: containerWidth / 2 - toolbarWidth / 2, name: 'top-center' } // 视口顶部中央
    ];

    // 筛选有效的位置（在视口内且不重叠）
    for (const pos of positions) {
      const clampedLeft = clampX(pos.left);
      const clampedTop = clampY(pos.top);
      
      if (!checkOverlap(clampedTop, clampedLeft)) {
        return { top: clampedTop, left: clampedLeft };
      }
    }
    
    // 如果所有位置都重叠，强制放在底部中央（这是最后的备选方案）
    return { 
      top: containerHeight - toolbarHeight - margin * 2, 
      left: containerWidth / 2 - toolbarWidth / 2 
    };
  };

  const position = getToolbarPosition();

  // 阻止所有内部事件冒泡到画布
  const handleToolbarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 根据编辑状态控制工具栏的显示
  // 使用opacity和pointerEvents实现平滑的显示/隐藏效果，避免视觉闪烁
  const toolbarStyle: React.CSSProperties = {
    top: `${position.top}px`,
    left: `${position.left}px`,
    opacity: isEditing ? 0 : 1,
    pointerEvents: isEditing ? 'none' : 'auto',
    transition: 'opacity 0.2s ease-in-out', // 添加过渡动画
  };

  return (
    <div
      className={styles.imageEditorContainer}
      onClick={handleToolbarClick}
      style={toolbarStyle}
      data-toolbar-element="true"
    >
      {/* 边框设置部分 */}
      <div className={styles.section}>
        <h3>边框设置</h3>
        <div className={styles.borderControls}>
          <div className={styles.controlGroup}>
            <label>边框宽度</label>
            <BorderWidthControl 
              element={element} 
              onUpdateElement={onUpdateElement} 
            />
          </div>
          <div className={styles.controlGroup}>
            <label>边框颜色</label>
            <BorderColorPicker 
              element={element} 
              onUpdateElement={onUpdateElement} 
            />
          </div>

        </div>
      </div>

      {/* 透明度控制部分 */}
      <div className={styles.section}>
        <OpacitySlider 
          element={element} 
          onUpdateElement={onUpdateElement} 
        />
      </div>

      {/* 滤镜控制部分 */}
      <div className={styles.section}>
        <h3>滤镜效果</h3>
        <div className={styles.filterControlsSection}>
          <FilterControls 
            element={element} 
            onUpdateElement={onUpdateElement} 
          />
        </div>
      </div>

      {/* 预设部分 */}
      <div className={styles.section}>
        <h3>预设效果</h3>
        <div className={styles.presetControlsSection}>
          <PresetControls 
            element={element} 
            onUpdateElement={onUpdateElement} 
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className={styles.resetButtonContainer}>
        <button onClick={handleReset} className={styles.resetButton}>重置</button>
      </div>
    </div>
  );
};

// 使用Context Provider包装组件
export const ImageEditor: React.FC<ImageEditorProps> = (props) => {
  return (
    <ImageEditProvider>
      <ImageEditorImpl {...props} />
    </ImageEditProvider>
  );
};

// 导出原始实现用于测试/高级使用
export { ImageEditorImpl };