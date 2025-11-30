// // CornerRadiusControl.tsx

// import React, { useState, useEffect } from "react";
// import type { ID, CanvasElement } from "../../canvas/schema/model";
// import { getElementCornerRadius, setElementCornerRadius } from "./utils";
// import styles from "./ElementToolbar.module.css";

// interface CornerRadiusControlProps {
//   element: CanvasElement;
//   onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
// }

// export const CornerRadiusControl: React.FC<CornerRadiusControlProps> = ({ 
//   element, 
//   onUpdateElement 
// }) => {
//   const [cornerRadius, setCornerRadius] = useState(0);
//   const [isDragging, setIsDragging] = useState(false);

//   // 同步元素圆角半径
//   useEffect(() => {
//     setCornerRadius(getElementCornerRadius(element));
//   }, [element]);

//   // 处理半径变化
//   const handleRadiusChange = (value: number) => {
//     const validValue = Math.max(0, Math.min(50, value));
//     setCornerRadius(validValue);
    
//     const radiusUpdates = setElementCornerRadius(element, validValue);
//     onUpdateElement(element.id, radiusUpdates);
//   };

//   // 处理滑块拖拽事件
//   const handleSliderMouseDown = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     setIsDragging(true);
//   };

//   const handleSliderMouseUp = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     setIsDragging(false);
//   };

//   // 处理输入框变化
//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = parseInt(e.target.value, 10);
//     if (!isNaN(value)) {
//       handleRadiusChange(value);
//     }
//   };

//   // 仅对矩形和圆角矩形显示
//   if (element.type !== 'shape' || (element.shape !== 'rect' && element.shape !== 'roundRect')) {
//     return null;
//   }

//   return (
//     <div 
//       className={styles.cornerRadiusControlContainer}
//       onMouseDown={(e) => e.stopPropagation()}
//     >
//       <div className={styles.cornerRadiusControlHeader}>
//         <label className={styles.cornerRadiusControlLabel}>圆角半径</label>
//       </div>

//       <div className={styles.cornerRadiusInputWrapper}>
//         <input
//           type="number"
//           value={cornerRadius}
//           onChange={handleInputChange}
//           min="0"
//           max="50"
//           className={styles.cornerRadiusInput}
//           onMouseDown={(e) => e.stopPropagation()}
//         />
//         <span className={styles.cornerRadiusUnit}>px</span>
//       </div>

//       <input
//         type="range"
//         min="0"
//         max="50"
//         step="1"
//         value={cornerRadius}
//         onChange={(e) => handleRadiusChange(Number(e.target.value))}
//         onMouseDown={handleSliderMouseDown}
//         onMouseUp={handleSliderMouseUp}
//         className={styles.cornerRadiusSlider}
//       />
//     </div>
//   );
// };