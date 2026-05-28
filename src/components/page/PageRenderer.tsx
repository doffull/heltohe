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
import type { PageSection } from '@/hooks/usePages';

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
          default: return null;
        }
      })}
    </div>
  );
}
