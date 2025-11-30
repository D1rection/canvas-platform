// // BorderWidthControl.tsx

// import React, { useState, useEffect } from "react";
// import type { ID, CanvasElement } from "../../canvas/schema/model";
// import { getElementBorderWidth, setElementBorderWidth } from "./utils";
// import styles from "./ElementToolbar.module.css";

// interface BorderWidthControlProps {
//   element: CanvasElement;
//   onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
// }

// export const BorderWidthControl: React.FC<BorderWidthControlProps> = ({ 
//   element, 
//   onUpdateElement 
// }) => {
//   const [borderWidth, setBorderWidth] = useState(1);

//   // 同步元素边框宽度
//   useEffect(() => {
//     setBorderWidth(getElementBorderWidth(element));
//   }, [element]);

//   // 处理宽度变化
//   const handleWidthChange = (value: number) => {
//     const validValue = Math.max(1, Math.min(20, value));
//     setBorderWidth(validValue);
    
//     const widthUpdates = setElementBorderWidth(element, validValue);
//     onUpdateElement(element.id, widthUpdates);
//   };

//   // 阻止事件冒泡
//   const handleSliderEvent = (e: React.MouseEvent) => {
//     e.stopPropagation();
//   };

//   // 处理输入框变化
//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = parseInt(e.target.value, 10);
//     if (!isNaN(value)) {
//       handleWidthChange(value);
//     }
//   };

//   // 仅对形状类型元素显示
//   if (element.type !== 'shape') return null;

//   return (
//     <div 
//       className={styles.borderWidthControlContainer}
//       onMouseDown={(e) => e.stopPropagation()}
//     >
//       <div className={styles.borderWidthControlHeader}>
//         <label className={styles.borderWidthControlLabel}>边框宽度</label>
//       </div>

//       <div className={styles.borderWidthInputWrapper}>
//         <input
//           type="number"
//           value={borderWidth}
//           onChange={handleInputChange}
//           min="1"
//           max="20"
//           className={styles.borderWidthInput}
//           onMouseDown={(e) => e.stopPropagation()}
//         />
//         <span className={styles.borderWidthUnit}>px</span>
//       </div>

//       <input
//         type="range"
//         min="1"
//         max="20"
//         step="1"
//         value={borderWidth}
//         onChange={(e) => handleWidthChange(Number(e.target.value))}
//         onMouseDown={handleSliderEvent}
//         onMouseUp={handleSliderEvent}
//         className={styles.borderWidthSlider}
//       />
//     </div>
//   );
// };