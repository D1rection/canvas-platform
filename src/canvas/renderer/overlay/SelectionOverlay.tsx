import React from "react";
import type { CanvasElement, ID, ViewportState } from "../../schema/model";
import { SelectionBox } from "./SelectionBox";

interface SelectionOverlayProps {
  selectedIds: ID[];
  elements: Record<ID, CanvasElement>;
  viewport: ViewportState;
}

/**
 * 选中效果覆盖层
 * - 为所有选中的元素渲染选中框
 */
export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  selectedIds,
  elements,
  viewport,
}) => {
  const scale = viewport.scale;
  return (
    <>
      {selectedIds.map((id) => {
        const el = elements[id];
        if (!el || !el.visible) return null;

        // 只有带 size 的元素类型才渲染选中框
        if (!("size" in el)) return null;

        const { transform, size } = el;
        const left = (transform.x - viewport.x) * scale;
        const top = (transform.y - viewport.y) * scale;
        const width = size.width * scale;
        const height = size.height * scale;

        return (
          <SelectionBox
            key={`selection-${id}`}
            left={left}
            top={top}
            width={width}
            height={height}
            rotation={transform.rotation}
          />
        );
      })}
    </>
  );
};

