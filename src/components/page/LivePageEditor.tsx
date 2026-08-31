import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Undo2, X } from 'lucide-react';
import { toast } from 'sonner';
import PageRenderer from '@/components/page/PageRenderer';
import { useVisualEditor } from '@/components/visual-editor/VisualEditorProvider';
import { useAuth } from '@/context/AuthContext';
import { useUpsertPage, type Page, type PageSection } from '@/hooks/usePages';
import { Button } from '@/components/ui/button';

/**
 * Elementor-like live editing of a CMS page.
 * - Admins toggle the Visual Editor (left pencil button) then click any text to edit it.
 * - Sections can be reordered or removed from the floating section toolbar.
 * - Changes stay local until "Enregistrer" writes them back to the page.
 */
export default function LivePageEditor({ page }: { page: Page }) {
  const { isOpen, setIsDirty } = useVisualEditor();
  const { isAdmin } = useAuth();
  const upsert = useUpsertPage();
  const editable = isOpen && isAdmin;

  const [draft, setDraft] = useState<PageSection[]>(page.sections);
  const [dirty, setDirty] = useState(false);

  // Reset the draft whenever the page changes or edit mode is left without saving.
  useEffect(() => {
    setDraft(page.sections);
    setDirty(false);
  }, [page.id, page.updatedAt, page.sections]);

  useEffect(() => {
    if (!editable && dirty) {
      setDraft(page.sections);
      setDirty(false);
    }
  }, [editable]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = useMemo(
    () => [...(editable ? draft : page.sections)].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [editable, draft, page.sections],
  );

  function updateField(sectionId: string, field: string, value: string) {
    setDraft((prev) => prev.map((s) => (s.id === sectionId ? { ...s, content: { ...s.content, [field]: value } } : s)));
    setDirty(true);
    setIsDirty(true);
  }

  function moveSection(sectionId: string, dir: -1 | 1) {
    setDraft((prev) => {
      const ordered = [...prev].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const idx = ordered.findIndex((s) => s.id === sectionId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= ordered.length) return prev;
      [ordered[idx], ordered[target]] = [ordered[target], ordered[idx]];
      return ordered.map((s, i) => ({ ...s, order: i }));
    });
    setDirty(true);
    setIsDirty(true);
  }

  function deleteSection(sectionId: string) {
    setDraft((prev) =>
      prev
        .filter((s) => s.id !== sectionId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s, i) => ({ ...s, order: i })),
    );
    setDirty(true);
    setIsDirty(true);
  }

  async function save() {
    try {
      await upsert.mutateAsync({ ...page, sections: draft });
      setDirty(false);
      setIsDirty(false);
      toast.success('Page enregistrée');
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'enregistrement");
    }
  }

  function reset() {
    setDraft(page.sections);
    setDirty(false);
    setIsDirty(false);
  }

  return (
    <>
      <PageRenderer
        sections={sections}
        editable={editable}
        onUpdate={updateField}
        onMove={moveSection}
        onDelete={deleteSection}
      />

      {editable && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 rounded-full border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
            Édition live · {page.title}
          </span>
          <Button size="sm" onClick={save} disabled={!dirty || upsert.isPending} className="h-8 gap-1 text-xs uppercase tracking-wider">
            {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Enregistrer
          </Button>
          <Button size="sm" variant="outline" onClick={reset} disabled={!dirty} className="h-8 gap-1 text-xs uppercase tracking-wider">
            <Undo2 className="h-3.5 w-3.5" />
            Annuler
          </Button>
          {dirty && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-500">
              <X className="h-3 w-3" /> Non enregistré
            </span>
          )}
        </div>
      )}
    </>
  );
}
