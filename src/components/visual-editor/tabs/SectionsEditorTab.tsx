import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useVisualEditor } from '../VisualEditorProvider';
import { HomeSection } from '@/types';
import { Plus, GripVertical, Eye, EyeOff } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableRow({ section, onToggle, onTitle }: { section: HomeSection; onToggle: () => void; onTitle: (v: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2.5 rounded border transition-colors ${section.isVisible ? 'border-border bg-background' : 'border-border/50 bg-muted/30'}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60" />
      </button>
      <input
        type="text"
        value={section.title}
        onChange={(e) => onTitle(e.target.value)}
        className={`flex-1 text-xs bg-transparent focus:outline-none min-w-0 ${section.isVisible ? 'text-foreground' : 'text-muted-foreground line-through'}`}
      />
      <button
        onClick={onToggle}
        className={`flex-shrink-0 p-1 rounded transition-colors ${section.isVisible ? 'text-primary hover:text-primary/70' : 'text-muted-foreground hover:text-foreground'}`}
        title={section.isVisible ? 'Masquer' : 'Afficher'}
      >
        {section.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function SectionsEditorTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const { setIsDirty } = useVisualEditor();
  const [newTitle, setNewTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const sections: HomeSection[] = designSettings.homeSections || [];

  const update = (next: HomeSection[]) => {
    updateDesignSettings({ homeSections: next });
    setIsDirty(true);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    update(arrayMove(sections, oldIndex, newIndex));
  };

  function toggleSection(id: string) {
    update(sections.map((s) => (s.id === id ? { ...s, isVisible: !s.isVisible } : s)));
  }

  function updateTitle(id: string, title: string) {
    update(sections.map((s) => (s.id === id ? { ...s, title } : s)));
  }

  function addSection() {
    if (!newTitle.trim()) return;
    update([...sections, { id: `section-${Date.now()}`, title: newTitle.trim(), isVisible: true }]);
    setNewTitle('');
    setShowAdd(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground px-1">Glissez pour réordonner. Activez/désactivez chaque section.</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {sections.map((section) => (
              <SortableRow
                key={section.id}
                section={section}
                onToggle={() => toggleSection(section.id)}
                onTitle={(v) => updateTitle(section.id, v)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {showAdd ? (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSection()}
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
