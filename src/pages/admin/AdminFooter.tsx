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
import {
  Save, Loader2, PanelBottom, Plus, Trash2, ArrowUp, ArrowDown,
  Image as ImageIcon, Share2, Columns3, ToggleLeft, Mail, Palette, LayoutTemplate, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { FOOTER_PRESETS } from '@/config/footerPresets';
import type { FooterColumn, FooterConfig, FooterDesign, FooterLayout } from '@/types';

const LAYOUT_OPTIONS: { value: FooterLayout; label: string }[] = [
  { value: 'industrial', label: 'Industrial (4 colonnes)' },
  { value: 'minimal', label: 'Minimal Ligne' },
  { value: 'editorial', label: 'Éditorial' },
  { value: 'newsletter-first', label: 'Newsletter First' },
  { value: 'showcase', label: 'Vitrine' },
  { value: 'compact', label: 'Compact Mobile' },
];


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
  const [saving, setSaving] = useState(false);
  const [pickLogo, setPickLogo] = useState(false);

  const on = (v: boolean | undefined) => v !== false;
  const setCfg = (patch: Partial<FooterConfig>) =>
    updateDesignSettings({ footerConfig: { ...cfg, ...patch } } as any);
  const set = (patch: Record<string, unknown>) => updateDesignSettings(patch as any);

  const socials: { label: string; url: string }[] = s.socialLinks || [];
  const setSocials = (next: { label: string; url: string }[]) => set({ socialLinks: next });

  const columns: FooterColumn[] = cfg.columns || [];
  const setColumns = (next: FooterColumn[]) => setCfg({ columns: next });

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
    <div className="space-y-6 p-4 md:p-6 max-w-5xl">
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

      <Tabs defaultValue="marque" className="w-full">
        <TabsList className="mb-4 admin-tabs-scroll w-full h-auto">
          <TabsTrigger value="marque" className="gap-2"><ImageIcon className="h-4 w-4" />Marque & contact</TabsTrigger>
          <TabsTrigger value="socials" className="gap-2"><Share2 className="h-4 w-4" />Réseaux sociaux</TabsTrigger>
          <TabsTrigger value="colonnes" className="gap-2"><Columns3 className="h-4 w-4" />Colonnes de liens</TabsTrigger>
          <TabsTrigger value="bas" className="gap-2"><Mail className="h-4 w-4" />Newsletter & bas de page</TabsTrigger>
          <TabsTrigger value="modules" className="gap-2"><ToggleLeft className="h-4 w-4" />Modules</TabsTrigger>
        </TabsList>

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
                {socials.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun réseau configuré.</p>
                )}
                {socials.map((l, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 border border-border p-2">
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
    </div>
  );
}
