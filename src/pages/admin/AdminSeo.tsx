import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MediaLibraryDialog } from '@/components/visual-editor/MediaLibraryDialog';
import { MaintenancePage } from '@/components/maintenance/MaintenancePage';
import { Globe, EyeOff, Save, Loader2, Wrench, Image as ImageIcon, ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';

const SITE_URL = 'https://helvetica-mp.helvetica-mp.net';

export default function AdminSeo() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const s = (designSettings as any) || {};
  const [saving, setSaving] = useState(false);
  const [pickOg, setPickOg] = useState(false);
  const [pickMaint, setPickMaint] = useState(false);

  const set = (patch: Record<string, unknown>) => updateDesignSettings(patch as any);

  const save = async () => {
    try {
      setSaving(true);
      await flushDesignSettings();
      toast.success('Réglages enregistrés');
    } catch (e: any) {
      toast.error('Erreur', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const indexable = s.seoIndexable !== false;
  const maintenance = s.maintenanceEnabled === true;

  const untilLocal = (() => {
    if (!s.maintenanceUntil) return '';
    const d = new Date(s.maintenanceUntil);
    if (Number.isNaN(d.getTime())) return '';
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  })();

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">SEO & Visibilité</h1>
          <p className="text-sm text-muted-foreground">
            Rendez le site visible ou invisible sur Google, et activez le mode maintenance.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>

      {maintenance && (
        <Alert variant="destructive">
          <Wrench className="h-4 w-4" />
          <AlertTitle>Site en maintenance</AlertTitle>
          <AlertDescription>
            Les visiteurs voient la page de maintenance. Les pages ne sont pas indexées tant que ce mode est actif.
          </AlertDescription>
        </Alert>
      )}

      {/* ---------------- Visibilité Google ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" /> Visibilité sur Google
          </CardTitle>
          <CardDescription>
            Un seul interrupteur : le site est référençable, ou masqué des moteurs de recherche.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 p-4 border rounded">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-semibold">
                {indexable ? <Globe className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                {indexable ? 'Site visible sur Google' : 'Site masqué de Google'}
                <Badge variant={indexable ? 'default' : 'secondary'}>
                  {indexable ? 'index, follow' : 'noindex, nofollow'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Google met généralement quelques jours à plusieurs semaines pour répercuter un changement.
              </p>
            </div>
            <Switch checked={indexable} onCheckedChange={(v) => set({ seoIndexable: v })} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Bloquer l'indexation des images</Label>
              <p className="text-xs text-muted-foreground">
                Activez si vous ne voulez pas voir vos visuels produits dans Google Images.
              </p>
            </div>
            <Switch checked={s.seoNoImageIndex === true} onCheckedChange={(v) => set({ seoNoImageIndex: v })} />
          </div>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Titre affiché dans Google</Label>
              <Input
                value={s.seoDefaultTitle ?? ''}
                onChange={(e) => set({ seoDefaultTitle: e.target.value })}
                placeholder="HELVETICA MOUNTAIN PIONEERS — Vêtements techniques"
                maxLength={70}
              />
              <p className="text-[11px] text-muted-foreground">{(s.seoDefaultTitle ?? '').length}/60 caractères recommandés</p>
            </div>

            <div className="space-y-1.5">
              <Label>Description affichée dans Google</Label>
              <Textarea
                value={s.seoDefaultDescription ?? ''}
                onChange={(e) => set({ seoDefaultDescription: e.target.value })}
                placeholder="Boutique officielle HELVETICA MOUNTAIN PIONEERS : doudounes, vestes et pièces techniques."
                rows={3}
                maxLength={200}
              />
              <p className="text-[11px] text-muted-foreground">{(s.seoDefaultDescription ?? '').length}/160 caractères recommandés</p>
            </div>

            <div className="space-y-1.5">
              <Label>Image de partage (réseaux sociaux)</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={s.seoOgImage ?? ''}
                  onChange={(e) => set({ seoOgImage: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 min-w-[200px]"
                />
                <Button type="button" variant="outline" onClick={() => setPickOg(true)}>
                  <ImageIcon className="h-4 w-4 mr-2" /> Médiathèque
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Format conseillé : 1200 × 630 px.</p>
            </div>
          </div>

          {/* Aperçu résultat Google */}
          <div className="p-4 border rounded bg-muted/30">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <Search className="h-3.5 w-3.5" /> Aperçu Google
            </div>
            <div className="text-xs text-muted-foreground truncate">{SITE_URL}</div>
            <div className="text-[#1a0dab] text-lg leading-snug truncate">
              {s.seoDefaultTitle || s.siteName || 'HELVETICA MOUNTAIN PIONEERS'}
            </div>
            <div className="text-sm text-muted-foreground line-clamp-2">
              {s.seoDefaultDescription || s.siteTagline || 'Ajoutez une description pour contrôler ce texte.'}
            </div>
            {!indexable && (
              <div className="mt-2 text-xs font-semibold text-destructive">
                Actuellement masqué : ce résultat finira par disparaître de Google.
              </div>
            )}
          </div>

          <Alert>
            <AlertTitle>Suivre l'indexation réellement constatée par Google</AlertTitle>
            <AlertDescription className="space-y-2 text-sm">
              <p>
                Pour savoir quelles pages sont réellement indexées, ajoutez le site dans Google Search Console
                (propriété <code>{SITE_URL}</code>), puis soumettez le plan du site :{' '}
                <code>{SITE_URL}/sitemap.xml</code>.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="outline" size="sm">
                  <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                    Ouvrir Search Console <ExternalLink className="h-3.5 w-3.5 ml-2" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`${SITE_URL}/sitemap.xml`} target="_blank" rel="noopener noreferrer">
                    Voir mon sitemap <ExternalLink className="h-3.5 w-3.5 ml-2" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`https://www.google.com/search?q=site:${SITE_URL.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer">
                    Tester « site: » sur Google <ExternalLink className="h-3.5 w-3.5 ml-2" />
                  </a>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* ---------------- Maintenance ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Mode maintenance
          </CardTitle>
          <CardDescription>
            Ferme le site public et affiche une page dédiée. L'administration reste accessible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 p-4 border rounded">
            <div>
              <div className="font-semibold">{maintenance ? 'Maintenance activée' : 'Site ouvert au public'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Activez pour bloquer l'accès aux visiteurs pendant vos mises à jour.
              </p>
            </div>
            <Switch checked={maintenance} onCheckedChange={(v) => set({ maintenanceEnabled: v })} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Les administrateurs continuent de voir le site</Label>
              <p className="text-xs text-muted-foreground">Recommandé, pour vérifier vos changements en direct.</p>
            </div>
            <Switch
              checked={s.maintenanceAdminBypass !== false}
              onCheckedChange={(v) => set({ maintenanceAdminBypass: v })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input
                value={s.maintenanceTitle ?? ''}
                onChange={(e) => set({ maintenanceTitle: e.target.value })}
                placeholder="SITE EN MAINTENANCE"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Réouverture prévue (facultatif)</Label>
              <Input
                type="datetime-local"
                value={untilLocal}
                onChange={(e) =>
                  set({ maintenanceUntil: e.target.value ? new Date(e.target.value).toISOString() : '' })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              value={s.maintenanceMessage ?? ''}
              onChange={(e) => set({ maintenanceMessage: e.target.value })}
              rows={3}
              placeholder="Nous préparons de nouvelles pièces. Retour très vite."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Visuel / logo</Label>
              <div className="flex gap-2">
                <Input
                  value={s.maintenanceImage ?? ''}
                  onChange={(e) => set({ maintenanceImage: e.target.value })}
                  placeholder="Par défaut : logo du site"
                />
                <Button type="button" variant="outline" onClick={() => setPickMaint(true)}>
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Couleur de fond</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={s.maintenanceBg || '#ffffff'}
                  onChange={(e) => set({ maintenanceBg: e.target.value })}
                  className="h-10 w-14 rounded border border-border bg-transparent"
                />
                <Input
                  value={s.maintenanceBg ?? ''}
                  onChange={(e) => set({ maintenanceBg: e.target.value })}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Aperçu</Label>
            <MaintenancePage preview />
          </div>
        </CardContent>
      </Card>

      <MediaLibraryDialog
        open={pickOg}
        onOpenChange={setPickOg}
        onSelect={(url) => { set({ seoOgImage: url }); setPickOg(false); }}
        title="Image de partage"
      />
      <MediaLibraryDialog
        open={pickMaint}
        onOpenChange={setPickMaint}
        onSelect={(url) => { set({ maintenanceImage: url }); setPickMaint(false); }}
        title="Visuel de maintenance"
      />
    </div>
  );
}
