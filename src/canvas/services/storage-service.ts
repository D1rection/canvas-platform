/**
 * 创建一个基于 IndexedDB 的持久化服务实现。
 * 提供更可靠的本地存储能力，支持更大规模的数据存储和事务操作。
 */
import type { IStorageService } from "../schema/interfaces";
import type { ID, CanvasPersistedState, CanvasDocument } from "../schema/model";

// 数据库配置
const DB_NAME = "canvas-platform-db";
const DB_VERSION = 1;
const STORE_NAME = "canvas-documents";

/**
 * 打开并初始化IndexedDB连接的辅助函数
 *
 * @returns Promise<IDBDatabase> 数据库连接实例
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // 数据库升级或首次创建时触发
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 检查并创建对象存储空间（如果不存在）
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // 创建文档对象存储空间，以docID为键
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "docID",
        });

        console.log(
          `Created object store: ${STORE_NAME} with keyPath: 'docID'`
        );
      }
    };

    // 数据库打开成功
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    // 数据库打开失败
    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * 创建基于 IndexedDB 的存储服务实例
 *
 * @returns 符合 IStorageService 接口的存储服务
 */
export function createStorageService(): IStorageService {
  // 存储服务的主要功能实现
  return {
    /**
     * 从 IndexedDB 读取指定文档的持久化状态
     *
     * @param docID 文档 ID
     * @returns 文档状态或 null（如果不存在）
     */
    loadState: async (docID: ID): Promise<CanvasPersistedState | null> => {
      try {
        const db = await openDatabase();

        return new Promise((resolve) => {
          // 创建只读事务
          const transaction = db.transaction(STORE_NAME, "readonly");
          const store = transaction.objectStore(STORE_NAME);

          // 获取指定文档
          const getRequest = store.get(docID);

          getRequest.onsuccess = () => {
            const result = getRequest.result;
            if (result) {
              // 移除docID字段，返回纯的CanvasPersistedState对象
              const { docID: _, ...stateData } = result;
              resolve(stateData as CanvasPersistedState);
            } else {
              resolve(null);
            }
          };

          getRequest.onerror = () => {
            console.error("Error loading document:", getRequest.error);
            resolve(null); // 出错时返回null而不是抛出异常
          };

          transaction.oncomplete = () => {
            db.close();
          };
        });
      } catch (error) {
        console.error("Failed to load state from IndexedDB:", error);
        return null;
      }
    },

    /**
     * 将文档状态保存到 IndexedDB
     *
     * @param docID 文档 ID
     * @param state 要保存的画布持久化状态
     */
    saveState: async (
      docID: ID,
      state: CanvasPersistedState
    ): Promise<void> => {
      try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
          // 创建读写事务
          const transaction = db.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);

          // 确保对象包含正确的键路径'docID'
          const dataToSave = {
            docID, // 明确设置键路径值
            ...state, // 合并原始状态对象
          };

          const putRequest = store.put(dataToSave);

          putRequest.onsuccess = () => {
            console.log(`Successfully saved canvas state for docID: ${docID}`);
          };

          putRequest.onerror = () => {
            console.error("Error saving document:", putRequest.error);
            reject(new Error("Failed to save canvas state"));
          };

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };

          transaction.onerror = () => {
            reject(new Error("Transaction failed"));
          };
        });
      } catch (error) {
        console.error("Failed to save state to IndexedDB:", error);
        throw new Error("Failed to save canvas state");
      }
    },
  };
}

// 创建并导出默认的存储服务实例
export const storageService = createStorageService();

// 示例使用代码（开发环境下可取消注释测试）
if (import.meta.env.DEV) {
  console.log("IndexedDB Storage service initialized");
  // 以下是测试代码示例
  /*
  (async () => {
    try {
      // 测试保存
      await storageService.saveState('test-doc-1', {
        document: {
          id: 'test-doc-1',
          rootNodeId: 'root-1',
          nodes: {}
        }
      });
      console.log('Test document saved successfully');
      
      // 测试加载
      const loadedState = await storageService.loadState('test-doc-1');
      console.log('Loaded test document:', loadedState);
    } catch (error) {
      console.error('Test failed:', error);
    }
  })();
  */
}
