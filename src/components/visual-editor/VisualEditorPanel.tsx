import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useSaveDesignSettings } from '@/hooks/useDesignSettings';
import { useVisualEditor } from './VisualEditorProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, Layers, Palette, LayoutGrid, Image, MousePointerClick, Undo2, Redo2 } from 'lucide-react';
import { HeroEditorTab } from './tabs/HeroEditorTab';
import { ColorsEditorTab } from './tabs/ColorsEditorTab';
import { SectionsEditorTab } from './tabs/SectionsEditorTab';
import { LayoutEditorTab } from './tabs/LayoutEditorTab';
import { HeroCtaEditorTab } from './tabs/HeroCtaEditorTab';
import { PageSwitcher } from './PageSwitcher';
import { useDesignHistory } from '@/hooks/useDesignHistory';

export function VisualEditorPanel() {
  const { isOpen, activeTab, setActiveTab, isDirty, setIsDirty, currentPageKey } = useVisualEditor();
  const { designSettings } = useApp();
  const saveSettings = useSaveDesignSettings();
  const { toast } = useToast();
  const { canUndo, canRedo, undo, redo, past, future } = useDesignHistory(isOpen);

  function handleSave() {
    saveSettings.mutate(designSettings, {
      onSuccess: () => {
        setIsDirty(false);
        toast({ title: '✓ Modifications sauvegardées', description: 'Le design a été mis à jour.' });
      },
      onError: () => {
        toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
      }
    });
  }

  const isHome = currentPageKey === 'home';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -340, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 top-0 h-screen w-full sm:w-80 z-[75] flex flex-col bg-background border-r border-border shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold tracking-tight truncate">Éditeur Live</span>
              <span className="flex items-center gap-1 text-[9px] font-bold bg-green-500/15 text-green-600 border border-green-500/30 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                title={`Annuler${past.length ? ` (${past.length})` : ''} · Ctrl+Z`}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                title={`Rétablir${future.length ? ` (${future.length})` : ''} · Ctrl+Shift+Z`}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSave}
                disabled={saveSettings.isPending}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded transition-all ml-1 ${isDirty ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground'}`}
              >
                <Save className="w-3 h-3" />
                {saveSettings.isPending ? '…' : 'Sauver'}
                {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
              </button>
            </div>
          </div>

          {/* Page switcher */}
          <PageSwitcher />

          {/* Tabs */}
          {isHome ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-5 gap-0 h-10 rounded-none border-b border-border bg-muted/20 flex-shrink-0 px-0">
                <TabsTrigger value="hero" className="flex flex-col items-center gap-0.5 text-[9px] font-semibold h-full rounded-none data-[state=active]:bg-background border-r border-border">
                  <Image className="w-3 h-3" />
                  Hero
                </TabsTrigger>
                <TabsTrigger value="cta" className="flex flex-col items-center gap-0.5 text-[9px] font-semibold h-full rounded-none data-[state=active]:bg-background border-r border-border">
                  <MousePointerClick className="w-3 h-3" />
                  CTA
                </TabsTrigger>
                <TabsTrigger value="colors" className="flex flex-col items-center gap-0.5 text-[9px] font-semibold h-full rounded-none data-[state=active]:bg-background border-r border-border">
                  <Palette className="w-3 h-3" />
                  Couleurs
                </TabsTrigger>
                <TabsTrigger value="sections" className="flex flex-col items-center gap-0.5 text-[9px] font-semibold h-full rounded-none data-[state=active]:bg-background border-r border-border">
                  <Layers className="w-3 h-3" />
                  Sections
                </TabsTrigger>
                <TabsTrigger value="layout" className="flex flex-col items-center gap-0.5 text-[9px] font-semibold h-full rounded-none data-[state=active]:bg-background">
                  <LayoutGrid className="w-3 h-3" />
                  Layout
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="hero" className="mt-0 p-3"><HeroEditorTab /></TabsContent>
                <TabsContent value="cta" className="mt-0 p-3"><HeroCtaEditorTab /></TabsContent>
                <TabsContent value="colors" className="mt-0 p-3"><ColorsEditorTab /></TabsContent>
                <TabsContent value="sections" className="mt-0 p-3"><SectionsEditorTab /></TabsContent>
                <TabsContent value="layout" className="mt-0 p-3"><LayoutEditorTab /></TabsContent>
              </div>
            </Tabs>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="p-3 border border-dashed border-border rounded bg-muted/20">
                <p className="text-xs font-semibold mb-1">Édition de page</p>
                <p className="text-[11px] text-muted-foreground">
                  Vous éditez actuellement la page sélectionnée. Les contrôles d'image, de texte et de boutons sont disponibles directement sur la page (survolez les éléments).
                </p>
              </div>
              <div className="p-3 border border-border rounded">
                <p className="text-[11px] text-muted-foreground">
                  Pour des réglages globaux (couleurs, typographies, layout), revenez à la page <strong>Accueil</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex-shrink-0">
            <p className="text-[10px] text-muted-foreground text-center">
              Les changements s'appliquent en temps réel →{' '}
              <a href="/admin" className="underline hover:text-foreground transition-colors">Admin complet</a>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
