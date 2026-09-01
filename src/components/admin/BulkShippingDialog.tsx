import { useState } from 'react';
import { Loader2, Save, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productIds: string[];
}

/** Édition en masse des données d'expédition Colissimo (poids, dimensions, type d'envoi). */
export function BulkShippingDialog({ open, onOpenChange, productIds }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [weight, setWeight] = useState('');
  const [len, setLen] = useState('');
  const [wid, setWid] = useState('');
  const [hei, setHei] = useState('');
  const [code, setCode] = useState('unchanged');
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    const updates: Record<string, unknown> = {};
    if (weight.trim()) updates.weight_grams = Math.max(1, Math.round(Number(weight)));
    if (len.trim()) updates.dim_length_cm = Number(len);
    if (wid.trim()) updates.dim_width_cm = Number(wid);
    if (hei.trim()) updates.dim_height_cm = Number(hei);
    if (code !== 'unchanged') updates.colissimo_product_code = code;

    if (Object.keys(updates).length === 0) {
      toast({ title: 'Aucune valeur à appliquer', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('products').update(updates).in('id', productIds);
    setSaving(false);

    if (error) {
      toast({ title: 'Mise à jour impossible', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['products'] });
    toast({ title: `${productIds.length} produit(s) mis à jour` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-text flex items-center gap-2">
            <Package className="h-4 w-4" /> EXPÉDITION COLISSIMO — {productIds.length} PRODUIT(S)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Poids (grammes)</Label>
            <Input type="number" min={1} value={weight} onChange={e => setWeight(e.target.value)} placeholder="ex. 500" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Longueur (cm)</Label>
              <Input type="number" min={0} value={len} onChange={e => setLen(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Largeur (cm)</Label>
              <Input type="number" min={0} value={wid} onChange={e => setWid(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Hauteur (cm)</Label>
              <Input type="number" min={0} value={hei} onChange={e => setHei(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Type d'envoi Colissimo</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">Inchangé</SelectItem>
                <SelectItem value="DOM">DOM — domicile sans signature</SelectItem>
                <SelectItem value="DOS">DOS — domicile avec signature</SelectItem>
                <SelectItem value="A2P">A2P — point de retrait</SelectItem>
                <SelectItem value="COLR">COLR — retour</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Les champs laissés vides ne sont pas modifiés.
          </p>
          <Button onClick={apply} disabled={saving || productIds.length === 0} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Appliquer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
