import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PageBuilder from '@/components/admin/PageBuilder';
import type { PageSection } from '@/hooks/usePages';

export function HomeCustomSectionsEditor() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const initial = ((designSettings as any).homeCustomSections || []) as PageSection[];
  const [sections, setSections] = useState<PageSection[]>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cur = (designSettings as any).homeCustomSections;
    if (Array.isArray(cur)) setSections(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(designSettings as any).homeCustomSections]);

  const save = async () => {
    try {
      setSaving(true);
      updateDesignSettings({ homeCustomSections: sections } as any);
      await flushDesignSettings();
      toast.success('Sections enregistrées — elles sont visibles sur la page d\'accueil.');
    } catch (e: any) {
      toast.error('Erreur lors de l\'enregistrement', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Sections personnalisées de la page d'accueil</CardTitle>
        <Button onClick={save} size="sm" className="gap-2" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Ajoutez librement des sections (images, vidéos, sliders, textes, grilles produits). Glissez-déposez vos médias directement. Après « Enregistrer », les sections apparaissent automatiquement à la suite des blocs principaux de la home.
        </p>
        <PageBuilder sections={sections} onChange={setSections} />
      </CardContent>
    </Card>
  );
}
