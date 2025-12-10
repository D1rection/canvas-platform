import type { CSSProperties } from "react";

/**
 * 生成一个可按角度旋转的缩放光标（双向箭头）
 *
 * - 通过 SVG + data URL 的方式自定义 cursor 形状
 * - angleDeg 为相对于 X 轴（向右）的角度，单位为度
 */
export function createResizeCursor(angleDeg: number): CSSProperties["cursor"] {
  const size = 32;
  const center = size / 2;

  // 深灰色双向箭头
  const arrowColor = "#333";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="rotate(${angleDeg} ${center} ${center})"
     stroke="${arrowColor}"
     stroke-width="1.2"
     fill="${arrowColor}"
     stroke-linecap="round"
     stroke-linejoin="round">
    <!-- 中间轴线（稍微粗一点） -->
    <line x1="${center - 8}" y1="${center}" x2="${center + 8}" y2="${center}" />
    <!-- 左侧箭头（比之前更小一点） -->
    <path d="M ${center - 10} ${center} L ${center - 5} ${center - 3} L ${center - 5} ${center + 3} Z" />
    <!-- 右侧箭头（对称） -->
    <path d="M ${center + 10} ${center} L ${center + 5} ${center - 3} L ${center + 5} ${center + 3} Z" />
  </g>
</svg>`;

  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  // hotspot 放在中心，fallback 使用 auto
  return `url("${url}") ${center} ${center}, auto`;
}
