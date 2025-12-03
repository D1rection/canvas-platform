// f:\canvas-platform\src\components\ElementToolbar\ImageEditor\controls\FilterControls.tsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import type { CanvasElement, ID } from "../../../../canvas/schema/model";
import { getImageFilter, setImageFilter, isImageElement, setImageFilters } from "../utils/filterUtils";
import styles from "./FilterControls.module.css";

interface FilterControlsProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  element,
  onUpdateElement,
}) => {
  // 滤镜参数类型
  interface FilterParams {
    brightness: number;
    grayscale: number;
    blur: number;
  }

  // 将0-100范围转换为0-1范围
  const percentToUnit = useCallback((value: number): number => value / 100, []);
  // 将0-1范围转换为0-100范围（用于显示）
  const unitToPercent = useCallback((value: number): number => value * 100, []);

  // 使用状态管理滤镜参数，确保拖拽过程中滑块值能实时更新
  const [filters, setFilters] = useState<FilterParams>({
    brightness: unitToPercent(getImageFilter(element, "brightness", 1)),
    grayscale: unitToPercent(getImageFilter(element, "grayscale", 0)),
    blur: getImageFilter(element, "blur", 0),
  });
  
  // 当元素属性变化时更新状态
  useEffect(() => {
    setFilters({
      brightness: unitToPercent(getImageFilter(element, "brightness", 1)),
      grayscale: unitToPercent(getImageFilter(element, "grayscale", 0)),
      blur: getImageFilter(element, "blur", 0),
    });
  }, [element, unitToPercent]);

  // 使用 useRef 保存最新的节流状态
  const throttleRefs = useRef({
    lastCall: 0,
    timeoutId: null as ReturnType<typeof setTimeout> | null,
  });

  // 节流函数（比防抖更适合连续拖拽场景）
  const throttle = useCallback((func: Function, limit: number) => {
    const now = Date.now();
    const timeSinceLastCall = now - throttleRefs.current.lastCall;

    if (timeSinceLastCall >= limit) {
      func();
      throttleRefs.current.lastCall = now;
    } else {
      if (throttleRefs.current.timeoutId) {
        clearTimeout(throttleRefs.current.timeoutId);
      }
      
      throttleRefs.current.timeoutId = setTimeout(() => {
        func();
        throttleRefs.current.lastCall = Date.now();
        throttleRefs.current.timeoutId = null;
      }, limit - timeSinceLastCall);
    }
  }, []);

  // 使用节流的元素更新函数
  const throttledUpdateElement = useCallback((
    type: keyof FilterParams, 
    modelValue: number
  ) => {
    if (!isImageElement(element)) return;
    
    throttle(() => {
      const filterUpdates = setImageFilter(element, type, modelValue);
      onUpdateElement(element.id, filterUpdates);
    }, 16); // 约60fps
  }, [element, onUpdateElement, throttle]);

  // 是否正在拖拽状态
  const [isDragging, setIsDragging] = useState(false);

  // 拖拽结束时保存最终值
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    // 拖拽结束时强制更新一次，确保最终值被保存
    if (!isImageElement(element)) return;
    
    // 将当前本地状态同步到元素
    const updates: {[key: string]: number} = {};
    if (filters.brightness !== undefined) {
      updates.brightness = percentToUnit(filters.brightness);
    }
    if (filters.grayscale !== undefined) {
      updates.grayscale = percentToUnit(filters.grayscale);
    }
    if (filters.blur !== undefined) {
      updates.blur = filters.blur;
    }
    
    const filterUpdates = setImageFilters(element, updates);
    onUpdateElement(element.id, filterUpdates);
  }, [element, filters, onUpdateElement, percentToUnit]);

  // 拖拽开始时设置状态
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // 处理滤镜变化 - 根据拖拽状态优化更新策略
  const handleFilterChange = useCallback((type: keyof FilterParams, value: number) => {
    if (!isImageElement(element)) return;

    // 边界检查并转换值
    let validValue = value;
    let modelValue = value;

    switch (type) {
      case "brightness":
        validValue = Math.max(0, Math.min(200, value));
        modelValue = percentToUnit(validValue); // 转换为0-2范围
        break;
      case "grayscale":
        validValue = Math.max(0, Math.min(100, value));
        modelValue = percentToUnit(validValue); // 转换为0-1范围
        break;
      case "blur":
        validValue = Math.max(0, Math.min(20, value));
        modelValue = validValue; // 保持原值（像素单位）
        break;
    }

    // 立即更新本地状态以保持滑块位置同步（UI更新）
    setFilters(prev => ({
      ...prev,
      [type]: validValue
    }));

    // 实时更新元素属性，提升交互体验
    if (isDragging) {
      // 拖拽过程中实时更新
      const filterUpdates = setImageFilter(element, type, modelValue);
      onUpdateElement(element.id, filterUpdates);
    } else {
      // 非拖拽状态下使用节流更新
      throttledUpdateElement(type, modelValue);
    }
  }, [element, isDragging, onUpdateElement, percentToUnit, throttledUpdateElement]);

  // 滤镜滑块组件 - 使用React.memo优化
  const FilterSlider = React.memo<{
    type: keyof FilterParams;
    label: string;
    min: number;
    max: number;
    value: number;
    unit?: string;
    onFilterChange: (type: keyof FilterParams, value: number) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
  }>(({ type, label, min, max, value, unit = "%", onFilterChange, onDragStart, onDragEnd }) => {
    const sliderRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isLocalDragging, setIsLocalDragging] = useState(false);

    // 使用useCallback优化事件处理函数
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onFilterChange(type, newValue);
    }, [type, onFilterChange]);

    // 处理鼠标滚轮事件 - 禁用鼠标滚轮控制
    const handleWheel = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
      e.preventDefault();
    }, []);

    // 处理键盘事件
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isFocused) return;

      let delta = 0;

      switch (e.key) {
        case "ArrowLeft":
          delta = e.shiftKey ? -10 : -5;
          break;
        case "ArrowRight":
          delta = e.shiftKey ? 10 : 5;
          break;
        case "ArrowDown":
          delta = e.shiftKey ? -20 : -10;
          break;
        case "ArrowUp":
          delta = e.shiftKey ? 20 : 10;
          break;
        default:
          return;
      }

      const newValue = Math.max(min, Math.min(max, value + delta));
      onFilterChange(type, newValue);

      // 阻止默认行为以避免页面滚动
      e.preventDefault();
    }, [isFocused, min, max, value, type, onFilterChange]);

    // 处理焦点事件
    const handleFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      setIsLocalDragging(false);
      onDragEnd();
    }, [onDragEnd]);

    // 处理拖拽开始/结束
    const handleLocalDragStart = useCallback(() => {
      setIsLocalDragging(true);
      onDragStart();
    }, [onDragStart]);

    const handleLocalDragEnd = useCallback(() => {
      setIsLocalDragging(false);
      onDragEnd();
    }, [onDragEnd]);

    // 获取滑块样式类
    const getSliderClassName = useCallback(() => {
      return [
        styles.slider,
        isFocused && styles.sliderFocused,
        isLocalDragging && styles.sliderDragging,
      ]
        .filter(Boolean)
        .join(" ");
    }, [isFocused, isLocalDragging]);

    return (
      <div 
        className={styles.filterControl}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.labelRow}>
          <label>{label}</label>
          <span className={styles.valueDisplay}>
            {Math.round(value)}
            {unit}
          </span>
        </div>
        <input
          ref={sliderRef}
          type="range"
          min={min}
          max={max}
          value={value}
          step={type === 'blur' ? 0.5 : 1}
          onInput={handleInputChange}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseDown={handleLocalDragStart}
          onMouseUp={handleLocalDragEnd}
          onTouchStart={handleLocalDragStart}
          onTouchEnd={handleLocalDragEnd}
          className={getSliderClassName()}
          tabIndex={0}
          aria-label={`${label}: ${Math.round(value)}${unit}`}
          data-dragging={isLocalDragging}
        />
      </div>
    );
  });

  // 只在元素是图片时渲染滤镜控件
  if (!isImageElement(element)) {
    return null;
  }

  return (
    <div className={styles.filterControls}>
      <FilterSlider
        type="brightness"
        label="亮度"
        min={0}
        max={200}
        value={filters.brightness}
        onFilterChange={handleFilterChange}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
      <FilterSlider
        type="grayscale"
        label="灰度"
        min={0}
        max={100}
        value={filters.grayscale}
        onFilterChange={handleFilterChange}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
      <FilterSlider
        type="blur"
        label="模糊"
        min={0}
        max={20}
        value={filters.blur}
        unit="px"
        onFilterChange={handleFilterChange}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
    </div>
  );
};