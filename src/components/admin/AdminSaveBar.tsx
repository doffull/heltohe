import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Save, Loader2, Check, AlertTriangle, History, RotateCcw, X } from 'lucide-react';
import { useDesignAutosave } from '@/hooks/useDesignAutosave';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function fmtTime(ts: number | null | undefined) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleTimeString('fr-FR'); } catch { return ''; }
}
function fmtBytes(n: number) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

interface Props {
  className?: string;
  sticky?: boolean;
  label?: string;
}

export function AdminSaveBar({ className, sticky = true, label }: Props) {
  const { status, lastSavedAt, lastError, history, hasLocalBackup, saveNow, restoreBackup, discardBackup } = useDesignAutosave();
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveNow();
      toast.success('Enregistré', { duration: 1400 });
    } catch (e: any) {
      toast.error("Échec de l'enregistrement", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = () => {
    if (restoreBackup()) {
      toast.success('Backup local restauré — pense à enregistrer.');
    } else {
      toast.info('Aucun backup local disponible.');
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card/80 backdrop-blur px-3 py-2 shadow-sm',
        sticky && 'sticky top-2 z-30',
        className,
      )}
      aria-live="polite"
    >
      <div className="flex items-center gap-2 min-w-0">
        {status === 'saving' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…
          </span>
        )}
        {status === 'dirty' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" /> Modifications non enregistrées
          </span>
        )}
        {status === 'saved' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Enregistré {lastSavedAt ? `à ${fmtTime(lastSavedAt)}` : ''}
          </span>
        )}
        {status === 'error' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> Erreur — {lastError || 'échec'}
          </span>
        )}
        {status === 'idle' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 opacity-60" />
            Autosave actif{lastSavedAt ? ` · dernier ${fmtTime(lastSavedAt)}` : ''}
          </span>
        )}
        {label && <span className="text-xs text-muted-foreground truncate hidden md:inline">· {label}</span>}
      </div>

      <div className="flex items-center gap-1.5">
        {hasLocalBackup && (
          <>
            <Button type="button" size="sm" variant="outline" onClick={handleRestore} className="h-8 gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Restaurer backup
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={discardBackup} className="h-8 w-8" title="Ignorer le backup">
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5">
              <History className="h-3.5 w-3.5" /> Historique
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3">
            <div className="text-xs font-bold uppercase tracking-wider mb-2">Derniers enregistrements</div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucun enregistrement pour l'instant.</p>
            ) : (
              <ul className="space-y-1.5 max-h-64 overflow-auto">
                {history.map((h) => (
                  <li key={h.ts} className="flex items-center justify-between gap-2 text-xs border-b border-border/40 last:border-0 pb-1.5">
                    <span className={cn('inline-flex items-center gap-1.5', h.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                      {h.ok ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {fmtTime(h.ts)}
                    </span>
                    <span className="text-muted-foreground">
                      {h.ok ? fmtBytes(h.bytes) : (h.error?.slice(0, 40) || 'erreur')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={busy || status === 'saving'}
          className="h-8 gap-1.5"
        >
          {busy || status === 'saving'
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Save className="h-3.5 w-3.5" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

export default AdminSaveBar;
