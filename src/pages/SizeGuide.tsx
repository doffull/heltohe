import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShopProducts as useProducts } from '@/hooks/useShopProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SIZE_CHARTS, MORPHOLOGIES, SizeCategory } from '@/lib/sizeCharts';
import { toast } from 'sonner';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

interface Recommendation {
  recommendedSize: string;
  confidence: number;
  alternativeSize?: string;
  advice: string;
}

export default function SizeGuide() {
  const { data: products } = useProducts();
  const [category, setCategory] = useState<SizeCategory>('homme');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [age, setAge] = useState('');
  const [morphology, setMorphology] = useState('');
  const [fit, setFit] = useState<'ajuste' | 'normal' | 'ample'>('normal');
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
          fitPreference: fit,
        },
      });
      if (error) throw new Error(await edgeErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const matchingProducts = result && products
    ? products.filter((p) => p.sizes?.includes(result.recommendedSize)).slice(0, 8)
    : [];

  const chart = SIZE_CHARTS[category];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Guide des tailles</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Trouvez votre taille idéale grâce à notre assistant intelligent
        </p>
      </div>

      <Tabs value={category} onValueChange={(v) => setCategory(v as SizeCategory)} className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="homme">Homme</TabsTrigger>
          <TabsTrigger value="femme">Femme</TabsTrigger>
          <TabsTrigger value="enfant">Enfant</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* AI Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Assistant IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                    <Label className="text-xs">Poitrine (cm)</Label>
                    <Input type="number" inputMode="numeric" value={chest} onChange={(e) => setChest(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Taille (cm)</Label>
                    <Input type="number" inputMode="numeric" value={waist} onChange={(e) => setWaist(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Hanches (cm)</Label>
                    <Input type="number" inputMode="numeric" value={hips} onChange={(e) => setHips(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Morphologie</Label>
                    <Select value={morphology} onValueChange={setMorphology}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {MORPHOLOGIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Coupe</Label>
                    <Select value={fit} onValueChange={(v) => setFit(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ajuste">Ajustée</SelectItem>
                        <SelectItem value="normal">Normale</SelectItem>
                        <SelectItem value="ample">Ample</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <Button onClick={handleSubmit} disabled={loading || !height} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Analyse en cours...' : 'Trouver ma taille'}
            </Button>

            {result && (
              <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Votre taille</p>
                <p className="text-4xl font-bold">{result.recommendedSize}</p>
                {result.alternativeSize && (
                  <p className="text-xs text-muted-foreground">Alternative: {result.alternativeSize}</p>
                )}
                <p className="text-sm">{result.advice}</p>
                <p className="text-[11px] text-muted-foreground">Confiance: {result.confidence}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reference chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tableau de référence — {category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-2 pr-2">Taille</th>
                    {category === 'enfant' ? (
                      <>
                        <th className="py-2 pr-2">Hauteur</th>
                        <th className="py-2">Âge</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 pr-2">Poitrine</th>
                        <th className="py-2 pr-2">Taille</th>
                        <th className="py-2">Hanches</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {chart.map((row) => (
                    <tr key={row.size} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-bold">{row.size}</td>
                      {category === 'enfant' ? (
                        <>
                          <td className="py-2 pr-2">{row.height?.join('-')} cm</td>
                          <td className="py-2">{row.age?.join('-')} ans</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-2">{row.chest?.join('-')}</td>
                          <td className="py-2 pr-2">{row.waist?.join('-')}</td>
                          <td className="py-2">{row.hips?.join('-')}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matching products */}
      {matchingProducts.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Produits dans votre taille ({result?.recommendedSize})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {matchingProducts.map((p) => (
              <Link key={p.id} to={`/boutique/${p.id}`} className="group">
                <div className="aspect-[3/4] bg-muted overflow-hidden rounded">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <p className="text-xs font-medium mt-2 truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.salePrice ?? p.price} €</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/boutique" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          Voir toute la boutique <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
