import type { IIDService } from "../schema/interfaces";
import type { ID } from "../schema/model";

/**
 * 创建一个 ID 生成服务。
 *
 * - 保证在单页面会话内基本唯一，满足前端草稿编辑场景
 * - 具体实现可以用UUID，或者其他全局唯一ID生成服务
 */
export function createIDService(prefix = "canvas"): IIDService {
  let counter = 0;

  const generateNextID = (): ID => {
    counter += 1;
    return `${prefix}_${Date.now()}_${counter}` as ID;
  };

  return {
    generateNextID,
  };
}