import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useSaveDesignSettings } from '@/hooks/useDesignSettings';
import { useVisualEditor } from './VisualEditorProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, Layers, Palette, LayoutGrid, Image } from 'lucide-react';
import { HeroEditorTab } from './tabs/HeroEditorTab';
import { ColorsEditorTab } from './tabs/ColorsEditorTab';
import { SectionsEditorTab } from './tabs/SectionsEditorTab';
import { LayoutEditorTab } from './tabs/LayoutEditorTab';

export function VisualEditorPanel() {
  const { isOpen, activeTab, setActiveTab, isDirty, setIsDirty } = useVisualEditor();
  const { designSettings } = useApp();
  const saveSettings = useSaveDesignSettings();
  const { toast } = useToast();

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
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Éditeur Live</span>
              <span className="flex items-center gap-1 text-[9px] font-bold bg-green-500/15 text-green-600 border border-green-500/30 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                LIVE
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={saveSettings.isPending}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded transition-all ${isDirty ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground'}`}
            >
              <Save className="w-3 h-3" />
              {saveSettings.isPending ? 'Saving...' : 'Sauvegarder'}
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
            </button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-4 gap-0 h-10 rounded-none border-b border-border bg-muted/20 flex-shrink-0 px-0">
              <TabsTrigger value="hero" className="flex flex-col items-center gap-0.5 text-[9px] font-semibold h-full rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-r border-border">
                <Image className="w-3 h-3" />
                Hero
              </TabsTrigger>
              <TabsTrigger value="colors" className="flex flex-col items-center gap-0.5 text-[9px] font-semibold h-full rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-r border-border">
                <Palette className="w-3 h-3" />
                Couleurs
              </TabsTrigger>
              <TabsTrigger value="sections" className="flex flex-col items-center gap-0.5 text-[9px] font-semibold h-full rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-r border-border">
                <Layers className="w-3 h-3" />
                Sections
              </TabsTrigger>
              <TabsTrigger value="layout" className="flex flex-col items-center gap-0.5 text-[9px] font-semibold h-full rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none">
                <LayoutGrid className="w-3 h-3" />
                Mise en page
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="hero" className="mt-0 p-3">
                <HeroEditorTab />
              </TabsContent>
              <TabsContent value="colors" className="mt-0 p-3">
                <ColorsEditorTab />
              </TabsContent>
              <TabsContent value="sections" className="mt-0 p-3">
                <SectionsEditorTab />
              </TabsContent>
              <TabsContent value="layout" className="mt-0 p-3">
                <LayoutEditorTab />
              </TabsContent>
            </div>
          </Tabs>

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
