import React from "react";
import {
  LuMousePointer2,
  LuHand,
  LuSquare,
  LuCircle,
  LuImage,
  LuType,
  LuTriangle,
} from "react-icons/lu";
import styles from "./Toolbar.module.css";

export type ToolType =
  | "select"
  | "pan"
  | "rect"
  | "circle"
  | "triangle"
  | "image"
  | "text";

interface ToolConfig {
  type: ToolType;
  icon: React.ReactNode;
  label: string;
}

const TOOLS: ToolConfig[] = [
  { type: "select", icon: <LuMousePointer2 size={20} />, label: "选择" },
  { type: "pan", icon: <LuHand size={20} />, label: "拖动" },
  { type: "rect", icon: <LuSquare size={20} />, label: "矩形" },
  { type: "circle", icon: <LuCircle size={20} />, label: "圆形" },
  { type: "triangle", icon: <LuTriangle size={20} />, label: "三角形" },
  { type: "image", icon: <LuImage size={20} />, label: "图片" },
  { type: "text", icon: <LuType size={20} />, label: "文本" },
];

interface ToolbarProps {
  currentTool: ToolType;
  onChangeTool: (tool: ToolType) => void;
}

/**
 * 画布工具栏组件。
 *
 * - 只负责展示和切换当前工具，不直接依赖编辑层
 * - 具体工具行为由上层（例如 App）根据 `currentTool` 决定
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onChangeTool,
}) => {
  return (
    <div className={styles.toolbar}>
      {TOOLS.map(({ type, icon, label }) => (
        <button
          key={type}
          type="button"
          onClick={() => onChangeTool(type)}
          className={`${styles.toolbarButton} ${
            currentTool === type ? styles.toolbarButtonActive : ""
          }`}
          title={label}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};
