import React, { useMemo, useRef, useState } from "react";
import type {
  CanvasDocument,
  ViewportState,
  CanvasElement,
  ShapeElement,
  ImageElement as ImageElementType,
} from "../../canvas/schema/model";
import styles from "./VerticalScrollbar.module.css";

interface VerticalScrollbarProps {
  document: CanvasDocument;
  viewport: ViewportState;
  /** 画布在屏幕上的可见高度（像素） */
  viewportPixelHeight: number;
  /** 当滚动条位置改变时回调新的视口 y 值（场景坐标） */
  onChangeViewportY: (nextY: number) => void;
}

// 简单的类型守卫，确认元素拥有 size
function hasSize(
  el: CanvasElement,
): el is CanvasElement & { size: { width: number; height: number } } {
  return "size" in el && !!(el as any).size;
}

export const VerticalScrollbar: React.FC<VerticalScrollbarProps> = ({
  document,
  viewport,
  viewportPixelHeight,
  onChangeViewportY,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<number>(0);

  // 基于文档元素和当前视口计算内容高度以及当前视口在其中的位置
  const metrics = useMemo(() => {
    if (viewportPixelHeight <= 0) {
      return null;
    }

    const elements = Object.values(document.elements || {}) as CanvasElement[];

    // 计算所有元素在场景坐标系下的垂直范围
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    elements.forEach((el) => {
      if (!el || !el.visible || el.type === "group") return;
      if (!hasSize(el)) return;

      const { transform, size } = el as ShapeElement | ImageElementType;
      const height = size.height * (transform.scaleY || 1);
      const top = transform.y;
      const bottom = transform.y + height;

      if (top < minY) minY = top;
      if (bottom > maxY) maxY = bottom;
    });

    // 当文档为空时，使用当前视口位置作为参考
    if (!isFinite(minY) || !isFinite(maxY)) {
      const viewportWorldHeightFallback =
        viewportPixelHeight / Math.max(viewport.scale || 1, 0.0001);
      minY = viewport.y;
      maxY = viewport.y + viewportWorldHeightFallback;
    }

    const viewportWorldHeight =
      viewportPixelHeight / Math.max(viewport.scale || 1, 0.0001);

    // 保证内容区域至少覆盖当前视口
    minY = Math.min(minY, viewport.y);
    maxY = Math.max(maxY, viewport.y + viewportWorldHeight);

    // 内容区域与元素实际范围对齐，不再额外添加上下 padding，
    // 这样拖动条拖到最顶/最底时刚好对应内容的首尾。
    const contentTop = minY;
    const contentBottom = maxY;
    const contentHeight = Math.max(
      contentBottom - contentTop,
      viewportWorldHeight,
    );

    const maxScrollWorld = contentHeight - viewportWorldHeight;

    if (maxScrollWorld <= 0) {
      // 内容没有超出视口，不需要显示滚动条
      return null;
    }

    // 当前视口顶部在内容中的偏移
    const scrollWorld = viewport.y - contentTop;
    const clampedScrollWorld = Math.min(
      Math.max(scrollWorld, 0),
      maxScrollWorld,
    );

    const visibleRatio = viewportWorldHeight / contentHeight;
    const trackHeight = viewportPixelHeight;
    const minThumbPx = 24;
    const thumbHeight = Math.max(
      visibleRatio * trackHeight,
      minThumbPx,
    );
    const maxOffsetPx = trackHeight - thumbHeight;
    const scrollRatio =
      maxScrollWorld === 0 ? 0 : clampedScrollWorld / maxScrollWorld;
    const thumbTop = scrollRatio * maxOffsetPx;

    return {
      contentTop,
      contentHeight,
      viewportWorldHeight,
      maxScrollWorld,
      thumbHeight,
      maxOffsetPx,
      thumbTop,
    };
  }, [document.elements, viewport, viewportPixelHeight]);

  if (!metrics) {
    return null;
  }

  const {
    contentTop,
    maxScrollWorld,
    thumbHeight,
    maxOffsetPx,
    thumbTop,
  } = metrics;

  const handlePointerDownOnThumb = (
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!trackRef.current) return;

    const trackRect = trackRef.current.getBoundingClientRect();
    const initialThumbTop = thumbTop;
    const pointerOffsetInThumb = e.clientY - (trackRect.top + initialThumbTop);
    dragOffsetRef.current = pointerOffsetInThumb;
    setIsDragging(true);

    const handlePointerMove = (event: PointerEvent) => {
      if (!trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      let nextThumbTop =
        event.clientY - rect.top - dragOffsetRef.current;
      if (nextThumbTop < 0) nextThumbTop = 0;
      if (nextThumbTop > maxOffsetPx) nextThumbTop = maxOffsetPx;

      const nextRatio =
        maxOffsetPx === 0 ? 0 : nextThumbTop / maxOffsetPx;
      const nextViewportY = contentTop + nextRatio * maxScrollWorld;
      onChangeViewportY(nextViewportY);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div className={styles.root}>
      <div className={styles.track} ref={trackRef}>
        <div
          className={`${styles.thumb} ${
            isDragging ? styles.thumbDragging : ""
          }`}
          style={{
            height: `${thumbHeight}px`,
            top: `${thumbTop}px`,
          }}
          onPointerDown={handlePointerDownOnThumb}
        />
      </div>
    </div>
  );
};
