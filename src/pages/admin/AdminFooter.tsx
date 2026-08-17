import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { MediaLibraryDialog } from '@/components/visual-editor/MediaLibraryDialog';
import { Footer } from '@/components/layout/Footer';
import { FooterRowsEditor } from '@/components/admin/FooterRowsEditor';

import { PAYMENT_BADGE_OPTIONS, DEFAULT_PAYMENT_BADGES } from '@/components/layout/FooterPaymentBadges';
import {
  Save, Loader2, PanelBottom, Plus, Trash2, ArrowUp, ArrowDown,
  Image as ImageIcon, Share2, Columns3, ToggleLeft, Mail, Palette, LayoutTemplate, Check, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { FOOTER_PRESETS } from '@/config/footerPresets';
import type { FooterColumn, FooterConfig, FooterDesign, FooterLayout, FooterPaymentBadgeItem } from '@/types';

const LAYOUT_OPTIONS: { value: FooterLayout; label: string }[] = [
  { value: 'industrial', label: 'Industrial (4 colonnes)' },
  { value: 'minimal', label: 'Minimal Ligne' },
  { value: 'editorial', label: 'Éditorial' },
  { value: 'newsletter-first', label: 'Newsletter First' },
  { value: 'showcase', label: 'Vitrine' },
  { value: 'compact', label: 'Compact Mobile' },
  { value: 'custom', label: 'Personnalisé (ordre libre)' },
];

const SECTION_LABELS: Record<string, string> = {
  brand: 'Marque / Logo',
  columns: 'Colonnes de liens',
  socials: 'Réseaux sociaux',
  newsletter: 'Newsletter',
  legal: 'Liens légaux',
  bottom: 'Barre du bas (copyright, langue, devise)',
  payments: 'Paiement sécurisé',
  reviews: 'Avis clients',
  trustpilot: 'Widget Trustpilot',
};
const DEFAULT_SECTION_ORDER = ['brand', 'columns', 'socials', 'newsletter', 'payments', 'reviews', 'legal', 'trustpilot', 'bottom'] as const;

const SECTION_VISIBILITY_FLAG: Record<string, string> = {
  brand: 'showBrand',
  columns: 'showColumns',
  socials: 'showSocials',
  newsletter: 'showNewsletter',
  payments: 'showPayments',
  reviews: 'showReviews',
  legal: 'showLegalLinks',
  trustpilot: 'showTrustpilot',
  bottom: 'showBottomBar',
};


const LEGAL_OPTIONS = [
  { key: 'mentions', label: 'Mentions légales' },
  { key: 'cgv', label: 'CGV' },
  { key: 'confidentialite', label: 'Politique de confidentialité' },
  { key: 'cookies', label: 'Cookies' },
  { key: 'retours', label: 'Retours & Échanges' },
];

export default function AdminFooter() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const s = (designSettings as any) || {};
  const cfg: FooterConfig = (s.footerConfig ?? {}) as FooterConfig;
  const design: FooterDesign = cfg.design ?? {};
  const [saving, setSaving] = useState(false);
  const [pickLogo, setPickLogo] = useState(false);
  const [pickBg, setPickBg] = useState(false);
  const [pickSocial, setPickSocial] = useState<number | null>(null);
  const [pickPayment, setPickPayment] = useState<number | 'new' | null>(null);
  const [pickInstallIcon, setPickInstallIcon] = useState(false);


  const on = (v: boolean | undefined) => v !== false;
  const setCfg = (patch: Partial<FooterConfig>) =>
    updateDesignSettings({ footerConfig: { ...cfg, ...patch } } as any);
  const setDesign = (patch: Partial<FooterDesign>) =>
    setCfg({ design: { ...design, ...patch } });
  const set = (patch: Record<string, unknown>) => updateDesignSettings(patch as any);

  const applyPreset = (key: string) => {
    const preset = FOOTER_PRESETS.find(p => p.key === key);
    if (!preset) return;
    setCfg({
      preset: preset.key,
      layout: preset.layout,
      design: { ...design, ...preset.design },
      ...(preset.toggles || {}),
    });
    toast.success(`Preset « ${preset.name} » appliqué`);
  };

  const ColorField = ({ label, value, onChange, fallback }: { label: string; value?: string; onChange: (v: string) => void; fallback?: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || fallback || '#000000'}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 border border-border bg-background p-1 cursor-pointer"
          aria-label={label}
        />
        <Input value={value ?? ''} placeholder={fallback || 'auto'} onChange={e => onChange(e.target.value)} />
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange('')}>Auto</Button>
        )}
      </div>
    </div>
  );


  const socials: { label: string; url: string }[] = s.socialLinks || [];
  const setSocials = (next: { label: string; url: string }[]) => set({ socialLinks: next });

  const columns: FooterColumn[] = cfg.columns || [];
  const setColumns = (next: FooterColumn[]) => setCfg({ columns: next });

  /** Liste unifiée des logos de paiement (migre l'ancienne config au premier changement). */
  const paymentItems: FooterPaymentBadgeItem[] = cfg.paymentBadgeItems?.length
    ? cfg.paymentBadgeItems
    : [
        ...(cfg.paymentBadges ?? DEFAULT_PAYMENT_BADGES).map(k => ({
          key: k,
          label: PAYMENT_BADGE_OPTIONS.find(o => o.key === k)?.label,
          visible: true,
        })),
        ...(cfg.customPaymentBadges || []).map(b => ({ key: 'custom', label: b.label, iconUrl: b.url, visible: true })),
      ];
  const setPaymentItems = (next: FooterPaymentBadgeItem[]) => setCfg({ paymentBadgeItems: next });


  const save = async () => {
    try {
      setSaving(true);
      await flushDesignSettings();
      toast.success('Footer enregistré');
    } catch (e: any) {
      toast.error('Erreur', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <PanelBottom className="h-5 w-5" /> Footer
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gérez le pied de page : marque, contact, réseaux sociaux, colonnes de liens et modules.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="mb-4 admin-tabs-scroll w-full h-auto">
          <TabsTrigger value="presets" className="gap-2"><LayoutTemplate className="h-4 w-4" />Presets & disposition</TabsTrigger>
          <TabsTrigger value="design" className="gap-2"><Palette className="h-4 w-4" />Design</TabsTrigger>
          <TabsTrigger value="marque" className="gap-2"><ImageIcon className="h-4 w-4" />Marque & contact</TabsTrigger>
          <TabsTrigger value="socials" className="gap-2"><Share2 className="h-4 w-4" />Réseaux sociaux</TabsTrigger>
          <TabsTrigger value="colonnes" className="gap-2"><Columns3 className="h-4 w-4" />Colonnes de liens</TabsTrigger>
          <TabsTrigger value="bas" className="gap-2"><Mail className="h-4 w-4" />Newsletter & bas de page</TabsTrigger>
          <TabsTrigger value="confiance" className="gap-2"><ShieldCheck className="h-4 w-4" />Paiement & avis</TabsTrigger>
          <TabsTrigger value="modules" className="gap-2"><ToggleLeft className="h-4 w-4" />Modules</TabsTrigger>
        </TabsList>

        {/* ------------- Presets & disposition ------------- */}
        <TabsContent value="presets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>6 presets prédéfinis</CardTitle>
              <CardDescription>
                Un clic applique une disposition et un habillage complets. Vos textes et liens sont conservés.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FOOTER_PRESETS.map(p => {
                const active = cfg.preset === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => applyPreset(p.key)}
                    className={`text-left border p-3 space-y-2 transition-colors min-h-[44px] ${active ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm">{p.name}</span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex h-6 overflow-hidden">
                      {p.swatch.map(c => (
                        <span key={c} className="flex-1" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{p.description}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disposition</CardTitle>
              <CardDescription>Change uniquement l'agencement, sans toucher aux couleurs.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mise en page</Label>
                <Select value={cfg.layout || 'industrial'} onValueChange={(v) => setCfg({ layout: v as FooterLayout })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre de colonnes de liens</Label>
                <Select
                  value={String(cfg.columnCount ?? 4)}
                  onValueChange={(v) => setCfg({ columnCount: Number(v) as 2 | 3 | 4 })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 colonnes</SelectItem>
                    <SelectItem value="3">3 colonnes</SelectItem>
                    <SelectItem value="4">4 colonnes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 sm:col-span-2">
                <Label>Constructeur de lignes (disposition « Personnalisé »)</Label>
                <FooterRowsEditor cfg={cfg} setCfg={setCfg} />
              </div>


              <div className="space-y-2">
                <Label>Largeur du contenu</Label>
                <Select value={design.contentWidth || 'container'} onValueChange={(v) => setDesign({ contentWidth: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="container">Contenu centré</SelectItem>
                    <SelectItem value="full">Pleine largeur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alignement</Label>
                <Select value={design.align || 'left'} onValueChange={(v) => setDesign({ align: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Gauche</SelectItem>
                    <SelectItem value="center">Centré</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Espacement vertical</Label>
                <Select value={design.padding || 'normal'} onValueChange={(v) => setDesign({ padding: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="spacious">Spacieux</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------- Design ------------- */}
        <TabsContent value="design" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Couleurs</CardTitle>
              <CardDescription>Laissez vide pour hériter du thème du site.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ColorField label="Fond" value={design.bgColor} fallback="#0d0d0d" onChange={v => setDesign({ bgColor: v })} />
              <ColorField label="Texte" value={design.textColor} fallback="#e6e6e6" onChange={v => setDesign({ textColor: v })} />
              <ColorField label="Titres de colonnes" value={design.headingColor} fallback="#ffffff" onChange={v => setDesign({ headingColor: v })} />
              <ColorField label="Liens" value={design.linkColor} fallback="#a3a3a3" onChange={v => setDesign({ linkColor: v })} />
              <ColorField label="Liens au survol" value={design.linkHoverColor} fallback="#ffffff" onChange={v => setDesign({ linkHoverColor: v })} />
              <ColorField label="Bordures & séparateurs" value={design.borderColor} fallback="#2a2a2a" onChange={v => setDesign({ borderColor: v })} />
              <ColorField label="Accent (bouton newsletter)" value={design.accentColor} fallback="#ffffff" onChange={v => setDesign({ accentColor: v })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Image de fond</CardTitle>
              <CardDescription>Ajoutez un visuel et un voile pour garder le texte lisible.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {design.bgImage ? (
                  <img src={design.bgImage} alt="Fond du footer" className="h-16 w-28 object-cover border border-border" />
                ) : (
                  <div className="h-16 w-28 border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                    Aucune
                  </div>
                )}
                <Button variant="outline" onClick={() => setPickBg(true)}>Choisir une image</Button>
                {design.bgImage && <Button variant="ghost" onClick={() => setDesign({ bgImage: '' })}>Retirer</Button>}
              </div>
              <div className="space-y-2">
                <Label>URL de l'image</Label>
                <Input placeholder="https://…" value={design.bgImage ?? ''} onChange={e => setDesign({ bgImage: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cadrage</Label>
                  <Select value={design.bgSize || 'cover'} onValueChange={v => setDesign({ bgSize: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Remplir (cover)</SelectItem>
                      <SelectItem value="contain">Contenir (contain)</SelectItem>
                      <SelectItem value="repeat">Motif répété</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={design.bgPosition || 'center'} onValueChange={v => setDesign({ bgPosition: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Haut</SelectItem>
                      <SelectItem value="center">Centre</SelectItem>
                      <SelectItem value="bottom">Bas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Voile</Label>
                  <Select value={design.overlay || 'none'} onValueChange={v => setDesign({ overlay: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="dark">Sombre</SelectItem>
                      <SelectItem value="light">Clair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Intensité du voile : {design.overlayOpacity ?? 55}%</Label>
                  <Slider
                    value={[design.overlayOpacity ?? 55]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setDesign({ overlayOpacity: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Opacité globale : {design.bgOpacity ?? 100}%</Label>
                  <Slider
                    value={[design.bgOpacity ?? 100]}
                    min={20}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setDesign({ bgOpacity: v })}
                  />
                </div>
                <label className="flex items-center gap-3 text-sm self-end">
                  <Switch checked={!!design.bgParallax} onCheckedChange={v => setDesign({ bgParallax: v })} />
                  Effet parallax
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dégradé</CardTitle>
              <CardDescription>Appliqué par-dessus la couleur de fond.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Activer le fond dégradé</span>
                <Switch checked={!!design.gradientEnabled} onCheckedChange={v => setDesign({ gradientEnabled: v })} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField label="Couleur 1" value={design.gradientFrom} fallback="#0d0d0d" onChange={v => setDesign({ gradientFrom: v })} />
                <ColorField label="Couleur 2" value={design.gradientTo} fallback="#333333" onChange={v => setDesign({ gradientTo: v })} />
                <div className="space-y-2 sm:col-span-2">
                  <Label>Angle : {design.gradientAngle ?? 135}°</Label>
                  <Slider
                    value={[design.gradientAngle ?? 135]}
                    min={0}
                    max={360}
                    step={5}
                    onValueChange={([v]) => setDesign({ gradientAngle: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Typographie & bordures</CardTitle>
              <CardDescription>Taille du texte, casse des titres et effets de bordure.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Taille du texte</Label>
                <Select value={design.textScale || 'md'} onValueChange={v => setDesign({ textScale: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Petite</SelectItem>
                    <SelectItem value="md">Moyenne</SelectItem>
                    <SelectItem value="lg">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bordure haute</Label>
                <Select value={design.borderTop || 'thin'} onValueChange={v => setDesign({ borderTop: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    <SelectItem value="thin">Fine</SelectItem>
                    <SelectItem value="thick">Épaisse</SelectItem>
                    <SelectItem value="chamfer">Biseau 45°</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={design.uppercaseTitles !== false} onCheckedChange={v => setDesign({ uppercaseTitles: v })} />
                Titres en MAJUSCULES
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={!!design.glass} onCheckedChange={v => setDesign({ glass: v })} />
                Effet verre dépoli
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={!!design.shadowTop} onCheckedChange={v => setDesign({ shadowTop: v })} />
                Ombre haute
              </label>
            </CardContent>
          </Card>
        </TabsContent>


        {/* ------------- Marque & contact ------------- */}
        <TabsContent value="marque" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo & identité</CardTitle>
              <CardDescription>Logo affiché dans le pied de page et textes de marque.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {s.footerLogo ? (
                  <img src={s.footerLogo} alt="Logo footer" className="h-12 w-auto border border-border p-1" />
                ) : (
                  <div className="h-12 w-24 border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                    Aucun
                  </div>
                )}
                <Button variant="outline" onClick={() => setPickLogo(true)}>Choisir une image</Button>
                {s.footerLogo && (
                  <Button variant="ghost" onClick={() => set({ footerLogo: '' })}>Retirer</Button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Taille du logo</Label>
                  <span className="text-xs text-muted-foreground">{cfg.logoHeight ?? 40} px</span>
                </div>
                <Slider
                  min={20}
                  max={160}
                  step={2}
                  value={[cfg.logoHeight ?? 40]}
                  onValueChange={([v]) => setCfg({ logoHeight: v })}
                />
                <p className="text-[11px] text-muted-foreground">Hauteur du logo dans le pied de page (défaut 40 px).</p>
              </div>



              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom du site</Label>
                  <Input value={s.siteName ?? ''} onChange={e => set({ siteName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Slogan</Label>
                  <Input value={s.siteTagline ?? ''} onChange={e => set({ siteTagline: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Texte de présentation</Label>
                  <Textarea
                    rows={3}
                    placeholder="Helvetica-MP. Design minimaliste et excellence fonctionnelle…"
                    value={cfg.brandText ?? ''}
                    onChange={e => setCfg({ brandText: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Affiché sous le logo. Laissez vide pour masquer.</p>
                </div>
                <div className="space-y-2">
                  <Label>Texte de copyright</Label>
                  <Input
                    placeholder="© {year} {site}"
                    value={cfg.copyrightText ?? ''}
                    onChange={e => setCfg({ copyrightText: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Variables : {'{year}'} et {'{site}'}. Laissez vide pour le format par défaut.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Mention FR</Label>
                    <Input
                      placeholder="TOUS DROITS RÉSERVÉS"
                      value={cfg.rightsTextFr ?? ''}
                      onChange={e => setCfg({ rightsTextFr: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mention EN</Label>
                    <Input
                      placeholder="ALL RIGHTS RESERVED"
                      value={cfg.rightsTextEn ?? ''}
                      onChange={e => setCfg({ rightsTextEn: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={on(cfg.showBrand)} onCheckedChange={v => setCfg({ showBrand: v })} />
                  Afficher le bloc marque
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={on(cfg.showTagline)} onCheckedChange={v => setCfg({ showTagline: v })} />
                  Afficher le slogan
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>Coordonnées affichées sous la marque.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={s.contactEmail ?? ''} onChange={e => set({ contactEmail: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={s.contactPhone ?? ''} onChange={e => set({ contactPhone: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={on(cfg.showContact)} onCheckedChange={v => setCfg({ showContact: v })} />
                  Afficher le contact
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={on(cfg.showEmail)} onCheckedChange={v => setCfg({ showEmail: v })} />
                  Email
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={on(cfg.showPhone)} onCheckedChange={v => setCfg({ showPhone: v })} />
                  Téléphone
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------- Réseaux sociaux ------------- */}
        <TabsContent value="socials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Réseaux sociaux</CardTitle>
              <CardDescription>Les icônes sont détectées automatiquement à partir du nom ou de l'URL.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Titre de la colonne</Label>
                  <Input
                    placeholder="Suivez-nous"
                    value={cfg.socialsTitle ?? ''}
                    onChange={e => setCfg({ socialsTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mode d'affichage</Label>
                  <Select
                    value={s.socialDisplayMode || 'icons'}
                    onValueChange={v => set({ socialDisplayMode: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icons">Icônes</SelectItem>
                      <SelectItem value="text">Texte</SelectItem>
                      <SelectItem value="both">Icônes + texte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-end gap-3">
                  <label className="flex items-center gap-3 text-sm">
                    <Switch checked={on(cfg.showSocials)} onCheckedChange={v => setCfg({ showSocials: v })} />
                    Afficher les réseaux
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <Switch checked={on(cfg.autoFillSocials)} onCheckedChange={v => setCfg({ autoFillSocials: v })} />
                    Compléter automatiquement (Facebook, Instagram, TikTok, YouTube)
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Taille des icônes</Label>
                  <span className="text-xs text-muted-foreground">{cfg.socialIconSize ?? 16} px</span>
                </div>
                <Slider
                  min={12}
                  max={48}
                  step={1}
                  value={[cfg.socialIconSize ?? 16]}
                  onValueChange={([v]) => setCfg({ socialIconSize: v })}
                />
              </div>

              <div className="space-y-2">
                <Label>Forme des pastilles</Label>
                <Select value={cfg.socialShape || 'square'} onValueChange={v => setCfg({ socialShape: v as any })}>
                  <SelectTrigger className="sm:w-[240px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Angle biseauté (défaut)</SelectItem>
                    <SelectItem value="rounded">Coins arrondis</SelectItem>
                    <SelectItem value="circle">Cercle</SelectItem>
                    <SelectItem value="none">Sans cadre</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                {socials.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun réseau configuré.</p>
                )}
                {socials.map((l, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 border border-border p-2">
                    {(l as any).iconUrl ? (
                      <img
                        src={(l as any).iconUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 border border-border object-contain p-1"
                      />
                    ) : (
                      <div className="h-9 w-9 shrink-0 border border-dashed border-border" />
                    )}

                    <Input
                      className="flex-1 min-w-[120px]"
                      placeholder="INSTAGRAM"
                      value={l.label}
                      onChange={e => {
                        const next = [...socials];
                        next[i] = { ...next[i], label: e.target.value };
                        setSocials(next);
                      }}
                    />
                    <Input
                      className="flex-[2] min-w-[160px]"
                      placeholder="https://instagram.com/..."
                      value={l.url}
                      onChange={e => {
                        const next = [...socials];
                        next[i] = { ...next[i], url: e.target.value };
                        setSocials(next);
                      }}
                    />
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setPickSocial(i)}>
                        <ImageIcon className="h-4 w-4" /> Image
                      </Button>
                      {(l as any).iconUrl && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          const next = [...socials];
                          next[i] = { ...next[i], iconUrl: '' } as any;
                          setSocials(next);
                        }}>Retirer</Button>
                      )}

                      <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => {
                        const next = [...socials];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        setSocials(next);
                      }}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" disabled={i === socials.length - 1} onClick={() => {
                        const next = [...socials];
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        setSocials(next);
                      }}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setSocials(socials.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={() => setSocials([...socials, { label: 'INSTAGRAM', url: '' }])} className="gap-2">
                  <Plus className="h-4 w-4" /> Ajouter un réseau
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------- Colonnes de liens ------------- */}
        <TabsContent value="colonnes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Colonnes de liens</CardTitle>
              <CardDescription>
                Jusqu'à 4 colonnes (Aide, Légal, Boutique…). Un lien commençant par « / » reste interne au site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {columns.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune colonne : cette zone reste masquée sur le site.</p>
              )}
              {columns.map((col, ci) => (
                <div key={ci} className="border border-border p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="flex-1 min-w-[140px]"
                      placeholder="Titre de la colonne"
                      value={col.title}
                      onChange={e => {
                        const next = [...columns];
                        next[ci] = { ...next[ci], title: e.target.value };
                        setColumns(next);
                      }}
                    />
                    <Button variant="ghost" size="icon" disabled={ci === 0} onClick={() => {
                      const next = [...columns];
                      [next[ci - 1], next[ci]] = [next[ci], next[ci - 1]];
                      setColumns(next);
                    }}><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={ci === columns.length - 1} onClick={() => {
                      const next = [...columns];
                      [next[ci + 1], next[ci]] = [next[ci], next[ci + 1]];
                      setColumns(next);
                    }}><ArrowDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setColumns(columns.filter((_, j) => j !== ci))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 pl-1">
                    {(col.links || []).map((l, li) => (
                      <div key={li} className="flex flex-wrap items-center gap-2">
                        <Input
                          className="flex-1 min-w-[120px]"
                          placeholder="Libellé"
                          value={l.label}
                          onChange={e => {
                            const next = [...columns];
                            const links = [...(next[ci].links || [])];
                            links[li] = { ...links[li], label: e.target.value };
                            next[ci] = { ...next[ci], links };
                            setColumns(next);
                          }}
                        />
                        <Input
                          className="flex-[2] min-w-[160px]"
                          placeholder="/boutique ou https://…"
                          value={l.url}
                          onChange={e => {
                            const next = [...columns];
                            const links = [...(next[ci].links || [])];
                            links[li] = { ...links[li], url: e.target.value };
                            next[ci] = { ...next[ci], links };
                            setColumns(next);
                          }}
                        />
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                          const next = [...columns];
                          next[ci] = { ...next[ci], links: (next[ci].links || []).filter((_, j) => j !== li) };
                          setColumns(next);
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                      const next = [...columns];
                      next[ci] = { ...next[ci], links: [...(next[ci].links || []), { label: '', url: '' }] };
                      setColumns(next);
                    }}>
                      <Plus className="h-4 w-4" /> Ajouter un lien
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="gap-2"
                disabled={columns.length >= 4}
                onClick={() => setColumns([...columns, { title: 'Nouvelle colonne', links: [] }])}
              >
                <Plus className="h-4 w-4" /> Ajouter une colonne
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------- Newsletter & bas de page ------------- */}
        <TabsContent value="bas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Newsletter</CardTitle>
              <CardDescription>Bloc d'inscription affiché dans le pied de page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Afficher le bloc newsletter</span>
                <Switch checked={on(cfg.showNewsletter)} onCheckedChange={v => setCfg({ showNewsletter: v })} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input placeholder="Newsletter" value={cfg.newsletterTitle ?? ''} onChange={e => setCfg({ newsletterTitle: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Libellé du bouton</Label>
                  <Input placeholder="S'inscrire" value={cfg.newsletterButton ?? ''} onChange={e => setCfg({ newsletterButton: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Texte d'accroche</Label>
                  <Textarea
                    rows={2}
                    placeholder="Inscrivez-vous pour recevoir nos offres exclusives."
                    value={cfg.newsletterText ?? ''}
                    onChange={e => setCfg({ newsletterText: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message de succès</Label>
                  <Input
                    placeholder="Merci ! Votre inscription est enregistrée."
                    value={cfg.newsletterSuccess ?? ''}
                    onChange={e => setCfg({ newsletterSuccess: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ligne de réassurance</Label>
                  <Input
                    placeholder="Désinscription en 1 clic · Pas de spam"
                    value={cfg.newsletterSubText ?? ''}
                    onChange={e => setCfg({ newsletterSubText: e.target.value })}
                  />
                </div>
                <label className="flex items-center justify-between gap-4 text-sm sm:col-span-2 border border-border px-3 py-2">
                  <span>Afficher la ligne de réassurance</span>
                  <Switch
                    checked={cfg.newsletterShowReassurance !== false}
                    onCheckedChange={v => setCfg({ newsletterShowReassurance: v })}
                  />
                </label>
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Liens légaux</CardTitle>
              <CardDescription>Ligne de liens affichée au-dessus du copyright.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Afficher les liens légaux</span>
                <Switch checked={on(cfg.showLegalLinks)} onCheckedChange={v => setCfg({ showLegalLinks: v })} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {LEGAL_OPTIONS.map(opt => {
                  const selected = !cfg.legalLinks || cfg.legalLinks.length === 0
                    ? true
                    : cfg.legalLinks.includes(opt.key);
                  return (
                    <label key={opt.key} className="flex items-center justify-between gap-4 text-sm border border-border px-3 py-2">
                      <span>{opt.label}</span>
                      <Switch
                        checked={selected}
                        onCheckedChange={v => {
                          const current = (!cfg.legalLinks || cfg.legalLinks.length === 0)
                            ? LEGAL_OPTIONS.map(o => o.key)
                            : cfg.legalLinks;
                          const next = v
                            ? Array.from(new Set([...current, opt.key]))
                            : current.filter(k => k !== opt.key);
                          setCfg({ legalLinks: LEGAL_OPTIONS.map(o => o.key).filter(k => next.includes(k)) });
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bas de page</CardTitle>
              <CardDescription>Copyright, sélecteur de langue et devise.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Sélecteur de langue (FR / EN)</span>
                <Switch checked={on(cfg.showLanguageSwitch)} onCheckedChange={v => setCfg({ showLanguageSwitch: v })} />
              </label>
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Afficher la devise (EUR €)</span>
                <Switch checked={on(cfg.showCurrency)} onCheckedChange={v => setCfg({ showCurrency: v })} />
              </label>
              <p className="text-[11px] text-muted-foreground">
                Le texte de copyright et les mentions FR/EN se règlent dans l'onglet « Marque & contact ».
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------- Paiement & avis ------------- */}
        <TabsContent value="confiance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paiement sécurisé</CardTitle>
              <CardDescription>Logos de paiement affichés en bas du footer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Afficher la section paiement sécurisé</span>
                <Switch checked={on(cfg.showPayments)} onCheckedChange={v => setCfg({ showPayments: v })} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Titre</Label>
                  <Input
                    value={cfg.paymentsTitle ?? ''}
                    placeholder="Paiement sécurisé"
                    onChange={e => setCfg({ paymentsTitle: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Texte de réassurance</Label>
                  <Input
                    value={cfg.paymentsNote ?? ''}
                    placeholder="Transactions chiffrées SSL et 3D Secure…"
                    onChange={e => setCfg({ paymentsNote: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Hauteur par défaut des logos</Label>
                  <span className="text-xs text-muted-foreground">{cfg.paymentBadgeHeight ?? 20} px</span>
                </div>
                <Slider
                  min={12}
                  max={64}
                  step={1}
                  value={[cfg.paymentBadgeHeight ?? 20]}
                  onValueChange={([v]) => setCfg({ paymentBadgeHeight: v })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Style de fond des logos</Label>
                  <Select
                    value={cfg.paymentBadgeStyle ?? 'transparent'}
                    onValueChange={(v: 'transparent' | 'light' | 'dark') => setCfg({ paymentBadgeStyle: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transparent">Transparent (sans cadre)</SelectItem>
                      <SelectItem value="light">Pastille claire</SelectItem>
                      <SelectItem value="dark">Pastille sombre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center justify-between gap-4 text-sm border border-border px-3 py-2 self-end">
                  <span>Logos en monochrome</span>
                  <Switch
                    checked={cfg.paymentBadgeMonochrome === true}
                    onCheckedChange={v => setCfg({ paymentBadgeMonochrome: v })}
                  />
                </label>
              </div>


              <div className="space-y-2">
                <Label className="block">Logos (ordre, image, taille)</Label>
                <p className="text-[11px] text-muted-foreground">
                  Remplacez n'importe quel logo (PayPal, CB, Visa, Apple Pay, 3D Secure…) par votre propre image,
                  réglez sa hauteur, son ordre et sa visibilité.
                </p>
                {paymentItems.map((b, i) => (
                  <div key={`${b.key}-${i}`} className="flex flex-wrap items-center gap-2 border border-border p-2">
                    {b.iconUrl ? (
                      <img src={b.iconUrl} alt="" className="h-9 w-auto max-w-[80px] border border-border object-contain p-1" />
                    ) : (
                      <span className="flex h-9 min-w-[70px] items-center justify-center border border-border px-2 text-[10px] font-bold uppercase">
                        {b.key}
                      </span>
                    )}
                    <Input
                      className="flex-1 min-w-[140px]"
                      placeholder="Libellé (ex : Klarna)"
                      value={b.label ?? ''}
                      onChange={e => setPaymentItems(paymentItems.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    />
                    <Input
                      type="number"
                      className="w-[90px]"
                      placeholder="px"
                      value={b.height ?? ''}
                      onChange={e => setPaymentItems(paymentItems.map((x, j) => j === i ? { ...x, height: Number(e.target.value) || undefined } : x))}
                    />
                    <Switch
                      checked={b.visible !== false}
                      aria-label="Afficher ce logo"
                      onCheckedChange={v => setPaymentItems(paymentItems.map((x, j) => j === i ? { ...x, visible: v } : x))}
                    />
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setPickPayment(i)}>
                        <ImageIcon className="h-4 w-4" /> Image
                      </Button>
                      {b.iconUrl && (
                        <Button variant="ghost" size="sm" onClick={() => setPaymentItems(paymentItems.map((x, j) => j === i ? { ...x, iconUrl: undefined } : x))}>
                          Logo d'origine
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => {
                        const next = [...paymentItems];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        setPaymentItems(next);
                      }}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" disabled={i === paymentItems.length - 1} onClick={() => {
                        const next = [...paymentItems];
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        setPaymentItems(next);
                      }}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() =>
                        setPaymentItems(paymentItems.filter((_, j) => j !== i))
                      }><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <Select value="" onValueChange={(v) => setPaymentItems([...paymentItems, { key: v, visible: true }])}>
                    <SelectTrigger className="h-10 w-[240px]">
                      <span className="flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> Ajouter un logo intégré</span>
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_BADGE_OPTIONS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="gap-2" onClick={() => setPickPayment('new')}>
                    <Plus className="h-4 w-4" /> Ajouter une image
                  </Button>
                </div>
              </div>


            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avis clients</CardTitle>
              <CardDescription>Les 3 derniers avis approuvés sont affichés automatiquement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Afficher la section avis clients</span>
                <Switch checked={on(cfg.showReviews)} onCheckedChange={v => setCfg({ showReviews: v })} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Titre</Label>
                  <Input
                    value={cfg.reviewsTitle ?? ''}
                    placeholder="Avis clients"
                    onChange={e => setCfg({ reviewsTitle: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Texte d'introduction</Label>
                  <Input
                    value={cfg.reviewsText ?? ''}
                    placeholder="Ils ont adopté nos pièces…"
                    onChange={e => setCfg({ reviewsText: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Libellé du lien</Label>
                  <Input
                    value={cfg.reviewsCtaLabel ?? ''}
                    placeholder="Voir tous les avis"
                    onChange={e => setCfg({ reviewsCtaLabel: e.target.value })}
                  />
                </div>
                <div>
                  <Label>URL du lien</Label>
                  <Input
                    value={cfg.reviewsCtaUrl ?? ''}
                    placeholder="/boutique"
                    onChange={e => setCfg({ reviewsCtaUrl: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Ajouter le widget Trustpilot dans cette section</span>
                <Switch
                  checked={cfg.reviewsShowTrustpilot === true}
                  onCheckedChange={v => setCfg({ reviewsShowTrustpilot: v })}
                />
              </label>
            </CardContent>
          </Card>
        </TabsContent>


        {/* ------------- Modules ------------- */}
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modules du footer</CardTitle>
              <CardDescription>Affichez ou masquez les éléments annexes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Bouton « Installer l'app »</span>
                <Switch checked={on(cfg.showInstallApp)} onCheckedChange={v => setCfg({ showInstallApp: v })} />
              </label>
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Widget Trustpilot</span>
                <Switch checked={on(cfg.showTrustpilot)} onCheckedChange={v => setCfg({ showTrustpilot: v })} />
              </label>
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Voyant technique « NODE_ACTIVE »</span>
                <Switch checked={on(cfg.showNodeStatus)} onCheckedChange={v => setCfg({ showNodeStatus: v })} />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bouton « Télécharger l'application »</CardTitle>
              <CardDescription>Texte, icône et style du bouton d'installation.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Libellé</Label>
                <Input
                  placeholder="Télécharger l’application"
                  value={cfg.installApp?.label ?? ''}
                  onChange={e => setCfg({ installApp: { ...(cfg.installApp || {}), label: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sous-titre (optionnel)</Label>
                <Input
                  placeholder="iOS & Android"
                  value={cfg.installApp?.subLabel ?? ''}
                  onChange={e => setCfg({ installApp: { ...(cfg.installApp || {}), subLabel: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <Select
                  value={cfg.installApp?.variant || 'outline'}
                  onValueChange={v => setCfg({ installApp: { ...(cfg.installApp || {}), variant: v as any } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outline">Contour</SelectItem>
                    <SelectItem value="solid">Plein</SelectItem>
                    <SelectItem value="text">Texte seul</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Taille</Label>
                <Select
                  value={cfg.installApp?.size || 'sm'}
                  onValueChange={v => setCfg({ installApp: { ...(cfg.installApp || {}), size: v as any } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Petite</SelectItem>
                    <SelectItem value="md">Moyenne</SelectItem>
                    <SelectItem value="lg">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Icône personnalisée</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {cfg.installApp?.iconUrl && (
                    <img src={cfg.installApp.iconUrl} alt="" className="h-10 w-10 border border-border object-contain p-1" />
                  )}
                  <Button variant="outline" className="gap-2" onClick={() => setPickInstallIcon(true)}>
                    <ImageIcon className="h-4 w-4" /> Choisir une image
                  </Button>
                  {cfg.installApp?.iconUrl && (
                    <Button variant="ghost" size="sm" onClick={() => setCfg({ installApp: { ...(cfg.installApp || {}), iconUrl: '' } })}>
                      Icône par défaut
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>

      {/* Aperçu */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu</CardTitle>
          <CardDescription>Rendu en direct du pied de page.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[320px] pointer-events-none">
            <Footer />
          </div>
        </CardContent>
      </Card>

      <MediaLibraryDialog
        open={pickLogo}
        onOpenChange={setPickLogo}
        onSelect={(url: string) => { set({ footerLogo: url }); setPickLogo(false); }}
      />

      <MediaLibraryDialog
        open={pickBg}
        onOpenChange={setPickBg}
        onSelect={(url: string) => { setDesign({ bgImage: url }); setPickBg(false); }}
      />

      <MediaLibraryDialog
        open={pickSocial !== null}
        onOpenChange={(o: boolean) => { if (!o) setPickSocial(null); }}
        onSelect={(url: string) => {
          if (pickSocial === null) return;
          const next = [...socials];
          next[pickSocial] = { ...next[pickSocial], iconUrl: url } as any;
          setSocials(next);
          setPickSocial(null);
        }}
      />

      <MediaLibraryDialog
        open={pickPayment !== null}
        onOpenChange={(o: boolean) => { if (!o) setPickPayment(null); }}
        onSelect={(url: string) => {
          if (pickPayment === 'new') {
            setPaymentItems([...paymentItems, { key: 'custom', iconUrl: url, label: '', visible: true }]);
          } else if (typeof pickPayment === 'number') {
            setPaymentItems(paymentItems.map((x, j) => (j === pickPayment ? { ...x, iconUrl: url } : x)));
          }
          setPickPayment(null);
        }}
      />

      <MediaLibraryDialog
        open={pickInstallIcon}
        onOpenChange={setPickInstallIcon}
        onSelect={(url: string) => {
          setCfg({ installApp: { ...(cfg.installApp || {}), iconUrl: url } });
          setPickInstallIcon(false);
        }}
      />




    </div>
  );
}
