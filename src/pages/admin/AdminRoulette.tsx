import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  useRouletteConfig,
  useRouletteSegments,
  useUpdateRouletteConfig,
  useUpsertSegment,
  useDeleteSegment,
  useRouletteSpinsHistory,
  type RouletteSegment,
} from '@/hooks/useRoulette';
import { ROULETTE_PRESETS } from '@/config/roulettePresets';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminRoulette() {
  const { data: config } = useRouletteConfig();
  const { data: segments = [] } = useRouletteSegments(true);
  const { data: spins = [] } = useRouletteSpinsHistory();
  const updateConfig = useUpdateRouletteConfig();
  const upsert = useUpsertSegment();
  const del = useDeleteSegment();
  const [draft, setDraft] = useState<any>(null);
  const { designSettings, updateDesignSettings } = useApp();
  const qc = useQueryClient();

  const cfg = draft || config;

  const applyPreset = async (presetId: string) => {
    const preset = ROULETTE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    try {
      // 1) Update roulette_config
      await updateConfig.mutateAsync(preset.config as any);
      // 2) Replace segments
      await supabase.from('roulette_segments' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const rows = preset.segments.map((s, i) => ({ ...s, sort_order: i, is_active: true }));
      await supabase.from('roulette_segments' as any).insert(rows as any);
      qc.invalidateQueries({ queryKey: ['roulette-segments'] });
      // 3) Update FAB style
      const cur = (designSettings as any) || {};
      const ufab = cur.unifiedFab || {};
      await updateDesignSettings({
        ...cur,
        unifiedFab: {
          ...ufab,
          rouletteFab: { ...(ufab.rouletteFab || {}), ...preset.fab },
        },
      } as any);
      toast.success(`Preset « ${preset.name} » appliqué`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'application du preset');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold uppercase tracking-wider">🎰 Roulette</h1>
        <p className="text-sm text-muted-foreground">Système de jeu quotidien à lots</p>
      </div>

      {/* PRESETS */}
      <Card className="p-4 border-2 border-primary/40">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider">Presets rapides</h2>
            <p className="text-xs text-muted-foreground">Style FAB + type de jeu + lots/promos en un clic</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ROULETTE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className="text-left border-2 border-border hover:border-primary p-3 transition group"
              style={{ background: p.fab.accentColor + '14' }}
            >
              <div className="text-2xl mb-1">{p.emoji}</div>
              <div className="text-sm font-bold uppercase tracking-wider">{p.name}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{p.description}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[9px] px-1.5 py-0.5 bg-foreground text-background uppercase tracking-wider">{p.gameType}</span>
                <span className="text-[9px] px-1.5 py-0.5 border border-foreground/40 uppercase tracking-wider">{p.fab.variant}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* GAME TYPE SELECTOR */}
      <Card className="p-4 border-2 border-foreground/20">
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider">Type de jeu</h2>
          <p className="text-xs text-muted-foreground">Choisis le format affiché aux visiteurs. Les lots et codes promo restent identiques.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { id: 'scratch', emoji: '🃏', name: 'Cartes à gratter', desc: '3 cartes, design industriel minimal' },
            { id: 'wheel', emoji: '🎡', name: 'Roulette classique', desc: 'Roue tournante avec segments colorés' },
            { id: 'mystery', emoji: '📦', name: 'Boîte mystère', desc: 'Une boîte à ouvrir (à venir = scratch)' },
            { id: 'flash', emoji: '⚡', name: 'Promo flash', desc: 'Compte à rebours (à venir = scratch)' },
          ] as const).map((g) => {
            const active = ((config as any)?.game_type || 'scratch') === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={async () => {
                  await updateConfig.mutateAsync({ game_type: g.id } as any);
                  toast.success(`Jeu : ${g.name}`);
                }}
                className={`text-left border-2 p-3 transition ${active ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/60'}`}
              >
                <div className="text-2xl mb-1">{g.emoji}</div>
                <div className="text-sm font-bold uppercase tracking-wider">{g.name}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{g.desc}</div>
                {active && <div className="mt-2 text-[9px] uppercase tracking-wider bg-foreground text-background inline-block px-1.5 py-0.5">Actif</div>}
              </button>
            );
          })}
        </div>
      </Card>



      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="segments">Lots ({segments.length})</TabsTrigger>
          <TabsTrigger value="history">Historique ({spins.length})</TabsTrigger>
        </TabsList>

        {/* CONFIG */}
        <TabsContent value="config">
          <Card className="p-6 space-y-4 max-w-2xl">
            {!cfg ? <p>Chargement...</p> : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-bold">Roulette activée</Label>
                    <p className="text-xs text-muted-foreground">Affiche le bouton flottant sur la page d'accueil</p>
                  </div>
                  <Switch
                    checked={cfg.enabled}
                    onCheckedChange={(v) => setDraft({ ...cfg, enabled: v })}
                  />
                </div>
                <div>
                  <Label>Titre</Label>
                  <Input value={cfg.title} onChange={(e) => setDraft({ ...cfg, title: e.target.value })} />
                </div>
                <div>
                  <Label>Sous-titre</Label>
                  <Input value={cfg.subtitle} onChange={(e) => setDraft({ ...cfg, subtitle: e.target.value })} />
                </div>
                <div>
                  <Label>Texte du bouton flottant</Label>
                  <Input value={cfg.fab_label} onChange={(e) => setDraft({ ...cfg, fab_label: e.target.value })} />
                </div>
                <div>
                  <Label>Texte du bouton "Tourner"</Label>
                  <Input value={cfg.button_label} onChange={(e) => setDraft({ ...cfg, button_label: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Délai entre 2 tours (heures)</Label>
                    <Input type="number" min={1} max={168} value={cfg.cooldown_hours}
                      onChange={(e) => setDraft({ ...cfg, cooldown_hours: parseInt(e.target.value) || 24 })} />
                  </div>
                  <div>
                    <Label>Validité du code (jours)</Label>
                    <Input type="number" min={1} max={365} value={cfg.reward_validity_days}
                      onChange={(e) => setDraft({ ...cfg, reward_validity_days: parseInt(e.target.value) || 7 })} />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    await updateConfig.mutateAsync(draft);
                    toast.success('Configuration enregistrée');
                    setDraft(null);
                  }}
                  disabled={!draft}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />Enregistrer
                </Button>
              </>
            )}
          </Card>
        </TabsContent>

        {/* SEGMENTS */}
        <TabsContent value="segments" className="space-y-4">
          <Button onClick={() => upsert.mutate({
            label: 'Nouveau lot', reward_type: 'percentage', reward_value: 5,
            probability_weight: 10, color: '#000000', text_color: '#ffffff',
            icon: '🎁', code_prefix: 'SPIN', sort_order: segments.length, is_active: true,
            min_purchase: 0, description: '',
          } as any)}>
            <Plus className="h-4 w-4 mr-2" />Ajouter un lot
          </Button>

          <div className="grid gap-3">
            {segments.map((s) => (
              <SegmentRow key={s.id} segment={s} onSave={upsert.mutate} onDelete={() => del.mutate(s.id)} />
            ))}
          </div>

          <Card className="p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              <strong>Probabilités :</strong> Plus le poids est élevé, plus le lot a de chances d'être tiré.
              Total actuel des poids actifs : <strong>{segments.filter(s => s.is_active).reduce((a, b) => a + b.probability_weight, 0)}</strong>.
              Chaque lot a une chance de (poids / total) × 100%.
            </p>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history">
          <Card className="p-4 admin-scroll-x admin-scroll-shadow min-w-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="p-2">Date</th>
                  <th className="p-2">Email/User</th>
                  <th className="p-2">Lot</th>
                  <th className="p-2">Code promo</th>
                </tr>
              </thead>
              <tbody>
                {spins.map((s: any) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{new Date(s.created_at).toLocaleString('fr-FR')}</td>
                    <td className="p-2">{s.email || s.user_id?.slice(0, 8) || '-'}</td>
                    <td className="p-2">
                      {s.roulette_segments?.icon} {s.roulette_segments?.label}
                    </td>
                    <td className="p-2 font-mono text-xs">{s.promo_code || '—'}</td>
                  </tr>
                ))}
                {spins.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Aucun tirage encore</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SegmentRow({ segment, onSave, onDelete }: {
  segment: RouletteSegment;
  onSave: (s: any) => void;
  onDelete: () => void;
}) {
  const [s, setS] = useState(segment);
  const dirty = JSON.stringify(s) !== JSON.stringify(segment);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded flex items-center justify-center text-lg"
          style={{ backgroundColor: s.color, color: s.text_color }}
        >{s.icon}</div>
        <Input className="flex-1" value={s.label} onChange={(e) => setS({ ...s, label: e.target.value })} placeholder="Libellé (ex -10%)" />
        <Switch checked={s.is_active} onCheckedChange={(v) => setS({ ...s, is_active: v })} />
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={s.reward_type} onValueChange={(v: any) => setS({ ...s, reward_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">% Réduction</SelectItem>
              <SelectItem value="fixed_amount">€ Fixe</SelectItem>
              <SelectItem value="free_shipping">Livraison gratuite</SelectItem>
              <SelectItem value="nothing">Rien</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Valeur</Label>
          <Input type="number" value={s.reward_value} onChange={(e) => setS({ ...s, reward_value: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-xs">Achat min (€)</Label>
          <Input type="number" value={s.min_purchase} onChange={(e) => setS({ ...s, min_purchase: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-xs">Poids (probabilité)</Label>
          <Input type="number" value={s.probability_weight} onChange={(e) => setS({ ...s, probability_weight: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-xs">Icône</Label>
          <Input value={s.icon} onChange={(e) => setS({ ...s, icon: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Couleur fond</Label>
          <Input type="color" value={s.color} onChange={(e) => setS({ ...s, color: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Couleur texte</Label>
          <Input type="color" value={s.text_color} onChange={(e) => setS({ ...s, text_color: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Préfixe code</Label>
          <Input value={s.code_prefix} onChange={(e) => setS({ ...s, code_prefix: e.target.value })} />
        </div>
      </div>
      <div className="mt-3">
        <Label className="text-xs">Description</Label>
        <Textarea rows={2} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} />
      </div>
      {dirty && (
        <Button size="sm" className="mt-3" onClick={() => onSave(s)}>
          <Save className="h-3 w-3 mr-1" />Enregistrer
        </Button>
      )}
    </Card>
  );
}
