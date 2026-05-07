import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MORPHOLOGIES, SizeCategory } from '@/lib/sizeCharts';

interface SizeGuideAIModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  availableSizes?: string[];
  defaultCategory?: SizeCategory;
  onSizeSelected?: (size: string) => void;
}

interface Recommendation {
  recommendedSize: string;
  confidence: number;
  alternativeSize?: string;
  advice: string;
}

export function SizeGuideAIModal({
  open, onOpenChange, productName, availableSizes, defaultCategory = 'homme', onSizeSelected,
}: SizeGuideAIModalProps) {
  const [category, setCategory] = useState<SizeCategory>(defaultCategory);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [age, setAge] = useState('');
  const [morphology, setMorphology] = useState('');
  const [fitPreference, setFitPreference] = useState<'ajuste' | 'normal' | 'ample'>('normal');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Recommendation | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-size', {
        body: {
          category,
          height: height ? parseInt(height) : undefined,
          weight: weight ? parseInt(weight) : undefined,
          chest: chest ? parseInt(chest) : undefined,
          waist: waist ? parseInt(waist) : undefined,
          hips: hips ? parseInt(hips) : undefined,
          age: age ? parseInt(age) : undefined,
          morphology: morphology || undefined,
          fitPreference,
          availableSizes,
          productName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la recommandation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Trouver ma taille
          </DialogTitle>
        </DialogHeader>

        {!result && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SizeCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="homme">Homme</SelectItem>
                  <SelectItem value="femme">Femme</SelectItem>
                  <SelectItem value="enfant">Enfant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Taille (cm)</Label>
                <Input type="number" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" />
              </div>
              {category !== 'enfant' ? (
                <div>
                  <Label className="text-xs">Poids (kg)</Label>
                  <Input type="number" inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" />
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Âge</Label>
                  <Input type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="8" />
                </div>
              )}
            </div>

            {category !== 'enfant' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Poitrine</Label>
                    <Input type="number" inputMode="numeric" value={chest} onChange={(e) => setChest(e.target.value)} placeholder="cm" />
                  </div>
                  <div>
                    <Label className="text-xs">Taille</Label>
                    <Input type="number" inputMode="numeric" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="cm" />
                  </div>
                  <div>
                    <Label className="text-xs">Hanches</Label>
                    <Input type="number" inputMode="numeric" value={hips} onChange={(e) => setHips(e.target.value)} placeholder="cm" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Morphologie (optionnel)</Label>
                  <Select value={morphology} onValueChange={setMorphology}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {MORPHOLOGIES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Coupe préférée</Label>
                  <Select value={fitPreference} onValueChange={(v) => setFitPreference(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ajuste">Ajustée</SelectItem>
                      <SelectItem value="normal">Normale</SelectItem>
                      <SelectItem value="ample">Ample</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-4 py-4 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Taille recommandée</p>
              <p className="text-5xl font-bold mt-1">{result.recommendedSize}</p>
              <p className="text-xs text-muted-foreground mt-1">Confiance: {result.confidence}%</p>
            </div>
            {result.alternativeSize && (
              <p className="text-sm text-muted-foreground">
                Alternative possible: <span className="font-semibold">{result.alternativeSize}</span>
              </p>
            )}
            <p className="text-sm bg-muted/50 p-3 rounded">{result.advice}</p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {!result ? (
            <Button onClick={handleSubmit} disabled={loading || !height} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Analyse...' : 'Trouver ma taille'}
            </Button>
          ) : (
            <>
              {onSizeSelected && (
                <Button onClick={() => { onSizeSelected(result.recommendedSize); onOpenChange(false); }} className="w-full">
                  Choisir la taille {result.recommendedSize}
                </Button>
              )}
              <Button variant="outline" onClick={() => setResult(null)} className="w-full">
                Recommencer
              </Button>
            </>
          )}
          <Link to="/guide-des-tailles" className="text-xs text-muted-foreground hover:text-foreground text-center underline">
            Voir le guide complet des tailles
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
