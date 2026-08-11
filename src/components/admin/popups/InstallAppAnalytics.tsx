import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInstallPopupEvents } from '@/hooks/usePopupCampaigns';
import { DEVICE_LABELS, PLATFORM_LABELS, type DeviceKind, type PlatformKind } from '@/lib/deviceInfo';
import { Eye, MousePointerClick, Download, Percent, RefreshCw } from 'lucide-react';

const PERIODS = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
];

const DEVICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous les appareils' },
  { value: 'mobile', label: DEVICE_LABELS.mobile },
  { value: 'tablet', label: DEVICE_LABELS.tablet },
  { value: 'desktop', label: DEVICE_LABELS.desktop },
];

const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Toutes les plateformes' },
  { value: 'ios', label: PLATFORM_LABELS.ios },
  { value: 'android', label: PLATFORM_LABELS.android },
  { value: 'windows', label: PLATFORM_LABELS.windows },
  { value: 'macos', label: PLATFORM_LABELS.macos },
  { value: 'other', label: PLATFORM_LABELS.other },
];

function Kpi({ label, value, sub, Icon }: { label: string; value: string; sub?: string; Icon: any }) {
  return (
    <div className="chamfer-hud bg-card/50 p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/**
 * Statistiques des pop-ups « Installer l'app » : vues, clics sur le CTA,
 * installations confirmées, avec filtre par appareil et par plateforme (iOS…).
 */
export function InstallAppAnalytics() {
  const [days, setDays] = useState('30');
  const [device, setDevice] = useState('all');
  const [platform, setPlatform] = useState('all');
  const { data, isLoading, isFetching, refetch } = useInstallPopupEvents(Number(days));

  const events = data?.events || [];
  const campaigns = data?.campaigns || [];

  const filtered = useMemo(
    () =>
      events.filter(
        (e) => (device === 'all' || e.device === device) && (platform === 'all' || e.platform === platform),
      ),
    [events, device, platform],
  );

  const totals = useMemo(() => {
    const views = filtered.filter((e) => e.event === 'view').length;
    const clicks = filtered.filter((e) => e.event === 'click').length;
    const installs = filtered.filter((e) => e.event === 'convert').length;
    const dismiss = filtered.filter((e) => e.event === 'dismiss').length;
    const uniqueViewers = new Set(filtered.filter((e) => e.event === 'view').map((e) => e.session_id)).size;
    return { views, clicks, installs, dismiss, uniqueViewers };
  }, [filtered]);

  const byPlatform = useMemo(() => {
    const map = new Map<string, { views: number; clicks: number; installs: number }>();
    filtered.forEach((e) => {
      const key = `${e.platform}|${e.device}`;
      const row = map.get(key) || { views: 0, clicks: 0, installs: 0 };
      if (e.event === 'view') row.views += 1;
      if (e.event === 'click') row.clicks += 1;
      if (e.event === 'convert') row.installs += 1;
      map.set(key, row);
    });
    return [...map.entries()]
      .map(([key, v]) => {
        const [plat, dev] = key.split('|');
        return { platform: plat, device: dev, ...v };
      })
      .sort((a, b) => b.views - a.views);
  }, [filtered]);

  const byCampaign = useMemo(() => {
    return campaigns
      .map((c) => {
        const rows = filtered.filter((e) => e.campaign_id === c.id);
        return {
          ...c,
          views: rows.filter((e) => e.event === 'view').length,
          clicks: rows.filter((e) => e.event === 'click').length,
          installs: rows.filter((e) => e.event === 'convert').length,
        };
      })
      .sort((a, b) => b.views - a.views);
  }, [campaigns, filtered]);

  const ctr = totals.views ? ((totals.clicks / totals.views) * 100).toFixed(1) : '0.0';
  const installRate = totals.clicks ? ((totals.installs / totals.clicks) * 100).toFixed(1) : '0.0';

  return (
    <div className="chamfer-hud space-y-4 bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">Pop-ups « Installer l’app »</h2>
          <p className="text-[11px] text-muted-foreground">
            Vues, clics sur le CTA et installations confirmées, par appareil et plateforme.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={device} onValueChange={setDevice}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEVICE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => refetch()} aria-label="Rafraîchir">
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">Chargement des statistiques…</div>
      ) : campaigns.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          Aucune campagne de type « Installer l’app ». Créez-en une depuis les modèles ci-dessus.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Kpi label="Vues" value={String(totals.views)} sub={`${totals.uniqueViewers} visiteurs uniques`} Icon={Eye} />
            <Kpi label="Clics CTA" value={String(totals.clicks)} sub={`${ctr} % de taux de clic`} Icon={MousePointerClick} />
            <Kpi label="Installations" value={String(totals.installs)} sub={`${installRate} % des clics`} Icon={Download} />
            <Kpi label="Fermetures" value={String(totals.dismiss)} sub="pop-up fermée sans clic" Icon={Percent} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Par appareil / plateforme</p>
              <div className="overflow-x-auto border border-border/50">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Plateforme</th>
                      <th className="px-2 py-1.5 text-left">Appareil</th>
                      <th className="px-2 py-1.5 text-right">Vues</th>
                      <th className="px-2 py-1.5 text-right">Clics</th>
                      <th className="px-2 py-1.5 text-right">Instal.</th>
                      <th className="px-2 py-1.5 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPlatform.length === 0 ? (
                      <tr><td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">Aucun événement sur la période.</td></tr>
                    ) : (
                      byPlatform.map((r) => (
                        <tr key={`${r.platform}-${r.device}`} className="border-t border-border/40">
                          <td className="px-2 py-1.5">{PLATFORM_LABELS[r.platform as PlatformKind] || 'Inconnue'}</td>
                          <td className="px-2 py-1.5">{DEVICE_LABELS[r.device as DeviceKind] || 'Inconnu'}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.views}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.clicks}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.installs}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {r.views ? `${((r.clicks / r.views) * 100).toFixed(0)} %` : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Par campagne</p>
              <div className="overflow-x-auto border border-border/50">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Campagne</th>
                      <th className="px-2 py-1.5 text-right">Vues</th>
                      <th className="px-2 py-1.5 text-right">Clics</th>
                      <th className="px-2 py-1.5 text-right">Instal.</th>
                      <th className="px-2 py-1.5 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCampaign.map((c) => (
                      <tr key={c.id} className="border-t border-border/40">
                        <td className="max-w-[160px] truncate px-2 py-1.5">{c.name}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{c.views}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{c.clicks}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{c.installs}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {c.views ? `${((c.clicks / c.views) * 100).toFixed(0)} %` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Sur iOS/Safari, le navigateur n’expose pas d’installation automatique : le clic ouvre les
                instructions manuelles, il est donc compté en clic mais rarement en installation.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default InstallAppAnalytics;
