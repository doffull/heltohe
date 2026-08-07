import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Plus, Trash2, Save, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BANNER_ICONS, resolveTopBanner, type TopBannerConfig, type TopBannerItem } from '@/lib/bannerIcons';
import { TopBanner } from '@/components/layout/TopBanner';

function SortableItem({
  item,
  onChange,
  onRemove,
}: {
  item: TopBannerItem;
  onChange: (next: TopBannerItem) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const IconPreview = BANNER_ICONS[item.icon || '']?.Icon;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex flex-col md:flex-row md:items-end gap-2 p-3 rounded border border-border bg-background"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none self-start p-1">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <div className="flex-1 space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Texte</Label>
        <Input value={item.text} onChange={(e) => onChange({ ...item, text: e.target.value })} className="h-9" />
      </div>
      <div className="w-full md:w-52 space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Icône</Label>
        <Select value={item.icon || 'none'} onValueChange={(v) => onChange({ ...item, icon: v })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune icône</SelectItem>
            {Object.entries(BANNER_ICONS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full md:w-40 space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Lien (optionnel)</Label>
        <Input
          value={item.link || ''}
          placeholder="/boutique"
          onChange={(e) => onChange({ ...item, link: e.target.value })}
          className="h-9"
        />
      </div>
      <div className="flex items-center gap-2 md:pb-0">
        {IconPreview && <IconPreview className="w-4 h-4 text-muted-foreground" />}
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminTopBanner() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const [cfg, setCfg] = useState<TopBannerConfig>(() => resolveTopBanner((designSettings as any).topBanner));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const patch = (next: Partial<TopBannerConfig>) => {
    const merged = { ...cfg, ...next };
    setCfg(merged);
    updateDesignSettings({ topBanner: merged } as any);
  };

  const save = async () => {
    try {
      await flushDesignSettings({ topBanner: cfg } as any);
      toast.success('Bannière enregistrée');
    } catch {
      toast.error("Échec de l'enregistrement");
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oi = cfg.items.findIndex((i) => i.id === active.id);
    const ni = cfg.items.findIndex((i) => i.id === over.id);
    patch({ items: arrayMove(cfg.items, oi, ni) });
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Bannière haute</h1>
          <p className="text-xs text-muted-foreground">Le bandeau affiché au-dessus du header.</p>
        </div>
        <Button onClick={save} className="gap-2">
          <Save className="w-4 h-4" /> Enregistrer
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider">Aperçu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="border border-border rounded overflow-hidden">
            <TopBanner raw={null} config={cfg} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={cfg.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
            <Label className="text-xs">Bannière activée</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wider">Messages</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() =>
              patch({
                items: [
                  ...cfg.items,
                  { id: `b${Date.now()}`, icon: 'truck', text: 'Nouveau message', link: '' },
                ],
              })
            }
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={cfg.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {cfg.items.map((item, idx) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onChange={(next) => patch({ items: cfg.items.map((i, k) => (k === idx ? next : i)) })}
                  onRemove={() => patch({ items: cfg.items.filter((_, k) => k !== idx) })}
                />
              ))}
            </SortableContext>
          </DndContext>
          {cfg.items.length === 0 && <p className="text-xs text-muted-foreground">Aucun message.</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Mobile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Taille du texte : {cfg.mobileFontSize}px</Label>
              <Slider
                value={[cfg.mobileFontSize]}
                min={8}
                max={16}
                step={1}
                onValueChange={([v]) => patch({ mobileFontSize: v })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Espacement des lettres : {cfg.mobileTracking}em</Label>
              <Slider
                value={[cfg.mobileTracking * 100]}
                min={0}
                max={30}
                step={1}
                onValueChange={([v]) => patch({ mobileTracking: v / 100 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hauteur : {cfg.mobileHeight}px</Label>
              <Slider
                value={[cfg.mobileHeight]}
                min={24}
                max={60}
                step={1}
                onValueChange={([v]) => patch({ mobileHeight: v })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sur mobile, les messages défilent un par un sur une seule ligne (plus de retour à la ligne).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Ordinateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Taille du texte : {cfg.desktopFontSize}px</Label>
              <Slider
                value={[cfg.desktopFontSize]}
                min={9}
                max={20}
                step={1}
                onValueChange={([v]) => patch({ desktopFontSize: v })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Espacement des lettres : {cfg.desktopTracking}em</Label>
              <Slider
                value={[cfg.desktopTracking * 100]}
                min={0}
                max={40}
                step={1}
                onValueChange={([v]) => patch({ desktopTracking: v / 100 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hauteur : {cfg.desktopHeight}px</Label>
              <Slider
                value={[cfg.desktopHeight]}
                min={24}
                max={72}
                step={1}
                onValueChange={([v]) => patch({ desktopHeight: v })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={cfg.desktopShowAll} onCheckedChange={(v) => patch({ desktopShowAll: v })} />
              <Label className="text-xs">Afficher tous les messages côte à côte</Label>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider">Style</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Fond</Label>
            <Input type="color" value={cfg.bgColor} onChange={(e) => patch({ bgColor: e.target.value })} className="h-9 p-1" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Texte</Label>
            <Input
              type="color"
              value={cfg.textColor}
              onChange={(e) => patch({ textColor: e.target.value })}
              className="h-9 p-1"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rotation : {cfg.rotateMs} ms</Label>
            <Slider
              value={[cfg.rotateMs]}
              min={2000}
              max={12000}
              step={500}
              onValueChange={([v]) => patch({ rotateMs: v })}
            />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={cfg.uppercase} onCheckedChange={(v) => patch({ uppercase: v })} />
            <Label className="text-xs">Majuscules</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
