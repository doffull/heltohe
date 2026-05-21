import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import PageBuilder from '@/components/admin/PageBuilder';
import type { PageSection } from '@/hooks/usePages';

export function HomeCustomSectionsEditor() {
  const { designSettings, updateDesignSettings } = useApp();
  const initial = ((designSettings as any).homeCustomSections || []) as PageSection[];
  const [sections, setSections] = useState<PageSection[]>(initial);

  useEffect(() => {
    const cur = (designSettings as any).homeCustomSections;
    if (Array.isArray(cur)) setSections(cur);
  }, [designSettings]);

  const save = async () => {
    await updateDesignSettings({ ...(designSettings as any), homeCustomSections: sections } as any);
    toast.success('Sections personnalisées enregistrées');
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Sections personnalisées de la page d'accueil</CardTitle>
        <Button onClick={save} size="sm" className="gap-2"><Save className="h-4 w-4" /> Enregistrer</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Ajoutez librement des sections d'images, vidéos, sliders, textes ou grilles produits. Elles s'afficheront à la suite des blocs principaux de la home.
        </p>
        <PageBuilder sections={sections} onChange={setSections} />
      </CardContent>
    </Card>
  );
}
