import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PopupBannerData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  link?: string;
  buttonText?: string;
  displayDelay: number;
}

export default function PopupBanner() {
  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState<PopupBannerData | null>(null);

  const { data: banners = [] } = useQuery({
    queryKey: ['public-banners-popup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('type', 'popup')
        .eq('is_active', true)
        .order('position', { ascending: true })
        .limit(1);
      if (error) throw error;
      return (data || []).map((d: Record<string, unknown>): PopupBannerData => ({
        id: d.id as string,
        title: (d.title as string) || '',
        subtitle: (d.subtitle as string) || undefined,
        description: (d.description as string) || undefined,
        image: (d.image as string) || undefined,
        link: (d.link as string) || undefined,
        buttonText: (d.button_text as string) || undefined,
        displayDelay: (d.display_delay as number) ?? 2000,
      }));
    },
  });

  useEffect(() => {
    if (banners.length > 0) {
      const dismissed = sessionStorage.getItem(`popup-dismissed-${banners[0].id}`);
      if (!dismissed) {
        setBanner(banners[0]);
        const timer = setTimeout(() => setOpen(true), banners[0].displayDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [banners]);

  const dismiss = () => {
    setOpen(false);
    if (banner) sessionStorage.setItem(`popup-dismissed-${banner.id}`, 'true');
  };

  if (!banner) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-card border border-border rounded-lg max-w-lg w-full overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={dismiss} className="absolute top-4 right-4 z-10 bg-background/50 backdrop-blur rounded-full p-1 hover:bg-background/80 transition-colors">
              <X className="h-5 w-5" />
            </button>
            {banner.image && (
              <img src={banner.image} alt={banner.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-6 space-y-3">
              {banner.title && <h3 className="text-xl font-bold hud-text">{banner.title}</h3>}
              {banner.subtitle && <p className="text-sm text-muted-foreground">{banner.subtitle}</p>}
              {banner.description && <p className="text-sm">{banner.description}</p>}
              <div className="flex gap-3 pt-2">
                {banner.link && banner.buttonText && (
                  <Button asChild className="flex-1">
                    <a href={banner.link}>{banner.buttonText}</a>
                  </Button>
                )}
                <Button variant="outline" onClick={dismiss}>Fermer</Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
