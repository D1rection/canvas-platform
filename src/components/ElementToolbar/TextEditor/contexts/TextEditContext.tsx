import React, { createContext, useContext } from "react";
import type { ReactNode } from "react";

// 文本编辑上下文类型
interface TextEditContextType {
  // 可以在这里添加共享的文本编辑状态和方法
  isEditing?: boolean;
}

// 创建上下文
const TextEditContext = createContext<TextEditContextType | undefined>(undefined);

// 上下文提供者组件
interface TextEditProviderProps {
  children: ReactNode;
  value?: TextEditContextType;
}

export const TextEditProvider: React.FC<TextEditProviderProps> = ({ 
  children, 
  value = {}
}) => {
  return (
    <TextEditContext.Provider value={value}>
      {children}
    </TextEditContext.Provider>
  );
};

// 自定义Hook用于访问上下文
export const useTextEdit = () => {
  const context = useContext(TextEditContext);
  if (context === undefined) {
    throw new Error("useTextEdit must be used within a TextEditProvider");
  }
  return context;
};