import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Share, Plus, MoreVertical, Monitor } from 'lucide-react';
import { useInstallApp } from '@/hooks/useInstallApp';

/**
 * Bouton « Télécharger l'application » + instructions par plateforme.
 * Ouvre le prompt natif si disponible, sinon affiche la marche à suivre.
 */
export function InstallAppButton({ className }: { className?: string }) {
  const { canPrompt, installed, install, isIos, isMobile } = useInstallApp();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onHelp = () => setHelp(true);
    window.addEventListener('hmp:show-install-help', onHelp);
    return () => window.removeEventListener('hmp:show-install-help', onHelp);
  }, []);

  const onClick = async () => {
    if (canPrompt) {
      const ok = await install();
      if (ok) return;
    }
    setHelp(true);
  };

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={
          className ||
          'flex items-center gap-2 border border-border/60 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground chamfer-hud-sm'
        }
      >
        <Download className="h-3.5 w-3.5" />
        Télécharger l’application
      </button>

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">Installer l’application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <img src="/icon-192.png" alt="" className="h-12 w-12 border border-border object-contain" />
              <p className="text-xs text-muted-foreground">
                Ajoutez le site à votre écran d’accueil : ouverture plein écran, accès instantané.
              </p>
            </div>

            {isIos ? (
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Share className="h-4 w-4 shrink-0" /> 1. Touchez « Partager » dans Safari</li>
                <li className="flex items-center gap-2"><Plus className="h-4 w-4 shrink-0" /> 2. Choisissez « Sur l’écran d’accueil »</li>
              </ol>
            ) : isMobile ? (
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><MoreVertical className="h-4 w-4 shrink-0" /> 1. Ouvrez le menu du navigateur</li>
                <li className="flex items-center gap-2"><Plus className="h-4 w-4 shrink-0" /> 2. « Installer l’application » / « Ajouter à l’écran d’accueil »</li>
              </ol>
            ) : (
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Monitor className="h-4 w-4 shrink-0" /> 1. Cliquez sur l’icône d’installation dans la barre d’adresse</li>
                <li className="flex items-center gap-2"><Plus className="h-4 w-4 shrink-0" /> 2. Confirmez « Installer »</li>
              </ol>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default InstallAppButton;
