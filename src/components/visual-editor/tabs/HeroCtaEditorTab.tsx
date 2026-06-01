import { useApp } from '@/context/AppContext';
import { useVisualEditor } from '../VisualEditorProvider';
import type { HeroSlide } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const VARIANTS = ['glossy', 'glass', 'neon', 'outline', 'minimal'] as const;

export function HeroCtaEditorTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const { setIsDirty } = useVisualEditor();
  const slides: HeroSlide[] = designSettings.heroSlides || [];

  const update = (index: number, patch: Partial<HeroSlide> & Record<string, any>) => {
    const next = slides.map((s, i) => (i === index ? { ...s, ...patch } : s));
    updateDesignSettings({ heroSlides: next });
    setIsDirty(true);
  };

  if (slides.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Aucune slide. Ajoutez-en depuis l'onglet Hero.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground px-1">Configurez le bouton (CTA) de chaque slide Hero.</p>
      {slides.map((slide, i) => {
        const ctaVariant = (slide as any).ctaVariant || 'glossy';
        const ctaVisible = (slide as any).ctaVisible !== false;
        return (
          <div key={slide.id} className="border border-border rounded p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold truncate">{slide.title || `Slide ${i + 1}`}</span>
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px]">Visible</Label>
                <Switch checked={ctaVisible} onCheckedChange={(v) => update(i, { ctaVisible: v })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider">Libellé</Label>
              <Input value={slide.ctaText || ''} onChange={(e) => update(i, { ctaText: e.target.value })} className="h-8 text-xs" placeholder="DÉCOUVRIR" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider">URL / route</Label>
              <Input value={slide.ctaUrl || ''} onChange={(e) => update(i, { ctaUrl: e.target.value })} className="h-8 text-xs" placeholder="/boutique" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider">Style</Label>
              <Select value={ctaVariant} onValueChange={(v) => update(i, { ctaVariant: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VARIANTS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
