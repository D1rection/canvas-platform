import type { IIDService } from "../schema/interfaces";
import type { ID } from "../schema/model";

/**
 * 创建一个 ID 生成服务。
 *
 * - 保证在单页面会话内基本唯一，满足前端草稿编辑场景
 * - 使用UUID实现，确保全局唯一性
 */

// UUID生成函数
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createIDService(prefix = "canvas"): IIDService {
  const generateNextID = (): ID => {
    return `${prefix}_${generateUUID()}` as ID;
  };

  return {
    generateNextID,
  };
}
