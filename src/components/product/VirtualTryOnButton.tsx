import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Upload, Loader2, RefreshCw, X, Camera, ArrowRight, ArrowLeft, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  product: any;
  selectedColor?: string | null;
  className?: string;
  variant?: 'floating' | 'inline';
}

type Step = 'photo' | 'body' | 'result';
type Morphology = 'slim' | 'regular' | 'athletic' | 'curvy';
type Framing = 'full' | 'hips' | 'bust';

const STORAGE_KEY = 'lvtk:vto-state';

interface PersistedState {
  step: Step;
  userPhoto: string | null;
  heightCm: string;
  weightKg: string;
  morphology: Morphology;
  gender: 'femme' | 'homme' | 'autre';
  framing: Framing;
}

export default function VirtualTryOnButton({ product, selectedColor, className, variant = 'floating' }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('photo');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [morphology, setMorphology] = useState<Morphology>('regular');
  const [gender, setGender] = useState<'femme' | 'homme' | 'autre'>('femme');
  const [framing, setFraming] = useState<Framing>('full');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Restore state on mount (survives mobile camera remount)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as PersistedState;
        setStep(s.step); setUserPhoto(s.userPhoto);
        setHeightCm(s.heightCm); setWeightKg(s.weightKg);
        setMorphology(s.morphology); setGender(s.gender); setFraming(s.framing);
        if (s.userPhoto) setOpen(true);
      }
    } catch {}
  }, []);

  // Persist state
  useEffect(() => {
    if (!open) return;
    try {
      const s: PersistedState = { step, userPhoto, heightCm, weightKg, morphology, gender, framing };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }, [open, step, userPhoto, heightCm, weightKg, morphology, gender, framing]);

  const reset = () => {
    setStep('photo'); setUserPhoto(null); setResultImage(null); setLoading(false);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Format non supporté', description: 'Veuillez choisir une image.', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Image trop lourde', description: 'Max 8 Mo.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUserPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }, [toast]);

  const generate = async () => {
    if (!userPhoto) return;
    setLoading(true);
    setStep('result');
    try {
      const { data, error } = await supabase.functions.invoke('virtual-tryon', {
        body: {
          userPhoto,
          productImage: product.image,
          productName: product.name,
          productCategory: product.category,
          selectedColor,
          morphology,
          heightCm: heightCm ? Number(heightCm) : undefined,
          weightKg: weightKg ? Number(weightKg) : undefined,
          gender,
          framing,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResultImage((data as any).image);
    } catch (e: any) {
      console.error('[virtual-tryon] generation failed:', e);
      toast({ title: 'Essai impossible', description: e?.message || 'Erreur inconnue', variant: 'destructive' });
      setStep('body');
    } finally {
      setLoading(false);
    }
  };




  const handleOpenChange = (o: boolean) => {
    if (!o && loading) return; // block close while generating
    setOpen(o);
    if (!o) reset();
  };

  return (
    <>
      {variant === 'floating' ? (
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'fixed right-4 bottom-24 md:bottom-8 z-40 chamfer-hud bg-foreground text-background px-4 py-3 flex items-center gap-2 shadow-2xl font-bold text-xs uppercase tracking-widest hover:bg-primary transition-colors',
            className,
          )}
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Essayer virtuellement</span>
          <span className="sm:hidden">Essayer</span>
        </motion.button>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          variant="outline"
          className={cn('w-full chamfer-hud uppercase tracking-widest font-bold gap-2', className)}
        >
          <Sparkles className="h-4 w-4" /> Essayer virtuellement
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl chamfer-hud-lg bg-background border-border p-0 overflow-hidden">
          <DialogTitle className="sr-only">Essai virtuel</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-bold text-xs uppercase tracking-widest hud-text">Essai virtuel IA</span>
            </div>
            <div className="flex items-center gap-1.5">
              {(['photo','body','result'] as Step[]).map((s, i) => (
                <span
                  key={s}
                  className={cn(
                    'h-1.5 transition-all',
                    s === step ? 'w-6 bg-primary' : i < ['photo','body','result'].indexOf(step) ? 'w-3 bg-primary/60' : 'w-3 bg-border',
                  )}
                />
              ))}
            </div>
          </div>

          <div className="p-5 max-h-[75vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              {step === 'photo' && (
                <motion.div key="photo" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <h3 className="text-lg font-bold mb-1">1. Votre photo</h3>
                  <p className="text-xs text-muted-foreground mb-4">Photo en pied, fond simple, lumière naturelle pour un meilleur rendu.</p>

                  {/* File picker (galerie / ordinateur) */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                  />
                  {/* Camera picker (mobile uniquement) */}
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                  />

                  {userPhoto ? (
                    <div className="relative chamfer-hud overflow-hidden bg-card/30 aspect-[3/4] max-h-80 mx-auto">
                      <img src={userPhoto} alt="Vous" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setUserPhoto(null)}
                        className="absolute top-2 right-2 bg-background/90 p-1.5 chamfer-hud-sm hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault(); setDragOver(false);
                        const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
                      }}
                      className={cn(
                        'w-full chamfer-hud border-2 border-dashed bg-card/20 transition-colors p-8 flex flex-col items-center gap-4',
                        dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60',
                      )}
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-bold text-center">Glissez-déposez votre photo ici</p>
                      <p className="text-xs text-muted-foreground -mt-3">JPG, PNG · max 8 Mo</p>

                      <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                        <Button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          variant="outline"
                          className="flex-1 chamfer-hud-sm gap-2"
                        >
                          <Upload className="h-4 w-4" /> Choisir un fichier
                        </Button>
                        <Button
                          type="button"
                          onClick={() => cameraRef.current?.click()}
                          variant="outline"
                          className="flex-1 chamfer-hud-sm gap-2 md:hidden"
                        >
                          <Camera className="h-4 w-4" /> Prendre une photo
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-5">
                    <Button type="button" onClick={() => setStep('body')} disabled={!userPhoto} className="chamfer-hud-sm gap-2">
                      Suivant <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 'body' && (
                <motion.div key="body" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <h3 className="text-lg font-bold mb-1">2. Corpulence & cadrage</h3>
                  <p className="text-xs text-muted-foreground mb-4">Aide l'IA à ajuster le vêtement à votre silhouette.</p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Taille (cm)</Label>
                      <Input type="number" inputMode="numeric" placeholder="170" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="chamfer-hud-sm" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Poids (kg)</Label>
                      <Input type="number" inputMode="numeric" placeholder="65" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="chamfer-hud-sm" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label className="text-xs uppercase tracking-wider mb-2 block">Genre</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['femme','homme','autre'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={cn('chamfer-hud-sm py-2 text-sm font-bold uppercase tracking-wider border transition-colors',
                            gender === g ? 'bg-foreground text-background border-foreground' : 'bg-card/30 border-border hover:border-primary')}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label className="text-xs uppercase tracking-wider mb-2 block">Morphologie</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {([
                        { v: 'slim', l: 'Fine' },
                        { v: 'regular', l: 'Standard' },
                        { v: 'athletic', l: 'Athlétique' },
                        { v: 'curvy', l: 'Pulpeuse' },
                      ] as { v: Morphology; l: string }[]).map((m) => (
                        <button
                          key={m.v}
                          type="button"
                          onClick={() => setMorphology(m.v)}
                          className={cn('chamfer-hud-sm py-2 text-xs font-bold uppercase tracking-wider border transition-colors',
                            morphology === m.v ? 'bg-foreground text-background border-foreground' : 'bg-card/30 border-border hover:border-primary')}
                        >
                          {m.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label className="text-xs uppercase tracking-wider mb-2 block">Cadrage</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { v: 'full', l: 'Plein pied' },
                        { v: 'hips', l: 'Hanches' },
                        { v: 'bust', l: 'Buste' },
                      ] as { v: Framing; l: string }[]).map((f) => (
                        <button
                          key={f.v}
                          type="button"
                          onClick={() => setFraming(f.v)}
                          className={cn('chamfer-hud-sm py-2 text-xs font-bold uppercase tracking-wider border transition-colors',
                            framing === f.v ? 'bg-foreground text-background border-foreground' : 'bg-card/30 border-border hover:border-primary')}
                        >
                          {f.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between mt-5">
                    <Button type="button" onClick={() => setStep('photo')} variant="outline" className="chamfer-hud-sm gap-2">
                      <ArrowLeft className="h-4 w-4" /> Retour
                    </Button>
                    <Button type="button" onClick={generate} className="chamfer-hud-sm gap-2">
                      <Sparkles className="h-4 w-4" /> Générer l'essai
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 'result' && (
                <motion.div key="result" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <h3 className="text-lg font-bold mb-1">3. Votre essayage</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {loading ? "L'IA habille votre photo…" : 'Résultat généré par IA — peut différer du rendu réel.'}
                  </p>

                  <div className="chamfer-hud bg-card/30 aspect-[3/4] max-h-[55vh] mx-auto overflow-hidden flex items-center justify-center relative">
                    {loading && (
                      <div className="flex flex-col items-center gap-3 p-6">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-xs hud-text uppercase tracking-widest">Génération en cours…</p>
                        <p className="text-[10px] text-muted-foreground">5 à 20 secondes</p>
                      </div>
                    )}
                    {!loading && resultImage && (
                      <img src={resultImage} alt="Essai virtuel" className="w-full h-full object-contain" />
                    )}
                  </div>

                  {!loading && resultImage && (
                    <div className="flex flex-wrap gap-2 justify-center mt-5">
                      <Button type="button" onClick={download} variant="outline" className="chamfer-hud-sm gap-2">
                        <Download className="h-4 w-4" /> Télécharger
                      </Button>
                      <Button type="button" onClick={() => { setResultImage(null); setStep('body'); generate(); }} variant="outline" className="chamfer-hud-sm gap-2">
                        <RefreshCw className="h-4 w-4" /> Refaire
                      </Button>
                      <Button type="button" onClick={() => { setOpen(false); reset(); }} className="chamfer-hud-sm gap-2">
                        Terminer
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
