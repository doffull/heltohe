import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Paintbrush, Scale } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminConfig, useSaveAdminConfig } from '@/hooks/useAdminConfig';

export default function AdminSettings() {
  const { toast } = useToast();
  const { designSettings, updateDesignSettings } = useApp();
  const { data: adminConfig } = useAdminConfig();
  const saveAdminConfig = useSaveAdminConfig();



  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-3xl font-bold hud-text">PARAMÈTRES</h1>
        <p className="text-muted-foreground text-xs lg:text-sm mt-1">Configuration de la boutique</p>
      </div>

      <div className="p-3 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
        Les catégories et leurs pages se gèrent désormais au même endroit :{' '}
        <Link to="/admin/pages" className="text-primary underline">Pages & Catégories</Link>.
      </div>

      <Tabs defaultValue="customization">
        <TabsList className="bg-muted/50 admin-tabs-scroll w-full h-auto">
          <TabsTrigger value="customization" className="gap-2 text-xs sm:text-sm"><Paintbrush className="h-4 w-4" />Personnalisation</TabsTrigger>
          <TabsTrigger value="general" className="gap-2 text-xs sm:text-sm"><Settings className="h-4 w-4" />Général</TabsTrigger>
          <TabsTrigger value="legal" className="gap-2 text-xs sm:text-sm"><Scale className="h-4 w-4" />Légal</TabsTrigger>
        </TabsList>


        {/* ── CUSTOMIZATION TAB ── */}
        <TabsContent value="customization" className="space-y-4">
          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <h3 className="text-lg font-bold hud-text">TYPOGRAPHIE</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">Police des titres</Label>
                <select
                  value={(designSettings as any).fontHeading || 'Helvetica'}
                  onChange={e => updateDesignSettings({ fontHeading: e.target.value } as any)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Inter">Inter</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Oswald">Oswald</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Police du corps</Label>
                <select
                  value={(designSettings as any).fontBody || 'Helvetica'}
                  onChange={e => updateDesignSettings({ fontBody: e.target.value } as any)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Inter">Inter</option>
                  <option value="Lato">Lato</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Source Sans 3">Source Sans 3</option>
                </select>
              </div>
            </div>
          </div>

          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <h3 className="text-lg font-bold hud-text">COULEURS</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">Couleur primaire</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={designSettings.accentColor || '#00FF88'}
                    onChange={e => updateDesignSettings({ accentColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={designSettings.accentColor || '#00FF88'}
                    onChange={e => updateDesignSettings({ accentColor: e.target.value })}
                    className="flex-1 bg-secondary/50 border-border/30 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Fond header</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={(designSettings as any).headerBgColor || '#000000'}
                    onChange={e => updateDesignSettings({ headerBgColor: e.target.value } as any)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={(designSettings as any).headerBgColor || '#000000'}
                    onChange={e => updateDesignSettings({ headerBgColor: e.target.value } as any)}
                    className="flex-1 bg-secondary/50 border-border/30 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Texte header</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={(designSettings as any).headerTextColor || '#ffffff'}
                    onChange={e => updateDesignSettings({ headerTextColor: e.target.value } as any)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={(designSettings as any).headerTextColor || '#ffffff'}
                    onChange={e => updateDesignSettings({ headerTextColor: e.target.value } as any)}
                    className="flex-1 bg-secondary/50 border-border/30 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Fond sidebar</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={designSettings.sidebarBg || '#0A0A0A'}
                    onChange={e => updateDesignSettings({ sidebarBg: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={designSettings.sidebarBg || '#0A0A0A'}
                    onChange={e => updateDesignSettings({ sidebarBg: e.target.value })}
                    className="flex-1 bg-secondary/50 border-border/30 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <h3 className="text-lg font-bold hud-text">ESPACEMENT GLOBAL</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['compact', 'normal', 'spacious'] as const).map(sp => (
                <button
                  key={sp}
                  onClick={() => updateDesignSettings({ siteSpacing: sp } as any)}
                  className={`p-4 chamfer-hud border text-center transition-colors ${
                    ((designSettings as any).siteSpacing || 'compact') === sp
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border hover:border-foreground/50'
                  }`}
                >
                  <p className="font-bold text-sm uppercase">{sp === 'compact' ? 'Compact' : sp === 'normal' ? 'Normal' : 'Spacieux'}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {sp === 'compact' ? 'Minimum d\'espace' : sp === 'normal' ? 'Espacement équilibré' : 'Beaucoup d\'espace'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── GENERAL TAB ── */}
        <TabsContent value="general" className="space-y-4">
          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <h3 className="text-lg font-bold hud-text">INFORMATIONS DU SITE</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">Nom du site</Label>
                <Input
                  value={designSettings.siteName ?? ''}
                  onChange={e => updateDesignSettings({ siteName: e.target.value } as any)}
                  placeholder="Nom de votre boutique"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Tagline / Slogan</Label>
                <Input
                  value={(designSettings as any).siteTagline ?? ''}
                  onChange={e => updateDesignSettings({ siteTagline: e.target.value } as any)}
                  placeholder="Votre slogan..."
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Email de contact</Label>
                <Input
                  type="email"
                  value={(designSettings as any).contactEmail ?? ''}
                  onChange={e => updateDesignSettings({ contactEmail: e.target.value } as any)}
                  placeholder="contact@votredomaine.com"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Téléphone de contact</Label>
                <Input
                  type="tel"
                  value={(designSettings as any).contactPhone ?? ''}
                  onChange={e => updateDesignSettings({ contactPhone: e.target.value } as any)}
                  placeholder="+33 6 00 00 00 00"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="hud-text text-xs">Devise</Label>
              <Input defaultValue="EUR (€)" className="bg-secondary/50 border-border/30" disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Ces informations sont sauvegardées automatiquement. Les paramètres de design avancés sont accessibles via la section Design.
            </p>
          </div>

          {/* Notifications */}
          <div className="chamfer-hud bg-card/50 p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold hud-text">NOTIFICATIONS EMAIL</h3>
              <p className="text-xs text-muted-foreground mt-1">Recevez une copie de chaque nouvelle commande passée sur la boutique.</p>
            </div>
            <div className="space-y-2">
              <Label className="hud-text text-xs">Email de notification admin</Label>
              <Input
                type="email"
                placeholder="admin@votredomaine.com"
                value={adminConfig?.adminNotificationEmail ?? ''}
                onChange={e => saveAdminConfig.mutate({ ...adminConfig, adminNotificationEmail: e.target.value })}
                className="bg-secondary/50 border-border/30"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                Cet email recevra un récapitulatif complet + lien admin pour chaque nouvelle commande.
              </p>
            </div>
            {adminConfig?.adminNotificationEmail && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 chamfer-hud-sm px-3 py-2">
                <span>✓</span>
                <span>Notifications actives → <strong>{adminConfig.adminNotificationEmail}</strong></span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── LEGAL TAB ── */}
        <TabsContent value="legal" className="space-y-4">
          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold hud-text">INFORMATIONS LÉGALES DE LA SOCIÉTÉ</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ces informations sont affichées automatiquement sur toutes les pages légales (Mentions légales, CGV, etc.).
                Les champs non remplis apparaîtront en orange sur les pages légales.
              </p>
            </div>

            {/* Identité société */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">Raison sociale / Nom de la société</Label>
                <Input
                  value={(designSettings as any).legalCompanyName ?? ''}
                  onChange={e => updateDesignSettings({ legalCompanyName: e.target.value } as any)}
                  placeholder="ACME SAS, Jean Dupont..."
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Forme juridique</Label>
                <Input
                  value={(designSettings as any).legalCompanyForm ?? ''}
                  onChange={e => updateDesignSettings({ legalCompanyForm: e.target.value } as any)}
                  placeholder="SARL, SAS, Auto-entrepreneur..."
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Capital social (€)</Label>
                <Input
                  value={(designSettings as any).legalCapital ?? ''}
                  onChange={e => updateDesignSettings({ legalCapital: e.target.value } as any)}
                  placeholder="10 000"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Directeur de la publication</Label>
                <Input
                  value={(designSettings as any).legalDirector ?? ''}
                  onChange={e => updateDesignSettings({ legalDirector: e.target.value } as any)}
                  placeholder="Prénom Nom"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
            </div>

            {/* Siège social */}
            <div>
              <h4 className="text-sm font-semibold hud-text mb-3 uppercase tracking-wide">Siège social</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-3">
                  <Label className="hud-text text-xs">Adresse (rue)</Label>
                  <Input
                    value={(designSettings as any).legalAddress ?? ''}
                    onChange={e => updateDesignSettings({ legalAddress: e.target.value } as any)}
                    placeholder="12 rue de la Paix"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Code postal</Label>
                  <Input
                    value={(designSettings as any).legalZip ?? ''}
                    onChange={e => updateDesignSettings({ legalZip: e.target.value } as any)}
                    placeholder="75001"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="hud-text text-xs">Ville</Label>
                  <Input
                    value={(designSettings as any).legalCity ?? ''}
                    onChange={e => updateDesignSettings({ legalCity: e.target.value } as any)}
                    placeholder="Paris"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
              </div>
            </div>

            {/* Immatriculation */}
            <div>
              <h4 className="text-sm font-semibold hud-text mb-3 uppercase tracking-wide">Immatriculation</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="hud-text text-xs">SIRET</Label>
                  <Input
                    value={(designSettings as any).legalSiret ?? ''}
                    onChange={e => updateDesignSettings({ legalSiret: e.target.value } as any)}
                    placeholder="XXX XXX XXX XXXXX"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">RCS (Ville + numéro)</Label>
                  <Input
                    value={(designSettings as any).legalRcs ?? ''}
                    onChange={e => updateDesignSettings({ legalRcs: e.target.value } as any)}
                    placeholder="Paris B 123 456 789"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">N° TVA intracommunautaire</Label>
                  <Input
                    value={(designSettings as any).legalVat ?? ''}
                    onChange={e => updateDesignSettings({ legalVat: e.target.value } as any)}
                    placeholder="FR XX XXX XXX XXX"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
              </div>
            </div>

            {/* Contacts légaux */}
            <div>
              <h4 className="text-sm font-semibold hud-text mb-3 uppercase tracking-wide">Contacts légaux</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Email RGPD / Protection des données</Label>
                  <Input
                    type="email"
                    value={(designSettings as any).legalRgpdEmail ?? ''}
                    onChange={e => updateDesignSettings({ legalRgpdEmail: e.target.value } as any)}
                    placeholder="rgpd@votredomaine.com"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Email service retours</Label>
                  <Input
                    type="email"
                    value={(designSettings as any).legalReturnEmail ?? ''}
                    onChange={e => updateDesignSettings({ legalReturnEmail: e.target.value } as any)}
                    placeholder="retours@votredomaine.com"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground border-t border-border pt-4">
              Ces informations sont sauvegardées automatiquement. Elles remplacent les mentions "[Non configuré]" sur les pages légales publiques.
            </p>
          </div>
        </TabsContent>
      </Tabs>



    </div>
  );
}
