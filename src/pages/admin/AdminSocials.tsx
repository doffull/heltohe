import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaLibraryDialog } from '@/components/visual-editor/MediaLibraryDialog';
import SocialLinksRow from '@/components/layout/SocialLinksRow';
import { resolveBrand } from '@/components/icons/BrandIcons';
import {
  Share2, Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2, Image as ImageIcon, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SocialDisplaySettings, SocialLink } from '@/types';

const PLATFORM_PRESETS: { label: string; url: string }[] = [
  { label: 'INSTAGRAM', url: 'https://instagram.com/' },
  { label: 'TIKTOK', url: 'https://tiktok.com/@' },
  { label: 'FACEBOOK', url: 'https://facebook.com/' },
  { label: 'X', url: 'https://x.com/' },
  { label: 'YOUTUBE', url: 'https://youtube.com/@' },
  { label: 'PINTEREST', url: 'https://pinterest.com/' },
  { label: 'LINKEDIN', url: 'https://linkedin.com/company/' },
  { label: 'WHATSAPP', url: 'https://wa.me/33' },
  { label: 'SNAPCHAT', url: 'https://snapchat.com/add/' },
  { label: 'THREADS', url: 'https://threads.net/@' },
];

export default function AdminSocials() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const s = (designSettings as any) || {};
  const links: SocialLink[] = s.socialLinks || [];
  const display: SocialDisplaySettings = s.socialDisplay ?? {};
  const [saving, setSaving] = useState(false);
  const [pickIcon, setPickIcon] = useState<number | null>(null);

  const setLinks = (next: SocialLink[]) => updateDesignSettings({ socialLinks: next } as any);
  const setDisplay = (patch: Partial<SocialDisplaySettings>) =>
    updateDesignSettings({ socialDisplay: { ...display, ...patch } } as any);

  const patchLink = (i: number, patch: Partial<SocialLink>) => {
    const next = [...links];
    next[i] = { ...next[i], ...patch };
    setLinks(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j], next[i]];
    setLinks(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await flushDesignSettings();
      toast.success('Réseaux sociaux enregistrés');
    } catch {
      toast.error("L'enregistrement a échoué");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold uppercase tracking-wider">
            <Share2 className="h-5 w-5" /> Réseaux sociaux
          </h1>
          <p className="text-sm text-muted-foreground">
            Source unique pour tout le site : pied de page, en-tête, menu mobile, page contact,
            maintenance et balisage SEO.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes liens</CardTitle>
          <CardDescription>
            L'icône est détectée automatiquement d'après le nom ou l'URL. Vous pouvez aussi choisir
            une image personnalisée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PLATFORM_PRESETS.filter(
              (p) => !links.some((l) => (l.label || '').toUpperCase() === p.label)
            ).map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className="gap-1 text-[11px]"
                onClick={() => setLinks([...links, { label: p.label, url: p.url, enabled: true }])}
              >
                <Plus className="h-3 w-3" /> {p.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {links.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun réseau configuré.</p>
            )}
            {links.map((l, i) => {
              const brand = resolveBrand(l.label, l.url);
              const Icon = brand?.Icon;
              return (
                <div key={i} className="flex flex-wrap items-center gap-2 border border-border p-2">
                  {l.iconUrl ? (
                    <img src={l.iconUrl} alt="" className="h-9 w-9 shrink-0 border border-border object-contain p-1" />
                  ) : Icon ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border">
                      <Icon className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 shrink-0 border border-dashed border-border" />
                  )}

                  <Input
                    className="min-w-[120px] flex-1"
                    placeholder="INSTAGRAM"
                    value={l.label}
                    onChange={(e) => patchLink(i, { label: e.target.value })}
                  />
                  <Input
                    className="min-w-[200px] flex-[2]"
                    placeholder="https://instagram.com/mon-compte"
                    value={l.url}
                    onChange={(e) => patchLink(i, { url: e.target.value })}
                  />
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={l.enabled !== false}
                      onCheckedChange={(v) => patchLink(i, { enabled: v })}
                    />
                    Visible
                  </label>
                  <Button variant="ghost" size="icon" onClick={() => setPickIcon(i)} title="Image personnalisée">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  {l.iconUrl && (
                    <Button variant="ghost" size="sm" onClick={() => patchLink(i, { iconUrl: '' })}>
                      Icône auto
                    </Button>
                  )}
                  {l.url && (
                    <Button variant="ghost" size="icon" asChild title="Ouvrir">
                      <a href={l.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === links.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setLinks(links.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setLinks([...links, { label: '', url: '', enabled: true }])}
          >
            <Plus className="h-4 w-4" /> Ajouter un lien libre
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emplacements et style</CardTitle>
          <CardDescription>Choisissez où les liens apparaissent sur le site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={display.showInHeader === true}
                onCheckedChange={(v) => setDisplay({ showInHeader: v })}
              />
              En-tête (desktop)
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={display.showInMobileMenu !== false}
                onCheckedChange={(v) => setDisplay({ showInMobileMenu: v })}
              />
              Menu mobile
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={display.showOnContact !== false}
                onCheckedChange={(v) => setDisplay({ showOnContact: v })}
              />
              Page Contact
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={display.showOnMaintenance !== false}
                onCheckedChange={(v) => setDisplay({ showOnMaintenance: v })}
              />
              Page maintenance
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={display.newTab !== false}
                onCheckedChange={(v) => setDisplay({ newTab: v })}
              />
              Ouvrir dans un nouvel onglet
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Taille des icônes</Label>
                <span className="text-xs text-muted-foreground">{display.iconSize ?? 18} px</span>
              </div>
              <Slider
                min={12}
                max={48}
                step={1}
                value={[display.iconSize ?? 18]}
                onValueChange={([v]) => setDisplay({ iconSize: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Forme des pastilles</Label>
              <Select
                value={display.shape || 'square'}
                onValueChange={(v) => setDisplay({ shape: v as SocialDisplaySettings['shape'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Angle biseauté</SelectItem>
                  <SelectItem value="rounded">Coins arrondis</SelectItem>
                  <SelectItem value="circle">Cercle</SelectItem>
                  <SelectItem value="none">Sans cadre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Aperçu</Label>
            <div className="border border-border bg-card/40 p-4">
              <SocialLinksRow placement="always" mode="both" />
            </div>
          </div>
        </CardContent>
      </Card>

      <MediaLibraryDialog
        open={pickIcon !== null}
        onOpenChange={(o) => !o && setPickIcon(null)}
        onSelect={(url) => {
          if (pickIcon !== null) patchLink(pickIcon, { iconUrl: url });
          setPickIcon(null);
        }}
      />
    </div>
  );
}
