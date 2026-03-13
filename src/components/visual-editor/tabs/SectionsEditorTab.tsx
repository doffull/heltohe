import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useVisualEditor } from '../VisualEditorProvider';
import { HomeSection } from '@/types';
import { Plus, GripVertical, Eye, EyeOff } from 'lucide-react';

export function SectionsEditorTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const { setIsDirty } = useVisualEditor();
  const [newTitle, setNewTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const sections: HomeSection[] = designSettings.homeSections || [];

  function toggleSection(id: string) {
    const next = sections.map(s => s.id === id ? { ...s, isVisible: !s.isVisible } : s);
    updateDesignSettings({ homeSections: next });
    setIsDirty(true);
  }

  function addSection() {
    if (!newTitle.trim()) return;
    const next: HomeSection[] = [
      ...sections,
      { id: `section-${Date.now()}`, title: newTitle.trim(), isVisible: true }
    ];
    updateDesignSettings({ homeSections: next });
    setIsDirty(true);
    setNewTitle('');
    setShowAdd(false);
  }

  function updateTitle(id: string, title: string) {
    const next = sections.map(s => s.id === id ? { ...s, title } : s);
    updateDesignSettings({ homeSections: next });
    setIsDirty(true);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground px-1">Activez, désactivez ou ajoutez des sections à la page d'accueil.</p>

      <div className="space-y-1.5">
        {sections.map((section) => (
          <div key={section.id} className={`flex items-center gap-2 px-3 py-2.5 rounded border transition-colors ${section.isVisible ? 'border-border bg-background' : 'border-border/50 bg-muted/30'}`}>
            <GripVertical className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
            <input
              type="text"
              value={section.title}
              onChange={e => updateTitle(section.id, e.target.value)}
              className={`flex-1 text-xs bg-transparent focus:outline-none min-w-0 ${section.isVisible ? 'text-foreground' : 'text-muted-foreground line-through'}`}
            />
            <button
              onClick={() => toggleSection(section.id)}
              className={`flex-shrink-0 p-1 rounded transition-colors ${section.isVisible ? 'text-primary hover:text-primary/70' : 'text-muted-foreground hover:text-foreground'}`}
              title={section.isVisible ? 'Masquer' : 'Afficher'}
            >
              {section.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}
      </div>

      {/* Add section */}
      {showAdd ? (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSection()}
            autoFocus
            placeholder="Nom de la section..."
            className="flex-1 text-xs px-2.5 py-1.5 rounded bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={addSection} className="px-2.5 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors font-medium">OK</button>
          <button onClick={() => setShowAdd(false)} className="px-2.5 py-1.5 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter une section
        </button>
      )}
    </div>
  );
}
