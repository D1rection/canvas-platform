// import React from "react";
// import { ViewportState, ImageElement as ImageElementType } from "../../schema/model";

// interface Props {
//   element: ImageElementType;
//   viewport: ViewportState;
//   scale: number;
//   onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
// }

// export const ImageElement: React.FC<Props> = ({
//   element,
//   viewport,
//   scale,
//   onPointerDown,
// }) => {
//   const { transform, size, src, filters } = element;

//   // 转换为屏幕坐标
//   const screenX = (transform.x - viewport.x) * scale;
//   const screenY = (transform.y - viewport.y) * scale;
//   const screenW = size.width * scale * transform.scaleX;
//   const screenH = size.height * scale * transform.scaleY;

//   // 解析滤镜
//   const filterCSS = filters
//     .map((f) => {
//       switch (f.type) {
//         case "grayscale": return `grayscale(${f.value})`;
//         case "brightness": return `brightness(${f.value})`;
//         case "blur": return `blur(${f.value}px)`;
//         default: return "";
//       }
//     })
//     .join(" ");

//   return (
//     <div
//       onPointerDown={onPointerDown}
//       style={{
//         position: "absolute",
//         left: screenX,
//         top: screenY,
//         width: screenW,
//         height: screenH,
//         transform: `rotate(${transform.rotation}deg)`,
//         transformOrigin: "center",
//         cursor: "pointer",
//         overflow: "hidden",
//       }}
//     >
//       <img
//         src={src}
//         alt=""
//         draggable={false}
//         style={{
//           width: "100%",
//           height: "100%",
//           objectFit: "contain",
//           filter: filterCSS,
//         }}
//       />
//     </div>
//   );
// };
