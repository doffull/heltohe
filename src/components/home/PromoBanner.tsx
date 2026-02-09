import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PromoBannerData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  link?: string;
  buttonText?: string;
}

export default function PromoBanner() {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: banners = [] } = useQuery({
    queryKey: ['public-banners-promo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('type', 'promo')
        .eq('is_active', true)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data || []).map((d): PromoBannerData => ({
        id: d.id,
        title: d.title || '',
        subtitle: d.subtitle || undefined,
        description: d.description || undefined,
        image: d.image || undefined,
        link: d.link || undefined,
        buttonText: d.button_text || undefined,
      }));
    },
  });

  const visible = banners.filter(b => !dismissed.includes(b.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-0">
      <AnimatePresence>
        {visible.map(banner => (
          <motion.div
            key={banner.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative overflow-hidden bg-primary text-primary-foreground"
          >
            <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-4 text-center">
              {banner.title && <span className="font-bold text-sm uppercase tracking-wider">{banner.title}</span>}
              {banner.subtitle && <span className="text-sm opacity-90">{banner.subtitle}</span>}
              {banner.link && banner.buttonText && (
                <a href={banner.link} className="text-xs font-bold underline underline-offset-2 hover:opacity-80">
                  {banner.buttonText}
                </a>
              )}
              <button onClick={() => setDismissed(p => [...p, banner.id])} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
