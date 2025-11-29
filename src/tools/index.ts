import type { ToolHandler } from "./types";
import { selectTool } from "./select";
import { panTool } from "./pan";
import { rectTool } from "./rect";
import { circleTool } from "./circle";
import { imageTool } from "./image";
import { textTool } from "./text";
import { triangleTool } from "./triangle";

export type { ToolHandler, ToolContext } from "./types";

/**
 * 工具注册表
 */
export const toolRegistry: Record<string, ToolHandler> = {
  select: selectTool,
  pan: panTool,
  rect: rectTool,
  circle: circleTool,
  triangle: triangleTool,
  image: imageTool,
  text: textTool,
};

/**
 * 获取指定工具的处理器
 */
export function getToolHandler(toolType: string): ToolHandler {
  return toolRegistry[toolType] ?? selectTool;
}

