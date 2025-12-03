// ImageEditor/index.tsx
import React, { useState, useCallback } from "react";
import type { CanvasElement, ID, ShapeElement, ImageElement, ViewportState } from "../../../canvas/schema/model";
import { OpacitySlider } from "../OpacitySlider";
import { BorderColorPicker } from "../BorderColorPicker";
import { BorderWidthControl } from "../BorderWidthControl";
import { PresetControls } from "./controls/PresetControls";
import { ImageEditProvider } from "./contexts/ImageEditContext";
import styles from "./ImageEditor.module.css";

interface ImageEditorProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
  viewport?: ViewportState; // 用于位置计算的视口信息（与 editor 一致）
  isEditing?: boolean; // 编辑状态标志
}

const ImageEditorImpl: React.FC<ImageEditorProps> = ({ 
  element, 
  onUpdateElement,
  viewport,
  isEditing = false 
}) => {
  // 折叠状态
  const [isCollapsed, setIsCollapsed] = useState(false);
  
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
  
  // 切换折叠状态
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // 计算元素的尺寸信息 - 与ElementToolbar保持一致的计算逻辑
  const getElementBounds = (element: CanvasElement) => {
    if (!element.transform) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

    // 获取视口缩放/平移
    const viewportScale = viewport?.scale || 1;
    const viewportX = viewport?.x || 0;
    const viewportY = viewport?.y || 0;
    
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
    
    // 将坐标转换为屏幕坐标系（考虑视口平移与缩放）
    const screenX = (elementX - viewportX) * viewportScale;
    const screenY = (elementY - viewportY) * viewportScale;
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

  // 计算工具栏位置 - 实现默认左侧固定，遮挡时自动切换到右侧
  const getToolbarPosition = () => {
    if (!element) {
      // 如果没有元素，默认显示在视口左侧
      return { top: 10, left: 10 };
    }

    const toolbarWidth = isCollapsed ? 40 : 300; // 折叠时宽度减小
    const toolbarHeight = 400; // 图像编辑器高度较大
    const margin = 10;
    const containerWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
    const containerHeight = typeof window !== "undefined" ? window.innerHeight : 600;

    // 获取元素的边界
    const bounds = getElementBounds(element);
    
    // 边界检查函数：确保目标位置不会超出视口
    const clampY = (y: number) => Math.max(margin, Math.min(y, containerHeight - toolbarHeight - margin));
    
    // 重叠检测函数：检查工具栏是否与元素重叠
    const checkOverlap = (top: number, left: number) => {
      // 如果处于折叠状态，不检查重叠
      if (isCollapsed) return false;
      
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
    
    // 计算默认左侧位置
    const leftPosition = margin;
    const topPosition = clampY(10); // 顶部留出一点边距
    
    // 检查左侧位置是否与元素重叠
    if (!checkOverlap(topPosition, leftPosition)) {
      // 左侧不重叠，使用左侧位置
      return { top: topPosition, left: leftPosition, side: 'left' as const };
    }
    
    // 左侧重叠，尝试右侧位置
    const rightPosition = containerWidth - toolbarWidth - margin;
    
    // 检查右侧位置是否与元素重叠
    if (!checkOverlap(topPosition, rightPosition)) {
      // 右侧不重叠，使用右侧位置
      return { top: topPosition, left: rightPosition, side: 'right' as const };
    }
    
    // 如果两侧都重叠，仍然使用左侧位置（折叠时会自动解决遮挡问题）
    return { top: topPosition, left: leftPosition, side: 'left' as const };
  };

  const position = getToolbarPosition();

  // 阻止所有内部事件冒泡到画布
  const handleToolbarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 根据编辑状态和折叠状态控制工具栏的显示
  const toolbarStyle: React.CSSProperties = {
    top: `${position.top}px`,
    left: isCollapsed ? (position.side === 'left' ? `${position.left}px` : `${position.left + 300 - 40}px`) : `${position.left}px`,
    width: isCollapsed ? '40px' : '300px',
    opacity: isEditing ? 0 : 1,
    pointerEvents: isEditing ? 'none' : 'auto',
    transition: 'all 0.3s ease', // 统一的过渡动画
  };

  return (
   <div
  className={`${styles.imageEditorContainer} ${isCollapsed ? styles.collapsed : ''}`}
  onClick={handleToolbarClick}
  style={toolbarStyle}
  data-toolbar-element="true"
  data-side={position.side}
>
      {/* 折叠/展开按钮 */}
      <button 
        className={styles.collapseButton} 
        onClick={toggleCollapse}
        aria-label={isCollapsed ? "展开图片编辑工具栏" : "折叠图片编辑工具栏"}
        title={isCollapsed ? "展开图片编辑工具栏" : "折叠图片编辑工具栏"}
      >
        {isCollapsed ? '>' : '<'}
      </button>
      
      {/* 只有在非折叠状态下显示内容 */}
      {!isCollapsed && (
        <>
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

          {/* 预设效果部分 */}
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
        </>
      )}
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
