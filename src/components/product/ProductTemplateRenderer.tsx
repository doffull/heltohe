import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Share2, Ruler, Truck, Shield, RotateCcw, Minus, Plus, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PageTemplate, TemplateBlock } from '@/config/templatePresets';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import RelatedProducts from '@/components/product/RelatedProducts';
import { cn } from '@/lib/utils';

interface Props {
  template: PageTemplate;
  product: any;
}

export default function ProductTemplateRenderer({ template, product }: Props) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  const images: string[] = useMemo(() => {
    const arr: string[] = [];
    if (product?.image) arr.push(product.image);
    if (Array.isArray(product?.images)) arr.push(...product.images);
    return Array.from(new Set(arr)).filter(Boolean);
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (product.sizes?.length && !selectedSize) {
      toast({ title: 'Sélectionnez une taille', variant: 'destructive' });
      return;
    }
    await addItem({
      productId: product.id, name: product.name, price: product.price,
      salePrice: product.salePrice, image: product.image,
      size: selectedSize || undefined, color: selectedColor || undefined, quantity,
    });
    toast({ title: 'Ajouté au panier', description: product.name });
  };

  const t = template.theme;
  const cssVars: React.CSSProperties = {
    ['--tpl-bg' as any]: t.colors.bg,
    ['--tpl-fg' as any]: t.colors.fg,
    ['--tpl-primary' as any]: t.colors.primary,
    ['--tpl-accent' as any]: t.colors.accent,
    ['--tpl-muted' as any]: t.colors.muted,
    ['--tpl-card' as any]: t.colors.card,
    ['--tpl-border' as any]: t.colors.border,
    ['--tpl-radius' as any]: t.radius || '8px',
    ['--tpl-shadow' as any]: t.shadow || 'none',
    fontFamily: t.font || undefined,
    backgroundColor: t.colors.bg,
    color: t.colors.fg,
    minHeight: '100vh',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${template.layout.grid.cols}, minmax(0, 1fr))`,
    gap: template.layout.grid.gap,
  };

  const renderBlock = (b: TemplateBlock) => {
    if (b.visible === false) return null;
    switch (b.type) {
      case 'gallery': return <Gallery images={images} idx={imgIdx} setIdx={setImgIdx} sticky={b.props?.sticky} />;
      case 'breadcrumb': return (
        <nav className="text-xs" style={{ color: t.colors.muted, padding: '8px 0' }}>
          <Link to="/">Accueil</Link> <span className="mx-2">›</span>
          <Link to="/boutique">Boutique</Link> <span className="mx-2">›</span>
          <span style={{ color: t.colors.fg }}>{product?.name}</span>
        </nav>
      );
      case 'category_tag': return (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-[2px]" style={{ color: t.colors.accent }}>
            {product?.category || 'Produit'}
          </span>
          {product?.sku && <span className="text-[11px]" style={{ color: t.colors.muted }}>SKU: {product.sku}</span>}
        </div>
      );
      case 'sku': return product?.sku ? <div className="text-xs" style={{ color: t.colors.muted }}>SKU: {product.sku}</div> : null;
      case 'title': return (
        <h1 className={cn('font-black leading-none', b.props?.uppercase && 'uppercase')}
            style={{ fontSize: b.props?.size || 36, letterSpacing: '-1.5px', marginBottom: 8 }}>
          {product?.name}
        </h1>
      );
      case 'collab_subtitle': return product?.collab ? (
        <div className="text-sm mb-4" style={{ color: t.colors.muted }}>{product.collab}</div>
      ) : null;
      case 'price': return (
        <div className="flex items-center gap-3 mb-3">
          {product?.salePrice ? (
            <>
              <span className="font-extrabold" style={{ fontSize: b.props?.size || 32, color: t.colors.accent }}>{product.salePrice}€</span>
              <span className="line-through" style={{ color: t.colors.muted }}>{product.price}€</span>
            </>
          ) : (
            <span className="font-extrabold" style={{ fontSize: b.props?.size || 32 }}>{product?.price}€</span>
          )}
        </div>
      );
      case 'stock_status': return (
        <div className="flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: '#22a05a' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22a05a' }} />
          En stock
        </div>
      );
      case 'model_info': return product?.modelInfo ? (
        <div className="text-sm p-3 rounded-lg mb-3 flex items-center gap-2"
             style={{ background: t.colors.border, color: t.colors.muted }}>
          📏 {product.modelInfo}
        </div>
      ) : null;
      case 'find_size_btn': return (
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border mb-4"
                style={{ borderColor: t.colors.fg, color: t.colors.fg }}>
          <Ruler className="w-4 h-4" /> Trouver ma taille
        </button>
      );
      case 'trust_badges': return (
        <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden mb-6" style={{ background: t.colors.border }}>
          {[
            { icon: Truck, text: 'Livraison gratuite dès 200€' },
            { icon: Shield, text: 'Garantie 1 an' },
            { icon: RotateCcw, text: 'Retours sous 30 jours' },
          ].map((it, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 text-center" style={{ background: t.colors.card }}>
              <it.icon className="w-5 h-5" />
              <span className="text-xs font-semibold" style={{ color: t.colors.muted }}>{it.text}</span>
            </div>
          ))}
        </div>
      );
      case 'description': return (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-[2px] mb-2">Description</h3>
          <p className="text-sm leading-relaxed" style={{ color: t.colors.muted }}>{product?.description}</p>
        </div>
      );
      case 'material': return product?.material ? (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-[2px] mb-2">Matière</h3>
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: t.colors.border, color: t.colors.fg }}>{product.material}</span>
        </div>
      ) : null;
      case 'sizes_selector': return product?.sizes?.length ? (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-[2px] mb-3">Taille</h3>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s: string) => (
              <button key={s} onClick={() => setSelectedSize(s)}
                      className="w-12 h-12 rounded-lg border text-sm font-semibold transition-all"
                      style={{
                        borderColor: selectedSize === s ? t.colors.fg : t.colors.border,
                        background: selectedSize === s ? t.colors.fg : t.colors.card,
                        color: selectedSize === s ? t.colors.card : t.colors.fg,
                      }}>{s}</button>
            ))}
          </div>
        </div>
      ) : null;
      case 'quantity_selector': return (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-[2px] mb-3">Quantité</h3>
          <div className="inline-flex items-center rounded-lg border" style={{ borderColor: t.colors.border }}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-11 h-11 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
            <span className="w-14 text-center font-bold border-x" style={{ borderColor: t.colors.border }}>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-11 h-11 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      );
      case 'cta_add_to_cart': return (
        <div className="flex gap-3 mt-4">
          <button onClick={handleAddToCart}
                  className="flex-1 h-14 rounded-xl font-bold tracking-widest uppercase text-sm flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                  style={{ background: t.colors.primary, color: t.colors.card }}>
            <ShoppingCart className="w-5 h-5" /> Ajouter au panier
          </button>
          <button className="w-14 h-14 rounded-xl border flex items-center justify-center" style={{ borderColor: t.colors.border }}>
            <Heart className="w-5 h-5" />
          </button>
          <button className="w-14 h-14 rounded-xl border flex items-center justify-center" style={{ borderColor: t.colors.border }}>
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      );
      case 'btn_wishlist': return (
        <button className="w-14 h-14 rounded-xl border flex items-center justify-center" style={{ borderColor: t.colors.border }}>
          <Heart className="w-5 h-5" />
        </button>
      );
      case 'btn_share': return (
        <button className="w-14 h-14 rounded-xl border flex items-center justify-center" style={{ borderColor: t.colors.border }}>
          <Share2 className="w-5 h-5" />
        </button>
      );
      case 'related_products': return <RelatedProducts currentProductId={product?.id} category={product?.category} />;
      case 'custom_html': return b.props?.html ? <div dangerouslySetInnerHTML={{ __html: String(b.props.html) }} /> : null;
      case 'divider': return <hr style={{ borderColor: t.colors.border, margin: '24px 0' }} />;
      case 'spacer': return <div style={{ height: b.props?.height || 24 }} />;
      default: return null;
    }
  };

  return (
    <div style={cssVars}>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div style={gridStyle}>
          {template.layout.blocks.map(b => (
            <div key={b.id}
                 style={{
                   gridColumn: `${b.col || 1} / span ${b.span || 12}`,
                   gridRow: b.row ? `${b.row} / span ${b.rowSpan || 1}` : undefined,
                 }}>
              {renderBlock(b)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Gallery({ images, idx, setIdx, sticky }: { images: string[]; idx: number; setIdx: (n: number) => void; sticky?: boolean }) {
  if (!images.length) {
    return <div className="aspect-square rounded-xl bg-muted" />;
  }
  return (
    <div className={cn('flex gap-3', sticky && 'lg:sticky lg:top-20')}>
      <div className="hidden md:flex flex-col gap-2 w-16">
        {images.slice(0, 6).map((src, i) => (
          <button key={i} onClick={() => setIdx(i)}
                  className={cn('w-16 h-20 rounded-lg overflow-hidden border-2 transition-all',
                    i === idx ? 'border-foreground' : 'border-transparent')}>
            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      <div className="flex-1 relative rounded-xl overflow-hidden bg-muted aspect-[4/5]">
        <img src={images[idx]} alt="" className="w-full h-full object-cover" />
        {images.length > 1 && (
          <>
            <button onClick={() => setIdx((idx - 1 + images.length) % images.length)}
                    className="absolute top-1/2 left-3 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setIdx((idx + 1) % images.length)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
        <button className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
