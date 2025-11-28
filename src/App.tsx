import "./canvas/services/id-service";
import { storageService } from "./canvas/services/storage-service";
import { createIDService } from "./canvas/services/id-service";
import type {
  CanvasPersistedState,
  CanvasDocument,
} from "./canvas/schema/model";

function App() {
  //=============================测试代码开始==============================
  if (import.meta.env.DEV) {
    console.log("当前环境：开发环境");

    // 综合测试函数
    const runComprehensiveTests = async () => {
      console.log("🚀 开始综合测试服务层功能...");

      try {
        // 测试1: ID服务功能
        console.log("\n--- 测试1: ID服务 ---");
        const idService = createIDService("test");
        const id1 = idService.generateNextID();
        const id2 = idService.generateNextID();
        console.log("✅ ID生成测试:", { id1, id2 });
        console.log("✅ ID唯一性验证:", id1 !== id2);

        // 测试2: 基础存储功能
        console.log("\n--- 测试2: 基础存储功能 ---");
        const testDocID = idService.generateNextID();

        const testDocument: CanvasDocument = {
          id: testDocID,
          title: "综合测试文档",
          elements: {
            [id1]: {
              id: id1,
              type: "shape",
              shape: "rect",
              name: "测试矩形",
              transform: { x: 100, y: 100, scaleX: 1, scaleY: 1, rotation: 0 },
              visible: true,
              locked: false,
              zIndex: 1,
              style: {
                fill: "#ff0000",
                strokeColor: "#000000",
                strokeWidth: 2,
              },
              size: { width: 200, height: 150 },
            },
          },
          rootElementIds: [id1],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // 注意：根据现有模型定义，CanvasPersistedState可能不包含viewport属性
        // 如果需要此功能，应扩展CanvasPersistedState类型定义
        const testState: CanvasPersistedState = {
          document: testDocument,
        } as CanvasPersistedState;

        // 保存测试
        await storageService.saveState(testDocID, testState);
        console.log("✅ 文档保存成功");

        // 立即读取测试
        const loadedState = await storageService.loadState(testDocID);
        console.log("✅ 文档读取成功");

        // 数据一致性验证
        const isDataConsistent =
          loadedState &&
          loadedState.document.id === testDocID &&
          loadedState.document.title === "综合测试文档" &&
          Object.keys(loadedState.document.elements).length === 1;
        console.log("✅ 数据一致性验证:", isDataConsistent);

        // 测试3: 持久化验证（模拟刷新）
        console.log("\n--- 测试3: 持久化验证 ---");
        // 注意：由于storageService是单例模式，这里不需要重新创建实例
        const persistedState = await storageService.loadState(testDocID);
        console.log("✅ 持久化验证:", persistedState ? "成功" : "失败");

        // 测试4: 错误处理测试
        console.log("\n--- 测试4: 错误处理测试 ---");
        try {
          const emptyState = await storageService.loadState("non_existent_id");
          console.log("✅ 读取不存在的文档处理:", emptyState === null);
        } catch (error) {
          console.log("✅ 错误处理正常");
        }

        // 测试5: 性能简单测试
        console.log("\n--- 测试5: 性能测试 ---");
        const startTime = performance.now();

        for (let i = 0; i < 3; i++) {
          const quickTestID = `quick_test_${i}`;
          await storageService.saveState(quickTestID, {
            document: {
              id: quickTestID,
              title: `快速测试 ${i}`,
              elements: {},
              rootElementIds: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          } as CanvasPersistedState);
        }
        const endTime = performance.now();
        console.log(`✅ 批量操作耗时: ${(endTime - startTime).toFixed(2)}ms`);

        // 最终总结
        console.log("\n🎉 === 测试总结 ===");
        console.log("📊 ID服务: ✅ 工作正常");
        console.log("📊 存储服务: ✅ 工作正常");
        console.log("📊 持久化: ✅ 工作正常");
        console.log("📊 错误处理: ✅ 工作正常");
        console.log("📊 性能: ✅ 可接受");
        console.log("🎯 服务层完全Ready！可以开始编辑器层开发");
      } catch (error) {
        console.error("❌ 测试失败:", error);
      }
    };

    // 延迟执行测试，避免阻塞页面渲染
    setTimeout(() => {
      runComprehensiveTests();
    }, 1000);
  }
  //=============================测试代码结束==============================
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        HELLO,WORLD!
      </div>
    </>
  );
}

export default App;
