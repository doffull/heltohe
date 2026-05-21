import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  GripVertical, Plus, Trash2, Image, Video, Type, AlignLeft,
  Heading1, Heading2, LayoutGrid, ChevronUp, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileDropZone } from '@/components/admin/FileDropZone';
import type { PageSection } from '@/hooks/usePages';

const SECTION_TYPES = [
  { value: 'hero', label: 'Header / Hero', icon: LayoutGrid },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'video', label: 'Vidéo', icon: Video },
  { value: 'slider', label: 'Slider Images', icon: Image },
  { value: 'title', label: 'Titre', icon: Heading1 },
  { value: 'subtitle', label: 'Sous-titre', icon: Heading2 },
  { value: 'text', label: 'Texte libre', icon: AlignLeft },
  { value: 'products', label: 'Grille produits', icon: LayoutGrid },
] as const;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function SectionEditor({
  section,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  section: PageSection;
  onChange: (s: PageSection) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const typeMeta = SECTION_TYPES.find(t => t.value === section.type);
  const Icon = typeMeta?.icon || Type;

  const updateContent = (key: string, value: any) => {
    onChange({ ...section, content: { ...section.content, [key]: value } });
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium uppercase tracking-wider flex-1">
            {typeMeta?.label || section.type}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={isFirst}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={isLast}>
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Hero */}
        {section.type === 'hero' && (
          <div className="space-y-3">
            <Input placeholder="Titre du Hero" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} />
            <Input placeholder="Sous-titre" value={section.content.subtitle || ''} onChange={e => updateContent('subtitle', e.target.value)} />
            <Input placeholder="URL image de fond" value={section.content.backgroundImage || ''} onChange={e => updateContent('backgroundImage', e.target.value)} />
            <Input placeholder="Texte du bouton CTA" value={section.content.ctaText || ''} onChange={e => updateContent('ctaText', e.target.value)} />
            <Input placeholder="Lien du bouton CTA" value={section.content.ctaUrl || ''} onChange={e => updateContent('ctaUrl', e.target.value)} />
          </div>
        )}

        {/* Image */}
        {section.type === 'image' && (
          <div className="space-y-3">
            <Input placeholder="URL de l'image" value={section.content.url || ''} onChange={e => updateContent('url', e.target.value)} />
            <Input placeholder="Texte alternatif (alt)" value={section.content.alt || ''} onChange={e => updateContent('alt', e.target.value)} />
            <Select value={section.content.size || 'full'} onValueChange={v => updateContent('size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Petit</SelectItem>
                <SelectItem value="medium">Moyen</SelectItem>
                <SelectItem value="full">Pleine largeur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Video */}
        {section.type === 'video' && (
          <div className="space-y-3">
            <Input placeholder="URL vidéo (mp4 ou YouTube)" value={section.content.url || ''} onChange={e => updateContent('url', e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={section.content.autoplay ?? true} onChange={e => updateContent('autoplay', e.target.checked)} />
              Lecture automatique
            </label>
          </div>
        )}

        {/* Slider */}
        {section.type === 'slider' && (
          <div className="space-y-3">
            <Textarea
              placeholder="URLs des images (une par ligne)"
              value={(section.content.images || []).join('\n')}
              onChange={e => updateContent('images', e.target.value.split('\n').filter(Boolean))}
              rows={4}
            />
          </div>
        )}

        {/* Title */}
        {section.type === 'title' && (
          <Input placeholder="Titre" value={section.content.text || ''} onChange={e => updateContent('text', e.target.value)} className="text-lg font-bold" />
        )}

        {/* Subtitle */}
        {section.type === 'subtitle' && (
          <Input placeholder="Sous-titre" value={section.content.text || ''} onChange={e => updateContent('text', e.target.value)} />
        )}

        {/* Text */}
        {section.type === 'text' && (
          <Textarea placeholder="Contenu texte..." value={section.content.text || ''} onChange={e => updateContent('text', e.target.value)} rows={4} />
        )}

        {/* Products grid */}
        {section.type === 'products' && (
          <div className="space-y-3">
            <Input placeholder="Catégorie à afficher (laisser vide = toutes)" value={section.content.category || ''} onChange={e => updateContent('category', e.target.value)} />
            <Select value={String(section.content.columns || 3)} onValueChange={v => updateContent('columns', parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Colonnes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 colonnes</SelectItem>
                <SelectItem value="3">3 colonnes</SelectItem>
                <SelectItem value="4">4 colonnes</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Nombre max de produits" value={section.content.limit || ''} onChange={e => updateContent('limit', parseInt(e.target.value) || undefined)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PageBuilderProps {
  sections: PageSection[];
  onChange: (sections: PageSection[]) => void;
}

export default function PageBuilder({ sections, onChange }: PageBuilderProps) {
  const [addType, setAddType] = useState<string>('');

  const addSection = (type: string) => {
    const newSection: PageSection = {
      id: generateId(),
      type: type as any,
      content: {},
      order: sections.length,
    };
    onChange([...sections, newSection]);
    setAddType('');
  };

  const updateSection = (index: number, section: PageSection) => {
    const updated = [...sections];
    updated[index] = section;
    onChange(updated);
  };

  const removeSection = (index: number) => {
    onChange(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">Sections de la page</h3>
        <span className="text-xs text-muted-foreground">{sections.length} section{sections.length !== 1 ? 's' : ''}</span>
      </div>

      {sections.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune section. Ajoutez-en une ci-dessous.</p>
        </div>
      )}

      <div className="space-y-3">
        {sections.map((section, index) => (
          <SectionEditor
            key={section.id}
            section={section}
            onChange={s => updateSection(index, s)}
            onRemove={() => removeSection(index)}
            onMoveUp={() => moveSection(index, 'up')}
            onMoveDown={() => moveSection(index, 'down')}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
          />
        ))}
      </div>

      {/* Add section */}
      <div className="flex gap-2 flex-wrap">
        {SECTION_TYPES.map(t => (
          <Button
            key={t.value}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => addSection(t.value)}
          >
            <t.icon className="h-3 w-3" />
            {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
