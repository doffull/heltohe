import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { subscribeToNewsletter } from '@/hooks/useNewsletterPopups';
import { cn } from '@/lib/utils';
import { useParallax } from '@/hooks/useParallax';
import type { PageSection } from '@/hooks/usePages';

const HOVER_CLASSES: Record<string, string> = {
  zoom: 'hover:scale-110',
  'zoom-out': 'scale-110 hover:scale-100',
  tilt: 'hover:rotate-1 hover:scale-105',
  brightness: 'hover:brightness-110',
  'grayscale-off': 'grayscale hover:grayscale-0',
};

function HeroSection({ content }: { content: Record<string, any> }) {
  return (
    <div
      className="relative w-full min-h-[50vh] flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: content.backgroundImage ? `url(${content.backgroundImage})` : undefined }}
    >
      <div className="absolute inset-0 bg-background/60" />
      <div className="relative z-10 text-center px-6 py-16">
        {content.title && <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tight mb-4">{content.title}</h1>}
        {content.subtitle && <p className="text-lg md:text-xl text-muted-foreground mb-6">{content.subtitle}</p>}
        {content.ctaText && (
          <a href={content.ctaUrl || '#'}>
            <Button size="lg" className="uppercase tracking-wider">{content.ctaText}</Button>
          </a>
        )}
      </div>
    </div>
  );
}

function ImageSection({ content }: { content: Record<string, any> }) {
  const sizeClass = content.size === 'small' ? 'max-w-md' : content.size === 'medium' ? 'max-w-2xl' : 'w-full';
  return (
    <div className={`mx-auto ${sizeClass}`}>
      <img src={content.url} alt={content.alt || ''} className="w-full h-auto object-cover" loading="lazy" />
    </div>
  );
}

function VideoSection({ content }: { content: Record<string, any> }) {
  const isYouTube = content.url?.includes('youtube') || content.url?.includes('youtu.be');
  if (isYouTube) {
    const videoId = content.url.includes('youtu.be') ? content.url.split('/').pop() : new URL(content.url).searchParams.get('v');
    return (
      <div className="aspect-video w-full">
        <iframe src={`https://www.youtube.com/embed/${videoId}${content.autoplay ? '?autoplay=1&mute=1' : ''}`} className="w-full h-full" allow="autoplay" allowFullScreen />
      </div>
    );
  }
  return (
    <video src={content.url} className="w-full" autoPlay={content.autoplay ?? true} muted loop playsInline />
  );
}

function SliderSection({ content }: { content: Record<string, any> }) {
  const images = content.images || [];
  return (
    <div className="flex gap-4 overflow-x-auto py-4 snap-x snap-mandatory">
      {images.map((url: string, i: number) => (
        <img key={i} src={url} alt="" className="h-64 w-auto object-cover snap-center flex-shrink-0 rounded" loading="lazy" />
      ))}
    </div>
  );
}

function ProductsSection({ content }: { content: Record<string, any> }) {
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();
  const cols = content.columns || 3;
  const limit = content.limit || 12;

  let filtered = products;
  if (content.category) {
    filtered = filtered.filter(p => p.category === content.category);
  }
  filtered = filtered.slice(0, limit);

  return (
    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {filtered.map(product => (
        <div key={product.id} className="group cursor-pointer border border-border overflow-hidden" onClick={() => navigate(`/boutique/${product.id}`)}>
          <div className="aspect-[3/4] overflow-hidden">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{product.category}</p>
            <h3 className="font-bold text-sm uppercase truncate">{product.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {product.salePrice ? (
                <>
                  <span className="font-bold">{product.salePrice}€</span>
                  <span className="text-xs line-through text-muted-foreground">{product.price}€</span>
                </>
              ) : (
                <span className="font-bold">{product.price}€</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoriesSection({ content }: { content: Record<string, any> }) {
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts();
  const ids: string[] = content.categoryIds || [];
  const cols = content.columns || 3;
  const limit = content.limit || ids.length || categories.length;
  const style = content.style || 'card';
  const showCount = !!content.showCount;

  let items = ids.length > 0
    ? ids.map(id => categories.find(c => c.id === id)).filter(Boolean) as typeof categories
    : categories;
  items = items.slice(0, limit);

  const goTo = (cat: any) => {
    const slug = cat.slug || cat.title?.toLowerCase().replace(/\s+/g, '-');
    navigate(`/categorie/${slug}`);
  };
  const countFor = (cat: any) => products.filter((p: any) => p.category === cat.title).length;

  if (style === 'banner') {
    return (
      <div className="space-y-3 px-6">
        {content.title && <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">{content.title}</h2>}
        {items.map(cat => (
          <button key={cat!.id} onClick={() => goTo(cat)} className="relative w-full h-32 md:h-40 overflow-hidden group border border-border">
            {cat!.image && <img src={cat!.image} alt={cat!.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
            <div className="absolute inset-0 bg-background/40 group-hover:bg-background/20 transition-colors" />
            <div className="relative z-10 h-full flex items-center justify-center">
              <span className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">{cat!.title}</span>
              {showCount && <span className="ml-3 text-xs opacity-70">({countFor(cat)})</span>}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="px-6 space-y-4">
      {content.title && <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">{content.title}</h2>}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {items.map(cat => (
          <button key={cat!.id} onClick={() => goTo(cat)} className="group text-left">
            {style === 'card' && (
              <div className="aspect-square overflow-hidden border border-border bg-muted">
                {cat!.image ? (
                  <img src={cat!.image} alt={cat!.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">{cat!.title?.[0]}</div>
                )}
              </div>
            )}
            <div className={cn('flex items-baseline gap-2', style === 'card' ? 'mt-2' : 'py-2 border-b border-border')}>
              <span className="text-sm font-bold uppercase tracking-wider truncate group-hover:text-primary transition-colors">{cat!.title}</span>
              {showCount && <span className="text-[10px] text-muted-foreground">({countFor(cat)})</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PopupButtonSection({ content }: { content: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const popupType = content.popupType || 'text';
  const sectionId = content._id || content.popupTitle || 'popup';
  const storageKey = `popup-section-${sectionId}`;

  useEffect(() => {
    if (!content.autoOpen) return;
    const freq = Number(content.frequencyDays ?? 7);
    const last = Number(localStorage.getItem(storageKey) || 0);
    if (freq > 0 && Date.now() - last < freq * 86400000) return;
    const t = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(storageKey, String(Date.now()));
    }, Math.max(0, Number(content.autoDelay ?? 3)) * 1000);
    return () => clearTimeout(t);
  }, [content.autoOpen, content.autoDelay, content.frequencyDays, storageKey]);

  const align = content.buttonAlign || 'center';
  const alignCls = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
  const sizeCls = content.popupSize === 'sm' ? 'max-w-sm' : content.popupSize === 'lg' ? 'max-w-3xl' : content.popupSize === 'full' ? 'max-w-[95vw] h-[90vh]' : 'max-w-lg';
  const animCls = content.popupAnim === 'slide' ? 'data-[state=open]:slide-in-from-bottom-8' : content.popupAnim === 'zoom' ? 'data-[state=open]:zoom-in-50' : '';

  const handleSubscribe = async () => {
    if (!email) return;
    try {
      setSubmitting(true);
      await subscribeToNewsletter(email, content.askFirstName ? firstName : undefined, { source: 'popup' });
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPromo = async () => {
    try {
      await navigator.clipboard.writeText(content.promoCode || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className={cn('px-6 flex', alignCls)}>
      <Button
        variant={content.buttonVariant || 'default'}
        size={content.buttonSize || 'default'}
        onClick={() => setOpen(true)}
        style={content.buttonBg ? { backgroundColor: content.buttonBg, color: content.buttonColor || undefined, borderColor: content.buttonBg } : undefined}
      >
        {content.buttonLabel || 'Ouvrir'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(sizeCls, animCls, 'overflow-auto')}
          style={{ backgroundColor: content.popupBg || undefined, color: content.popupColor || undefined }}
          onEscapeKeyDown={(e) => { if (content.closeOnEsc === false) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (content.closeOnOutside === false) e.preventDefault(); }}
        >
          {content.popupTitle && <DialogTitle className="text-2xl font-bold uppercase tracking-tight">{content.popupTitle}</DialogTitle>}
          {content.popupSubtitle && <DialogDescription style={{ color: content.popupColor || undefined, opacity: 0.7 }}>{content.popupSubtitle}</DialogDescription>}

          <div className="space-y-4 mt-2">
            {popupType === 'image' && content.mediaUrl && (
              <img src={content.mediaUrl} alt="" className="w-full h-auto" />
            )}
            {popupType === 'video' && content.mediaUrl && (
              <video src={content.mediaUrl} controls className="w-full" autoPlay muted />
            )}
            {popupType === 'html' && content.popupHtml && (
              <div dangerouslySetInnerHTML={{ __html: content.popupHtml }} />
            )}
            {content.popupText && popupType !== 'html' && (
              <p className="whitespace-pre-wrap text-sm">{content.popupText}</p>
            )}

            {popupType === 'promo' && content.promoCode && (
              <div className="flex items-center gap-2 border-2 border-dashed border-current/30 rounded p-3">
                <code className="flex-1 text-lg font-mono font-bold tracking-widest">{content.promoCode}</code>
                <Button size="sm" variant="outline" onClick={copyPromo}>{copied ? 'Copié !' : 'Copier'}</Button>
              </div>
            )}

            {popupType === 'newsletter' && (
              submitted ? (
                <p className="text-center font-medium py-4">{content.successMessage || 'Merci pour votre inscription !'}</p>
              ) : (
                <div className="space-y-2">
                  {content.askFirstName && (
                    <Input placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  )}
                  <Input type="email" placeholder="Votre email" value={email} onChange={e => setEmail(e.target.value)} />
                  <Button onClick={handleSubscribe} disabled={submitting || !email} className="w-full">
                    {submitting ? '...' : (content.formCta || "Je m'inscris")}
                  </Button>
                </div>
              )
            )}

            {content.ctaLabel && content.ctaUrl && (
              <a href={content.ctaUrl} target={content.ctaUrl.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                <Button variant="outline" className="w-full">{content.ctaLabel}</Button>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PageRendererProps {
  sections: PageSection[];
}

export default function PageRenderer({ sections }: PageRendererProps) {
  return (
    <div className="space-y-8">
      {sections.map(section => {
        switch (section.type) {
          case 'hero': return <HeroSection key={section.id} content={section.content} />;
          case 'image': return <ImageSection key={section.id} content={section.content} />;
          case 'video': return <VideoSection key={section.id} content={section.content} />;
          case 'slider': return <SliderSection key={section.id} content={section.content} />;
          case 'title': return <h2 key={section.id} className="text-3xl md:text-4xl font-bold uppercase tracking-tight px-6">{section.content.text}</h2>;
          case 'subtitle': return <h3 key={section.id} className="text-xl text-muted-foreground px-6">{section.content.text}</h3>;
          case 'text': return <div key={section.id} className="prose prose-invert max-w-3xl mx-auto px-6 whitespace-pre-wrap">{section.content.text}</div>;
          case 'products': return <div key={section.id} className="px-6"><ProductsSection content={section.content} /></div>;
          case 'categories': return <CategoriesSection key={section.id} content={section.content} />;
          case 'popup_button': return <PopupButtonSection key={section.id} content={{ ...section.content, _id: section.id }} />;
          default: return null;
        }
      })}
    </div>
  );
}
