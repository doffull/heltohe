import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MannequinGender = 'femme' | 'homme' | 'enfant' | 'unisexe';
export type MannequinAge = 'enfant' | 'ado' | 'adulte' | 'senior';
export type MannequinMorphology = 'slim' | 'regular' | 'athletic' | 'curvy';

export interface Mannequin {
  id: string;
  name: string;
  imageUrl: string;
  gender: MannequinGender;
  ageRange: MannequinAge;
  /** Identifiant de carnation (very-light → deep) */
  skinTone: string;
  morphology: MannequinMorphology;
  heightCm?: number | null;
  fitNotes?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const SKIN_TONES: { id: string; label: string; hex: string }[] = [
  { id: 'very-light', label: 'Très claire', hex: '#F6DBC6' },
  { id: 'light', label: 'Claire', hex: '#EDC1A0' },
  { id: 'medium', label: 'Medium', hex: '#D2A074' },
  { id: 'tan', label: 'Mate', hex: '#B07A50' },
  { id: 'brown', label: 'Brune', hex: '#8A5A3B' },
  { id: 'deep', label: 'Foncée', hex: '#5B3826' },
];

export const MORPHOLOGY_LABELS: Record<MannequinMorphology, string> = {
  slim: 'Mince',
  regular: 'Standard',
  athletic: 'Athlétique',
  curvy: 'Ronde',
};

export const AGE_LABELS: Record<MannequinAge, string> = {
  enfant: 'Enfant',
  ado: 'Ado',
  adulte: 'Adulte',
  senior: 'Senior',
};

export const GENDER_LABELS: Record<MannequinGender, string> = {
  femme: 'Femme',
  homme: 'Homme',
  enfant: 'Enfant',
  unisexe: 'Unisexe',
};

function dbToMannequin(d: any): Mannequin {
  return {
    id: d.id,
    name: d.name,
    imageUrl: d.image_url,
    gender: (d.gender || 'unisexe') as MannequinGender,
    ageRange: (d.age_range || 'adulte') as MannequinAge,
    skinTone: d.skin_tone || 'medium',
    morphology: (d.morphology || 'regular') as MannequinMorphology,
    heightCm: d.height_cm,
    fitNotes: d.fit_notes,
    sortOrder: d.sort_order ?? 0,
    isActive: d.is_active ?? true,
  };
}

function toDb(m: Partial<Mannequin>) {
  const out: Record<string, unknown> = {};
  if (m.name !== undefined) out.name = m.name;
  if (m.imageUrl !== undefined) out.image_url = m.imageUrl;
  if (m.gender !== undefined) out.gender = m.gender;
  if (m.ageRange !== undefined) out.age_range = m.ageRange;
  if (m.skinTone !== undefined) out.skin_tone = m.skinTone;
  if (m.morphology !== undefined) out.morphology = m.morphology;
  if (m.heightCm !== undefined) out.height_cm = m.heightCm || null;
  if (m.fitNotes !== undefined) out.fit_notes = m.fitNotes || null;
  if (m.sortOrder !== undefined) out.sort_order = m.sortOrder;
  if (m.isActive !== undefined) out.is_active = m.isActive;
  return out;
}

export function useMannequins(includeInactive = false) {
  return useQuery({
    queryKey: ['mannequins', includeInactive],
    queryFn: async () => {
      let q = supabase.from('mannequins' as any).select('*').order('sort_order', { ascending: true });
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(dbToMannequin);
    },
    staleTime: 60_000,
  });
}

export function useUpsertMannequin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<Mannequin> & { id?: string }) => {
      if (m.id) {
        const { error } = await supabase.from('mannequins' as any).update(toDb(m)).eq('id', m.id);
        if (error) throw error;
        return m.id;
      }
      const { data, error } = await supabase
        .from('mannequins' as any)
        .insert(toDb(m) as any)
        .select('id')
        .single();
      if (error) throw error;
      return (data as any)?.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mannequins'] }),
  });
}

export function useDeleteMannequin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mannequins' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mannequins'] }),
  });
}
