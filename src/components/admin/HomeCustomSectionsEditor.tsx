import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import PageBuilder from '@/components/admin/PageBuilder';
import type { PageSection } from '@/hooks/usePages';

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export function HomeCustomSectionsEditor() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const initial = ((designSettings as any).homeCustomSections || []) as PageSection[];
  const [sections, setSections] = useState<PageSection[]>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const lastPersistedRef = useRef<string>(JSON.stringify(initial));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastToastRef = useRef<number>(0);
  const dirtyRef = useRef<boolean>(false);

  // Sync when external design settings change (e.g. from another tab or reload).
  // CRITICAL: ne pas écraser le state local si l'utilisateur a des modifs en cours
  // (sinon une image fraîchement uploadée disparaît avant la fin de la sauvegarde).
  useEffect(() => {
    if (dirtyRef.current) return;
    const cur = (designSettings as any).homeCustomSections;
    if (Array.isArray(cur)) {
      const serialized = JSON.stringify(cur);
      if (serialized !== JSON.stringify(sections)) {
        setSections(cur);
        lastPersistedRef.current = serialized;
        setStatus('idle');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(designSettings as any).homeCustomSections]);

  const persist = async (next: PageSection[]) => {
    try {
      setStatus('saving');
      await flushDesignSettings({ homeCustomSections: next } as any);
      lastPersistedRef.current = JSON.stringify(next);
      dirtyRef.current = false;
      setStatus('saved');
      const now = Date.now();
      if (now - lastToastRef.current > 4000) {
        toast.success('Sections enregistrées', { duration: 1500 });
        lastToastRef.current = now;
      }
      setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 2000);
    } catch (e: any) {
      setStatus('error');
      toast.error("Erreur d'enregistrement", { description: e?.message });
    }
  };

  // Global flush event from the page-level "Tout enregistrer"
  useEffect(() => {
    const handler = () => { updateDesignSettings({ homeCustomSections: sections } as any); };
    window.addEventListener('homeicons:collect', handler);
    return () => window.removeEventListener('homeicons:collect', handler);
  }, [sections, updateDesignSettings]);

  // Auto-save with debounce
  useEffect(() => {
    const serialized = JSON.stringify(sections);
    if (serialized === lastPersistedRef.current) return;
    setStatus('dirty');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persist(sections);
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  const handleManualSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    persist(sections);
  };

  const StatusBadge = () => {
    if (status === 'saving') return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Enregistrement…</span>;
    if (status === 'dirty') return <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"><AlertCircle className="h-3 w-3" /> Modifications non enregistrées</span>;
    if (status === 'saved') return <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"><Check className="h-3 w-3" /> Enregistré</span>;
    if (status === 'error') return <span className="inline-flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="h-3 w-3" /> Erreur</span>;
    return null;
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Sections personnalisées de la page d'accueil</CardTitle>
        <div className="flex items-center gap-3">
          <StatusBadge />
          <Button onClick={handleManualSave} size="sm" className="gap-2" disabled={status === 'saving'}>
            {status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Ajoutez librement des sections (images, vidéos, sliders, bannières pub, textes, grilles produits). Les modifications sont <strong>enregistrées automatiquement</strong> et apparaissent à la suite des blocs principaux de la home.
        </p>
        <PageBuilder sections={sections} onChange={setSections} />
      </CardContent>
    </Card>
  );
}
