import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Info } from 'lucide-react';

export function FabLivePreview() {
  const { designSettings } = useApp();
  const cfg = (designSettings as any).unifiedFab || {};
  const mode = cfg.mode || 'socle';

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span>Aperçu live · positionnement</span>
          <Button asChild size="sm" variant="outline" className="gap-1">
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Ouvrir la home (drag admin)
            </a>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs flex gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p>
              Le déplacement des boutons se fait <strong>directement sur la page d'accueil</strong> en mode admin
              (un anneau bleu apparaît autour de chaque bouton déplaçable). Cliquez « Ouvrir la home »
              ci-dessus puis glissez les éléments où vous voulez. La position est sauvegardée automatiquement.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="border rounded p-2"><strong>Mode actif :</strong> {mode}</div>
          <div className="border rounded p-2"><strong>Couleur halo :</strong> {cfg.accentColor || '#ffffff'}</div>
        </div>
        {cfg.dockPos_desktop && (
          <div className="text-xs text-muted-foreground">
            Dock desktop : {cfg.dockPos_desktop.corner} {cfg.dockPos_desktop.x}/{cfg.dockPos_desktop.y}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
