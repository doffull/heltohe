import { useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

const POSES = [
  'de face, debout, bras le long du corps',
  'de trois-quarts vers la gauche',
  'de trois-quarts vers la droite',
  'de profil',
  'mains dans les poches',
  'en marche vers l’objectif',
  'assis(e) décontracté(e)',
  'bras croisés',
];

const EXPRESSIONS = [
  'neutre',
  'sourire léger',
  'sourire franc',
  'regard sérieux',
  'regard caméra assuré',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  imageUrl: string;
  /** Remplacer l'image d'origine par le résultat. */
  onReplace: (url: string) => void;
  /** Ajouter le résultat à la galerie. */
  onAddToGallery?: (url: string) => void;
}

/**
 * Retouche IA de pose et d'expression d'une photo produit existante.
 * Réservé aux super admins : le vêtement, le mannequin et le décor sont préservés.
 */
export function AiPoseEditorDialog({ open, onOpenChange, imageUrl, onReplace, onAddToGallery }: Props) {
  const [pose, setPose] = useState(POSES[1]);
  const [expression, setExpression] = useState(EXPRESSIONS[1]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('image-pose-edit', {
        body: { imageUrl, pose, expression, extraNotes: notes.trim() || undefined },
      });
      if (error) throw new Error(await edgeErrorMessage(error));
      const res = data as { image?: string; error?: string };
      if (res?.error) throw new Error(res.error);
      if (!res?.image) throw new Error('Aucune image générée');
      setResult(res.image);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Génération impossible');
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setResult(null);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="hud-text text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            IA — Pose &amp; expression
          </DialogTitle>
        </DialogHeader>

        <p className="text-[11px] text-muted-foreground">
          Seules la posture et l’expression du visage changent. Le vêtement, le mannequin, le décor et le
          cadrage sont préservés à l’identique.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="hud-text text-[10px]">Image d’origine</Label>
            <div className="border border-border/30 bg-secondary/30 aspect-[3/4] overflow-hidden">
              <img src={imageUrl} alt="Origine" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="hud-text text-[10px]">Résultat</Label>
            <div className="border border-border/30 bg-secondary/30 aspect-[3/4] overflow-hidden flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Génération en cours…
                </div>
              ) : result ? (
                <img src={result} alt="Résultat" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[11px] text-muted-foreground px-4 text-center">
                  Choisissez une pose et une expression puis lancez la génération.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="hud-text text-[10px]">Pose</Label>
            <div className="flex flex-wrap gap-1.5">
              {POSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPose(p)}
                  className={`text-[10px] px-2 py-1 border transition-colors ${
                    pose === p
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border/40 text-muted-foreground hover:border-border'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Input
              value={pose}
              onChange={(e) => setPose(e.target.value)}
              placeholder="Décrivez librement la pose"
              className="h-8 text-xs bg-secondary/50 border-border/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="hud-text text-[10px]">Expression du visage</Label>
            <div className="flex flex-wrap gap-1.5">
              {EXPRESSIONS.map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => setExpression(x)}
                  className={`text-[10px] px-2 py-1 border transition-colors ${
                    expression === x
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border/40 text-muted-foreground hover:border-border'
                  }`}
                >
                  {x}
                </button>
              ))}
            </div>
            <Input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Décrivez librement l’expression"
              className="h-8 text-xs bg-secondary/50 border-border/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="hud-text text-[10px]">Précision optionnelle</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : regard vers la gauche, main droite ajustant le col"
              className="h-8 text-xs bg-secondary/50 border-border/30"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" onClick={generate} disabled={loading} className="h-9 text-xs">
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            {result ? 'Régénérer' : 'Générer'}
          </Button>
          {result && (
            <>
              <Button
                type="button"
                variant="secondary"
                className="h-9 text-xs"
                onClick={() => {
                  onReplace(result);
                  toast.success('Image remplacée');
                  close();
                }}
              >
                Remplacer l’image
              </Button>
              {onAddToGallery && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs"
                  onClick={() => {
                    onAddToGallery(result);
                    toast.success('Ajoutée à la galerie');
                    close();
                  }}
                >
                  Ajouter à la galerie
                </Button>
              )}
            </>
          )}
          <Button type="button" variant="ghost" className="h-9 text-xs" onClick={close}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ButtonProps {
  imageUrl?: string | null;
  onReplace: (url: string) => void;
  onAddToGallery?: (url: string) => void;
  className?: string;
  compact?: boolean;
}

/** Bouton déclencheur, visible uniquement pour les super admins. */
export function AiPoseButton({ imageUrl, onReplace, onAddToGallery, className, compact }: ButtonProps) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const valid = typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl);
  if (!isAdmin || !valid) return null;

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="IA : pose & expression"
          className={`text-[10px] px-1 text-primary hover:text-primary/80 ${className || ''}`}
        >
          <Wand2 className="h-3 w-3" />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className={`h-8 text-xs ${className || ''}`}
        >
          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
          IA : Pose &amp; expression
        </Button>
      )}
      <AiPoseEditorDialog
        open={open}
        onOpenChange={setOpen}
        imageUrl={imageUrl as string}
        onReplace={onReplace}
        onAddToGallery={onAddToGallery}
      />
    </>
  );
}

export default AiPoseEditorDialog;
