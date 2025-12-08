import { debounce, type DebouncedFunc } from "lodash-es";
import { useCallback, useEffect, useRef } from "react";

interface PointerSignalOptions {
  delay?: number; // 单击延迟触发的毫秒数
  dragThreshold?: number; // 触发拖拽的最小位移像素
}

type PointerHandler = (event: React.PointerEvent<Element>) => void; // 单击回调

/**
 * 延迟触发单击（防止与双击冲突）的通用 Hook。
 * - 单击：等待 delay 后才调用 handler，确保可以区分双击
 * - 拖动：指针移动超过 dragThreshold 时立即触发（不再延迟）
 * - 双击：detail > 1 时直接 cancel，不触发 handler
 */
export function useSignalPointerDown(
  handler?: PointerHandler,
  options?: PointerSignalOptions
) {
  const { delay = 250, dragThreshold = 3 } = options ?? {};

  const handlerRef = useRef<PointerHandler | undefined>(handler); // 始终持有最新 handler
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const debouncedRef =
    useRef<DebouncedFunc<(event: React.PointerEvent<Element>) => void> | null>(
      null
    );
  const pointerCleanupRef = useRef<(() => void) | null>(null);

  const cleanupPointerListeners = useCallback(() => {
    if (pointerCleanupRef.current) {
      pointerCleanupRef.current();
      pointerCleanupRef.current = null;
    }
  }, []);

  const cancelPending = useCallback(() => {
    // 取消待触发的单击（用于双击或 pointerup）
    if (debouncedRef.current) {
      debouncedRef.current.cancel();
      debouncedRef.current = null;
    }
    cleanupPointerListeners();
  }, [cleanupPointerListeners]);

  const flushPending = useCallback(() => {
    // 立即触发单击回调（用于拖动触发）
    if (debouncedRef.current) {
      debouncedRef.current.flush();
      debouncedRef.current = null;
    }
    cleanupPointerListeners();
  }, [cleanupPointerListeners]);

  const schedule = useCallback(
    (event: React.PointerEvent<Element>) => {
      const currentHandler = handlerRef.current;
      if (!currentHandler) return;

      const doc = globalThis?.document;
      if (!doc) {
        currentHandler(event);
        return;
      }

      event.persist?.();

      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;

      // 使用 debounce 控制 250ms 内只触发一次，托管单击延迟
      const debounced = debounce(
        (ev: React.PointerEvent<Element>) => {
          handlerRef.current?.(ev);
        },
        delay,
        { leading: false, trailing: true }
      );

      debouncedRef.current = debounced;
      debounced(event);

      const handleMove = (nativeEv: PointerEvent) => {
        // 光标移动超出阈值，则认为开始拖动，直接 flush
        if (nativeEv.pointerId !== pointerId) return;
        const dx = Math.abs(nativeEv.clientX - startX);
        const dy = Math.abs(nativeEv.clientY - startY);
        if (dx > dragThreshold || dy > dragThreshold) {
          flushPending();
        }
      };

      const handleEnd = (nativeEv: PointerEvent) => {
        if (nativeEv.pointerId !== pointerId) return;
        cancelPending();
      };

      const cleanup = () => {
        doc.removeEventListener("pointermove", handleMove);
        doc.removeEventListener("pointerup", handleEnd);
        doc.removeEventListener("pointercancel", handleEnd);
      };

      doc.addEventListener("pointermove", handleMove);
      doc.addEventListener("pointerup", handleEnd);
      doc.addEventListener("pointercancel", handleEnd);
      pointerCleanupRef.current = () => {
        cleanup();
        pointerCleanupRef.current = null;
      };
    },
    [cancelPending, cleanupPointerListeners, delay, dragThreshold, flushPending]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<Element>) => {
      event.stopPropagation();
      if (!handlerRef.current) return;
      if (event.detail > 1) {
        cancelPending();
        return;
      }
      cancelPending();
      schedule(event);
    },
    [cancelPending, schedule]
  );

  useEffect(() => cancelPending, [cancelPending]);

  return {
    handlePointerDown,
    cancelPending,
  };
}
