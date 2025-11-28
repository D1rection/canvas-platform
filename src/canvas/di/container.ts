import { createIDService } from "../services/id-service";
import { createStorageService } from "../services/storage-service";
import { createEditorService } from "../editor/editor";
import type {
  IIDService,
  IStorageService,
  IEditorService,
} from "../schema/interfaces";

/**
 * 创建一个完整的画布 IOC 容器。
 *
 * - 组装 ID 服务、存储服务、编辑服务
 * - 在页面层（如 CanvasPage.tsx / App.tsx）中调用，用于初始化整个画布子系统
 */
export interface CanvasContainer {
  idService: IIDService;
  storageService: IStorageService;
  editorService: IEditorService;
}

export function createCanvasContainer(): CanvasContainer {
  const idService = createIDService("canvas");
  const storageService = createStorageService();
  const editorService = createEditorService({ idService, storageService });

  return {
    idService,
    storageService,
    editorService,
  };
}
