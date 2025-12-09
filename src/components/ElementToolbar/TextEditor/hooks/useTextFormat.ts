import { useCallback } from "react";
import type { TextElement } from "../../../../canvas/schema/model";
import { 
  getCurrentTextStyle, 
  updateTextStyle, 
  toggleBold, 
  toggleItalic, 
  toggleUnderline,
  toggleStrikethrough
} from "../utils/textFormatUtils";

interface UseTextFormatProps {
  element: TextElement;
  onUpdateElement: (id: string, updates: Partial<TextElement>) => void;
  spanIndex?: number;
}

export const useTextFormat = ({ element, onUpdateElement, spanIndex }: UseTextFormatProps) => {
  // 获取当前文本样式
  const currentStyle = getCurrentTextStyle(element, spanIndex);
  
  // 更新字体族
  const handleFontFamilyChange = useCallback((fontFamily: string) => {
    const updates = updateTextStyle(element, { fontFamily }, spanIndex);
    onUpdateElement(element.id, updates);
  }, [element, onUpdateElement, spanIndex]);
  
  // 更新字体大小
  const handleFontSizeChange = useCallback((fontSize: number) => {
    const updates = updateTextStyle(element, { fontSize }, spanIndex);
    onUpdateElement(element.id, updates);
  }, [element, onUpdateElement, spanIndex]);
  
  // 切换粗体
  const handleToggleBold = useCallback(() => {
    const updates = toggleBold(element, spanIndex);
    onUpdateElement(element.id, updates);
  }, [element, onUpdateElement, spanIndex]);
  
  // 切换斜体
  const handleToggleItalic = useCallback(() => {
    const updates = toggleItalic(element, spanIndex);
    onUpdateElement(element.id, updates);
  }, [element, onUpdateElement, spanIndex]);
  
  // 切换下划线
  const handleToggleUnderline = useCallback(() => {
    const updates = toggleUnderline(element, spanIndex);
    onUpdateElement(element.id, updates);
  }, [element, onUpdateElement, spanIndex]);
  
  // 切换删除线
  const handleToggleStrikethrough = useCallback(() => {
    const updates = toggleStrikethrough(element, spanIndex);
    onUpdateElement(element.id, updates);
  }, [element, onUpdateElement, spanIndex]);
  
  // 更新文本颜色
  const handleColorChange = useCallback((color: string) => {
    const updates = updateTextStyle(element, { color }, spanIndex);
    onUpdateElement(element.id, updates);
  }, [element, onUpdateElement, spanIndex]);
  
  // 更新文本背景色
  const handleBackgroundColorChange = useCallback((background: string) => {
    const updates = updateTextStyle(element, { background }, spanIndex);
    onUpdateElement(element.id, updates);
  }, [element, onUpdateElement, spanIndex]);
  
  return {
    currentStyle,
    handleFontFamilyChange,
    handleFontSizeChange,
    handleToggleBold,
    handleToggleItalic,
    handleToggleUnderline,
    handleToggleStrikethrough,
    handleColorChange,
    handleBackgroundColorChange,
  };
};