import React, { memo, useMemo } from "react";
import { type ViewportState, type ImageElement as ImageElementModel } from "../../schema/model";

// 滤镜计算缓存
const filterCache = new Map<string, string>();

/**
 * 图片元素的渲染组件
 */
const ImageElementComponent: React.FC<{
  element: ImageElementModel;
  viewport: ViewportState;
  scale: number;
  onPointerDown?: React.PointerEventHandler<HTMLImageElement>;
  isSelected?: boolean;
}> = ({ element, viewport, scale, onPointerDown, isSelected }) => {
  if (!element.visible) return null;

  const { src, size, filters, transform } = element;

  // 使用useMemo缓存计算结果
  const { screenX, screenY, screenW, screenH, filterCSS } = useMemo(() => {
    // 根据视口和缩放计算屏幕上的位置和尺寸
    const calculatedScreenX = (transform.x - viewport.x) * scale;
    const calculatedScreenY = (transform.y - viewport.y) * scale;
    const calculatedScreenW = size.width * scale * transform.scaleX;
    const calculatedScreenH = size.height * scale * transform.scaleY;

    // 生成滤镜CSS并缓存
      let calculatedFilterCSS = "none";
      if (filters && filters.length > 0) {
        // 创建缓存键
        const cacheKey = filters
          .map(f => `${f.type}:${f.value}`)
          .sort()
          .join('|');
        
        // 检查缓存
        if (filterCache.has(cacheKey)) {
          calculatedFilterCSS = filterCache.get(cacheKey) || "none";
        } else {
          calculatedFilterCSS = filters.map(f => {
        switch (f.type) {
          case 'brightness':
          case 'grayscale':
          case 'opacity' as any:
            return `${f.type}(${f.value * 100}%)`;
          case 'blur':
            return `${f.type}(${f.value}px)`;
          default:
            return `${f.type}(${f.value})`;
        }
      }).join(" ") ?? "none";
          filterCache.set(cacheKey, calculatedFilterCSS);
          
          // 限制缓存大小，防止内存泄漏
          if (filterCache.size > 100) {
            const firstKey = filterCache.keys().next().value;
            if (firstKey) filterCache.delete(firstKey);
          }
        }
      }

    return {
      screenX: calculatedScreenX,
      screenY: calculatedScreenY,
      screenW: calculatedScreenW,
      screenH: calculatedScreenH,
      filterCSS: calculatedFilterCSS
    };
  }, [element, viewport, scale, transform.x, transform.y, transform.scaleX, transform.scaleY, transform.rotation, size.width, size.height, filters]);

  // 阻止图片的默认拖拽行为
  const handleDragStart = (e: React.DragEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  return (
    <div
      data-id={element.id}
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        transform: `rotate(${transform.rotation}deg)`,
        transformOrigin: "center",
        pointerEvents: "auto",
        border: element.borderWidth && element.borderColor ? 
          `${element.borderWidth}px solid ${element.borderColor}` : 'none',
        outline: isSelected ? `2px solid #0066FF` : 'none',
        outlineOffset: '-2px',
        boxSizing: 'border-box',
      }}
      onPointerDown={onPointerDown}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        onDragStart={handleDragStart}
        style={{
          width: '100%',
          height: '100%',
          userSelect: "none",
          filter: filterCSS,
        }}
      />
    </div>
  );
};

// 使用memo优化渲染性能
const ImageElement = memo(ImageElementComponent, (prevProps, nextProps) => {
  // 快速检查引用相等
  if (prevProps.element === nextProps.element && 
      prevProps.viewport === nextProps.viewport && 
      prevProps.scale === nextProps.scale &&
      prevProps.isSelected === nextProps.isSelected) {
    return true;
  }
  
  // 检查关键属性变化
  const prevElement = prevProps.element;
  const nextElement = nextProps.element;
  
  // 检查可见性
  if (prevElement.visible !== nextElement.visible) return false;
  
  // 检查位置、大小、缩放、旋转
  if (prevElement.transform.x !== nextElement.transform.x ||
      prevElement.transform.y !== nextElement.transform.y ||
      prevElement.transform.scaleX !== nextElement.transform.scaleX ||
      prevElement.transform.scaleY !== nextElement.transform.scaleY ||
      prevElement.transform.rotation !== nextElement.transform.rotation ||
      prevElement.size.width !== nextElement.size.width ||
      prevElement.size.height !== nextElement.size.height) {
    return false;
  }
  
  // 检查视口和缩放
  if (prevProps.viewport.x !== nextProps.viewport.x ||
      prevProps.viewport.y !== nextProps.viewport.y ||
      prevProps.scale !== nextProps.scale) {
    return false;
  }
  
  // 检查选择状态
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  
  // 检查滤镜
  const prevFilters = prevElement.filters || [];
  const nextFilters = nextElement.filters || [];
  
  if (prevFilters.length !== nextFilters.length) return false;
  
  // 检查每个滤镜是否相同
  for (let i = 0; i < prevFilters.length; i++) {
    if (prevFilters[i].type !== nextFilters[i].type ||
        prevFilters[i].value !== nextFilters[i].value) {
      return false;
    }
  }
  
  // 属性相同，不需要重新渲染
  return true;
});

export { ImageElement };
