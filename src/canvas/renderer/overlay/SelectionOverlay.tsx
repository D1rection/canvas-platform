import React from "react";
import type { CanvasElement, ID, Transform, Size, Point, ViewportState } from "../../schema/model";
import { SelectionBox } from "./SelectionBox";
import { MultiSelectionBox } from "./MultiSelectionBox";

interface SelectionOverlayProps {
  selectedIds: ID[];
  elements: Record<ID, CanvasElement>;
  viewport: ViewportState;
  onRotateHandlePointerDown?: (id: ID | undefined, e: React.PointerEvent) => void;
}

/**
 * 计算旋转元素的真实边界顶点
 */
function getElementCorners(transform: Transform, size: Size): Point[] {
  const { x, y, rotation, scaleX, scaleY } = transform;
  const { width, height } = size;

  // 元素的四个角（相对于元素原点）
  const localCorners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  const rad = rotation * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // 计算变换后的世界坐标
  return localCorners.map(corner => {
    // 先应用缩放
    let cx = corner.x * scaleX;
    let cy = corner.y * scaleY;

    // 再应用旋转
    const rx = cx * cos - cy * sin;
    const ry = cx * sin + cy * cos;

    // 最后应用平移
    return {
      x: x + rx,
      y: y + ry,
    };
  });
}

/**
 * 计算多个元素的最小包围矩形
 */
function calculateBoundingRect(
  elements: Array<CanvasElement & { size: Size }>,
  viewport: ViewportState,
  scale: number
) {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach(element => {
    // 计算元素经过旋转缩放后的四个顶点
    const corners = getElementCorners(element.transform, element.size);

    corners.forEach(corner => {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    });
  });

  // 转换为屏幕坐标
  const left = (minX - viewport.x) * scale;
  const top = (minY - viewport.y) * scale;
  const width = (maxX - minX) * scale;
  const height = (maxY - minY) * scale;

  return { left, top, width, height };
}

/**
 * 选中效果覆盖层
 * - 单选：显示单个元素的可调整选中框
 * - 多选：显示统一的包围选中框
 */
export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  selectedIds,
  elements,
  viewport,
  onRotateHandlePointerDown,
}) => {
  const scale = viewport.scale;

  // 过滤出有效的选中元素 (只包含有size属性的元素)
  const selectedElements = selectedIds
    .map(id => elements[id])
    .filter(el => el && el.visible && "size" in el) as Array<CanvasElement & { size: Size }>;

  if (selectedElements.length === 0) return null;

  // 单选
  if (selectedElements.length === 1) {
    const element = selectedElements[0];
    const { transform, size } = element;
    const left = (transform.x - viewport.x) * scale;
    const top = (transform.y - viewport.y) * scale;
    const width = size.width * scale;
    const height = size.height * scale;

    return (
      <SelectionBox
        left={left}
        top={top}
        width={width}
        height={height}
        rotation={transform.rotation}
        id={element.id}
        onRotateHandlePointerDown={onRotateHandlePointerDown}
      />
    );
  }

  // 多选：计算所有元素的总体边界，显示统一包围框
  const bounds = calculateBoundingRect(selectedElements, viewport, scale);
  if (!bounds) return null;

  return (
    <MultiSelectionBox
      left={bounds.left}
      top={bounds.top}
      width={bounds.width}
      height={bounds.height}
    />
  );
};
