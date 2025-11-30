// // BorderColorPicker.tsx

// import React, { useState, useRef, useEffect } from "react";
// import type { ID, CanvasElement } from "../../canvas/schema/model";
// import { getElementBorderColor, setElementBorderColor, COLOR_PRESETS } from "./utils";
// import styles from "./ElementToolbar.module.css";

// interface BorderColorPickerProps {
//   element: CanvasElement;
//   onUpdateElement: (id: ID, updates: Partial<CanvasElement>) => void;
// }

// export const BorderColorPicker: React.FC<BorderColorPickerProps> = ({ 
//   element, 
//   onUpdateElement 
// }) => {
//   const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
//   const [customColor, setCustomColor] = useState('#000000');
//   const colorPickerRef = useRef<HTMLDivElement>(null);
  
//   // 获取当前边框颜色
//   const currentColor = getElementBorderColor(element);

//   // 同步元素边框颜色到自定义颜色输入框
//   useEffect(() => {
//     setCustomColor(currentColor);
//   }, [currentColor]);

//   // 处理点击外部关闭颜色选择器
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (
//         colorPickerRef.current &&
//         !colorPickerRef.current.contains(event.target as Node)
//       ) {
//         setIsColorPickerOpen(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // 处理颜色选择
//   const handleColorSelect = (color: string, event?: React.MouseEvent) => {
//     if (event) {
//       event.stopPropagation();
//     }

//     // 验证Hex颜色格式
//     const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(color);
//     let validColor = isValidHex ? color : currentColor;
    
//     if (validColor !== currentColor) {
//       const colorUpdates = setElementBorderColor(element, validColor);
//       onUpdateElement(element.id, colorUpdates);
//     }
//     setCustomColor(validColor);
//     setIsColorPickerOpen(false);
//   };

//   // 处理颜色选择器开关
//   const handleToggle = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     setIsColorPickerOpen(!isColorPickerOpen);
//   };

//   // 仅对形状类型元素显示
//   if (element.type !== 'shape') return null;

//   return (
//     <div 
//       className={styles.colorPickerContainer} 
//       ref={colorPickerRef}
//       onMouseDown={(e) => e.stopPropagation()}
//     >
//       <button
//         className={styles.borderColorTrigger}
//         onClick={handleToggle}
//         style={{
//           border: `2px solid ${currentColor}`, 
//           background: 'transparent',
//           transform: isColorPickerOpen ? "scale(1.05)" : "scale(1)",
//         }}
//         title="选择边框颜色"
//       >
//         ⯂
//       </button>

//       {isColorPickerOpen && (
//         <div
//           className={styles.colorPickerDropdown}
//           onClick={(e) => e.stopPropagation()}
//         >
//           {/* 预设颜色网格 */}
//           <div className={styles.colorPresets}>
//             {COLOR_PRESETS.map((color) => (
//               <button
//                 key={color}
//                 className={styles.colorOption}
//                 onClick={(e) => handleColorSelect(color, e)}
//                 style={{
//                   background: color,
//                   border: color === "#FFFFFF" ? "1px solid #e0e0e0" : "none",
//                 }}
//                 title={color}
//               />
//             ))}
//           </div>

//           {/* 自定义颜色输入 */}
//           <div className={styles.customColorSection}>
//             <label className={styles.customColorLabel}>自定义边框颜色:</label>
//             <div className={styles.customColorInputs}>
//               <input
//                 type="color"
//                 value={customColor}
//                 onChange={(e) => setCustomColor(e.target.value)}
//                 onBlur={(e) => handleColorSelect(e.target.value)}
//                 className={styles.colorInput}
//               />
//               <input
//                 type="text"
//                 value={customColor}
//                 onChange={(e) => setCustomColor(e.target.value)}
//                 onBlur={() => handleColorSelect(customColor)}
//                 onKeyPress={(e) => {
//                   if (e.key === "Enter") {
//                     handleColorSelect(customColor);
//                   }
//                 }}
//                 className={styles.hexInput}
//                 placeholder="#000000"
//               />
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };