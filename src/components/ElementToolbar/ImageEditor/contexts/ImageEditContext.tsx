import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface ImageEditState {
  isPreviewing: boolean;
  activeFilter: string | null;
  // 其他需要共享的状态
}

interface ImageEditContextType extends ImageEditState {
  setIsPreviewing: (preview: boolean) => void;
  setActiveFilter: (filter: string | null) => void;
  // 其他状态更新方法
}

const ImageEditContext = createContext<ImageEditContextType | undefined>(
  undefined
);

interface ImageEditProviderProps {
  children: ReactNode;
}

export const ImageEditProvider: React.FC<ImageEditProviderProps> = ({
  children,
}) => {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const contextValue: ImageEditContextType = {
    isPreviewing,
    activeFilter,
    setIsPreviewing,
    setActiveFilter,
  };

  return (
    <ImageEditContext.Provider value={contextValue}>
      {children}
    </ImageEditContext.Provider>
  );
};

// 自定义hook用于访问上下文
export const useImageEdit = () => {
  const context = useContext(ImageEditContext);
  if (context === undefined) {
    throw new Error("useImageEdit must be used within an ImageEditProvider");
  }
  return context;
};
