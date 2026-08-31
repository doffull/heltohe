import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Save, Eye } from 'lucide-react';

type Snapshot = {
  score: number;
  tablesWithoutRls: { table: string }[];
  functionsWithoutSearchPath: { function: string }[];
  recentErrors: { message: string; occurrences: number; last_seen: string }[];
  failedLogins24h: number;
  criticalRpcs: Record<string, boolean>;
  generatedAt: string;
};

const DEFAULT_OVERLAY = {
  enabled: true,
  text: '',
  showEmail: true,
  opacity: 0.05,
  angle: -30,
  density: 60,
  color: 'currentColor',
  blockPrintScreen: true,
  disableRightClick: true,
};

export default function AdminSecurity() {
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['security-snapshot'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('security_audit_snapshot' as any);
      if (error) throw error;
      return data as unknown as Snapshot;
    },
    refetchOnWindowFocus: false,
  });

  const { designSettings, flushDesignSettings } = useApp();
  const { toast } = useToast();
  const [overlay, setOverlay] = useState<any>(DEFAULT_OVERLAY);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  // Une fois que l'admin a touché un réglage, on n'écrase plus le formulaire
  // avec les rafraîchissements automatiques du backend (toutes les 15 s).
  const dirtyRef = useRef(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!designSettings) return;
    if (dirtyRef.current) return;
    if (hydratedRef.current && !(designSettings as any).securityOverlay) return;
    hydratedRef.current = true;
    setOverlay({ ...DEFAULT_OVERLAY, ...((designSettings as any).securityOverlay ?? {}) });
  }, [designSettings]);

  const patch = (updates: Record<string, unknown>) => {
    dirtyRef.current = true;
    setOverlay((o: any) => ({ ...o, ...updates }));
  };

  const saveOverlay = async () => {
    setSaving(true);
    try {
      // Passe par le contexte pour que la copie en mémoire (utilisée par tous
      // les autres écrans) contienne immédiatement la nouvelle valeur.
      await flushDesignSettings({ securityOverlay: overlay } as any);
      dirtyRef.current = false;
      toast({
        title: overlay.enabled ? 'Protection activée' : 'Protection désactivée',
        description: 'Réglages enregistrés.',
      });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const score = data?.score ?? 0;
  const scoreColor =
    score >= 80 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  const ScoreIcon = score >= 80 ? ShieldCheck : ShieldAlert;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold hud-text">SÉCURITÉ</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit backend et personnalisation de la protection anti-copie.
          </p>
        </div>
        <Button onClick={() => refetch()} disabled={isFetching} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Re-scan
        </Button>
      </div>

      {/* ── Protection anti-copie ── */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-lg">Protection & filigrane</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Configuration du filigrane traçable et des blocages de copie. Désactivé automatiquement pour les super-admins connectés.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreview(v => !v)} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              {preview ? 'Masquer aperçu' : 'Aperçu'}
            </Button>
            <Button size="sm" onClick={saveOverlay} disabled={saving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Enregistrer
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <Label className="text-sm">Filigrane visible</Label>
              <p className="text-[11px] text-muted-foreground">Overlay diagonal traçable sur tout le site public.</p>
            </div>
            <Switch checked={!!overlay.enabled} onCheckedChange={v => patch({ enabled: v })} />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <Label className="text-sm">Inclure l'email visiteur</Label>
              <p className="text-[11px] text-muted-foreground">Marque le filigrane avec l'email connecté (traçabilité).</p>
            </div>
            <Switch checked={overlay.showEmail !== false} onCheckedChange={v => patch({ showEmail: v })} />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <Label className="text-sm">Bloquer PrintScreen</Label>
              <p className="text-[11px] text-muted-foreground">Floute la page et vide le presse-papier à l'appui.</p>
            </div>
            <Switch checked={overlay.blockPrintScreen !== false} onCheckedChange={v => patch({ blockPrintScreen: v })} />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <Label className="text-sm">Désactiver clic droit / sélection</Label>
              <p className="text-[11px] text-muted-foreground">Empêche la copie d'images et texte hors champs.</p>
            </div>
            <Switch checked={overlay.disableRightClick !== false} onCheckedChange={v => patch({ disableRightClick: v })} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Texte personnalisé du filigrane</Label>
            <Input
              value={overlay.text ?? ''}
              onChange={e => patch({ text: e.target.value })}
              placeholder="Ex : © HELVETICA-MP — Propriété — Ne pas diffuser"
            />
            <p className="text-[11px] text-muted-foreground">Laissez vide pour n'afficher que l'email et le timestamp.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Opacité ({(overlay.opacity ?? 0.05).toFixed(2)})</Label>
              <Slider
                value={[Math.round((overlay.opacity ?? 0.05) * 100)]}
                min={1}
                max={30}
                step={1}
                onValueChange={([v]) => patch({ opacity: v / 100 })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Angle ({overlay.angle ?? -30}°)</Label>
              <Slider
                value={[overlay.angle ?? -30]}
                min={-90}
                max={90}
                step={5}
                onValueChange={([v]) => patch({ angle: v })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Densité ({overlay.density ?? 60})</Label>
              <Slider
                value={[overlay.density ?? 60]}
                min={20}
                max={150}
                step={5}
                onValueChange={([v]) => patch({ density: v })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Couleur du filigrane</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                value={overlay.color ?? 'currentColor'}
                onChange={e => patch({ color: e.target.value })}
                placeholder="currentColor, #ff0000, rgba(0,0,0,0.3)…"
                className="flex-1"
              />
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(overlay.color ?? '') ? overlay.color : '#000000'}
                onChange={e => patch({ color: e.target.value })}
                className="h-9 w-12 rounded border cursor-pointer"
              />
            </div>
          </div>
        </div>

        {preview && (
          <div className="relative h-40 rounded border overflow-hidden bg-background">
            <div
              className="absolute inset-0 flex flex-wrap gap-8 p-4 text-[10px] uppercase tracking-widest font-mono"
              style={{
                transform: `rotate(${overlay.angle ?? -30}deg) scale(1.4)`,
                transformOrigin: 'center',
                opacity: overlay.opacity ?? 0.05,
                color: overlay.color || 'currentColor',
              }}
            >
              {Array.from({ length: overlay.density ?? 60 }).map((_, i) => (
                <span key={i} className="whitespace-nowrap">
                  {[overlay.text, overlay.showEmail ? 'user@example.com' : '', '2026-07-27 10:00'].filter(Boolean).join(' • ') || 'protégé'}
                </span>
              ))}
            </div>
            <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">Aperçu</span>
          </div>
        )}
      </Card>

      {/* ── Audit ── */}
      {error && (
        <Card className="p-4 border-destructive">
          <p className="text-sm text-destructive">
            Impossible de charger l'audit : {(error as Error).message}
          </p>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <ScoreIcon className={`h-12 w-12 ${scoreColor}`} />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Score global</p>
            <p className={`text-4xl font-bold ${scoreColor}`}>{isLoading ? '…' : score}/100</p>
            {data && (
              <p className="text-xs text-muted-foreground mt-1">
                Généré {new Date(data.generatedAt).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Tables sans RLS
          </h2>
          {data?.tablesWithoutRls.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.tablesWithoutRls.map((t) => (
                <Badge key={t.table} variant="outline" className="text-red-500 border-red-500/30">
                  {t.table}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Toutes les tables sont protégées
            </p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Fonctions sans search_path
          </h2>
          {data?.functionsWithoutSearchPath.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.functionsWithoutSearchPath.map((f) => (
                <Badge key={f.function} variant="outline" className="text-amber-500 border-amber-500/30">
                  {f.function}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Toutes les fonctions sont sécurisées
            </p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-3">Tentatives de connexion échouées (24h)</h2>
          <p className={`text-3xl font-bold ${(data?.failedLogins24h ?? 0) > 20 ? 'text-red-500' : 'text-foreground'}`}>
            {data?.failedLogins24h ?? '…'}
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-3">Fonctions critiques</h2>
          <div className="space-y-1.5">
            {data?.criticalRpcs && Object.entries(data.criticalRpcs).map(([name, exists]) => (
              <div key={name} className="flex items-center gap-2 text-sm">
                {exists ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <code className="text-xs">{name}</code>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-bold mb-3">Erreurs JS récentes (7 jours)</h2>
        {data?.recentErrors.length ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.recentErrors.map((e, i) => (
              <div key={i} className="border-b border-border/50 py-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <code className="text-xs break-all flex-1">{e.message}</code>
                  <Badge variant="outline">{e.occurrences}×</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dernière : {new Date(e.last_seen).toLocaleString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-green-500 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Aucune erreur récente
          </p>
        )}
      </Card>
    </div>
  );
}
