import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VisualEditorContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
}

const VisualEditorContext = createContext<VisualEditorContextType | undefined>(undefined);

export function VisualEditorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const [isDirty, setIsDirty] = useState(false);

  return (
    <VisualEditorContext.Provider value={{ isOpen, setIsOpen, activeTab, setActiveTab, isDirty, setIsDirty }}>
      {children}
    </VisualEditorContext.Provider>
  );
}

export function useVisualEditor() {
  const ctx = useContext(VisualEditorContext);
  if (!ctx) throw new Error('useVisualEditor must be used within VisualEditorProvider');
  return ctx;
}
