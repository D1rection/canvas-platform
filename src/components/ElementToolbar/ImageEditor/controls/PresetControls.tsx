// ImageEditor/controls/PresetControls.tsx
import React from "react";
import type { CanvasElement, ID, ImageFilter } from "../../../../canvas/schema/model";
import styles from "./PresetControls.module.css";

interface PresetControlsProps {
  element: CanvasElement;
  onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
}

// 预设定义
type FilterPreset = {
  name: string;
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    grayscale: number;
    hueRotate: number;
    blur: number;
  };
};

// 将预设转换为ImageFilter数组
const convertPresetToImageFilters = (presetFilters: FilterPreset['filters']): ImageFilter[] => {
  const filters: ImageFilter[] = [];
  
  if (presetFilters.grayscale > 0) {
    filters.push({ id: 'grayscale', type: 'grayscale', value: presetFilters.grayscale / 100 });
  }
  if (presetFilters.brightness !== 100) {
    filters.push({ id: 'brightness', type: 'brightness', value: presetFilters.brightness / 100 });
  }
  if (presetFilters.blur > 0) {
    filters.push({ id: 'blur', type: 'blur', value: presetFilters.blur });
  }
  
  return filters;
};

const PRESETS: FilterPreset[] = [
  { name: "原始", filters: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, hueRotate: 0, blur: 0 } },
  { name: "黑白", filters: { brightness: 100, contrast: 120, saturation: 0, grayscale: 100, hueRotate: 0, blur: 0 } },
  { name: "复古", filters: { brightness: 90, contrast: 90, saturation: 70, grayscale: 30, hueRotate: 350, blur: 0 } },
  { name: "鲜艳", filters: { brightness: 105, contrast: 110, saturation: 150, grayscale: 0, hueRotate: 0, blur: 0 } },
  { name: "高对比度", filters: { brightness: 90, contrast: 150, saturation: 120, grayscale: 0, hueRotate: 0, blur: 0 } },
  { name: "电影感", filters: { brightness: 85, contrast: 120, saturation: 90, grayscale: 10, hueRotate: 340, blur: 0.5 } },
];

export const PresetControls: React.FC<PresetControlsProps> = ({ 
  element, 
  onUpdateElement 
}) => {
  // 应用预设
  const applyPreset = (preset: FilterPreset) => {
    if (element.type === 'image') {
      onUpdateElement(element.id, {
        filters: convertPresetToImageFilters(preset.filters)
      });
    }
  };

  return (
    <div className={styles.presetContainer}>
      <h3>预设效果</h3>
      <div className={styles.presetGrid}>
        {PRESETS.map((preset, index) => (
          <button
            key={index}
            className={styles.presetButton}
            onClick={() => applyPreset(preset)}
            title={preset.name}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
};