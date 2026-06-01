import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { EditorPageKey } from './PageSwitcher';

interface VisualEditorContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  // Inline editing
  editingKey: string | null;
  setEditingKey: (key: string | null) => void;
  // Multi-pages
  currentPageKey: EditorPageKey;
  setCurrentPageKey: (key: EditorPageKey) => void;
}

const VisualEditorContext = createContext<VisualEditorContextType | undefined>(undefined);

export function VisualEditorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const [isDirty, setIsDirty] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [currentPageKey, setCurrentPageKey] = useState<EditorPageKey>('home');

  return (
    <VisualEditorContext.Provider value={{
      isOpen, setIsOpen,
      activeTab, setActiveTab,
      isDirty, setIsDirty,
      editingKey, setEditingKey,
      currentPageKey, setCurrentPageKey,
    }}>
      {children}
    </VisualEditorContext.Provider>
  );
}

export function useVisualEditor() {
  const ctx = useContext(VisualEditorContext);
  if (!ctx) throw new Error('useVisualEditor must be used within VisualEditorProvider');
  return ctx;
}
