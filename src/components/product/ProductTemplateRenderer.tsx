import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Share2, Ruler, Truck, Shield, RotateCcw, Minus, Plus, ZoomIn, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import type { PageTemplate, TemplateBlock } from '@/config/templatePresets';
import { loadGoogleFont } from '@/config/blockVariants';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import RelatedProducts from '@/components/product/RelatedProducts';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { getProductTrustBadges, TRUST_BADGE_ICONS } from '@/lib/productTrustBadges';
import { isKidsProduct } from '@/lib/productFamily';
import KidsNoReturnNotice from '@/components/product/KidsNoReturnNotice';


interface Props {
  template: PageTemplate;
  product: any;
}

export default function ProductTemplateRenderer({ template, product }: Props) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { designSettings } = useApp();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (template.theme.fontHeading) loadGoogleFont(template.theme.fontHeading);
    if (template.theme.fontBody) loadGoogleFont(template.theme.fontBody);
    // Load per-block custom fonts
    template.layout.blocks.forEach(b => {
      if (b.props?.fontFamily) loadGoogleFont(b.props.fontFamily);
    });
  }, [template]);

  const blockStyle = (b: TemplateBlock): React.CSSProperties => {
    const p = b.props || {};
    const s: React.CSSProperties = {};
    if (p.fontFamily) s.fontFamily = p.fontFamily;
    if (p.fontSize) s.fontSize = `${p.fontSize}px`;
    if (p.fontWeight) s.fontWeight = p.fontWeight;
    if (p.textTransform) s.textTransform = p.textTransform;
    if (typeof p.letterSpacing === 'number') s.letterSpacing = `${p.letterSpacing}px`;
    if (p.textAlign) s.textAlign = p.textAlign;
    if (p.color) s.color = p.color;
    if (p.bgColor) s.backgroundColor = p.bgColor;
    return s;
  };
  const labelOf = (b: TemplateBlock, fallback: string) =>
    (b.props?.label && String(b.props.label).trim()) || fallback;


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
          <span className="text-[11px] font-bold uppercase tracking-[2px]" style={{ color: b.props?.accentColor || t.colors.accent }}>
            {labelOf(b, product?.category || 'Produit')}
          </span>
          {product?.sku && <span className="text-[11px]" style={{ color: t.colors.muted }}>SKU: {product.sku}</span>}
        </div>
      );
      case 'sku': return product?.sku ? <div className="text-xs" style={{ color: t.colors.muted }}>SKU: {product.sku}</div> : null;
      case 'title': return (
        <>
          <h1 className={cn('font-black leading-none', b.props?.uppercase && 'uppercase')}
              style={{ fontSize: b.props?.fontSize || b.props?.size || 36, letterSpacing: '-1.5px', marginBottom: 8 }}>
            {labelOf(b, product?.name || '')}
          </h1>
          {isKidsProduct(product) && <KidsNoReturnNotice className="mb-3" />}
        </>
      );
      case 'collab_subtitle': return product?.collab || b.props?.label ? (
        <div className="text-sm mb-4" style={{ color: t.colors.muted }}>{labelOf(b, product?.collab || '')}</div>
      ) : null;
      case 'price': {
        const v = b.variant || 'large-bold';
        if (v === 'badge-discount' && product?.salePrice) {
          const pct = Math.round((1 - product.salePrice / product.price) * 100);
          return (
            <div className="flex items-center gap-3 mb-3">
              <span className="font-extrabold" style={{ fontSize: b.props?.size || 32, color: t.colors.accent }}>{product.salePrice}€</span>
              <span className="line-through" style={{ color: t.colors.muted }}>{product.price}€</span>
              <span className="px-2 py-1 text-xs font-bold rounded" style={{ background: t.colors.accent, color: t.colors.card }}>-{pct}%</span>
            </div>
          );
        }
        if (v === 'subscription-split') {
          const each = ((product?.salePrice || product?.price || 0) / 4).toFixed(2);
          return (
            <div className="mb-3">
              <div className="font-extrabold" style={{ fontSize: b.props?.size || 32 }}>{product?.salePrice || product?.price}€</div>
              <div className="text-xs" style={{ color: t.colors.muted }}>ou 4× {each}€ sans frais</div>
            </div>
          );
        }
        // large-bold (default) + inline-strike
        return (
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
      }

      case 'stock_status': return (
        <div className="flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: b.props?.accentColor || '#22a05a' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: b.props?.accentColor || '#22a05a' }} />
          {labelOf(b, 'En stock')}
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
                style={{ borderColor: b.props?.accentColor || t.colors.fg, color: 'inherit' }}>
          <Ruler className="w-4 h-4" /> {labelOf(b, 'Trouver ma taille')}
        </button>
      );
      case 'trust_badges': {
        // Source of truth: admin-configured badges in designSettings (per-category with fallback to defaults).
        const { enabled, badges } = getProductTrustBadges(designSettings, product?.category);
        if (!enabled || badges.length === 0) return null;
        const customLabels = b.props?.label ? String(b.props.label).split('|').map(s => s.trim()) : [];
        const cols = Math.min(Math.max(badges.length, 1), 4);
        return (
          <div className="grid gap-px rounded-xl overflow-hidden mb-6"
               style={{ background: t.colors.border, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {badges.map((it, i) => {
              const Icon = TRUST_BADGE_ICONS[it.icon] || Truck;
              return (
                <div key={it.id || i} className="flex flex-col items-center gap-2 p-4 text-center" style={{ background: t.colors.card }}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold" style={{ color: t.colors.muted }}>{customLabels[i] || it.label}</span>
                </div>
              );
            })}
          </div>
        );
      }
      case 'description': {
        const v = b.variant || 'plain';
        const heading = labelOf(b, 'Description');
        if (v === 'bullet-features') {
          const lines = String(product?.description || '').split(/\n|\.\s/).filter(Boolean).slice(0, 6);
          return (
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-[2px] mb-2">{labelOf(b, 'Caractéristiques')}</h3>
              <ul className="text-sm space-y-1" style={{ color: t.colors.muted }}>
                {lines.map((l, i) => <li key={i} className="flex gap-2"><span style={{ color: t.colors.accent }}>•</span>{l}</li>)}
              </ul>
            </div>
          );
        }
        if (v === 'magazine-drop-cap') {
          const desc = String(product?.description || '');
          return (
            <div className="mb-4 text-sm leading-relaxed" style={{ color: t.colors.muted }}>
              <span className="float-left text-6xl font-bold leading-none mr-2" style={{ color: t.colors.fg }}>{desc[0] || 'A'}</span>
              {desc.slice(1)}
            </div>
          );
        }
        return (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-[2px] mb-2">{heading}</h3>
            <p className="text-sm leading-relaxed" style={{ color: t.colors.muted }}>{product?.description}</p>
          </div>
        );
      }

      case 'material': return product?.material ? (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-[2px] mb-2">{labelOf(b, 'Matière')}</h3>
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: t.colors.border, color: t.colors.fg }}>{product.material}</span>
        </div>
      ) : null;
      case 'sizes_selector': return product?.sizes?.length ? (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-[2px] mb-3">{labelOf(b, 'Taille')}</h3>
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
          <h3 className="text-xs font-bold uppercase tracking-[2px] mb-3">{labelOf(b, 'Quantité')}</h3>
          <div className="inline-flex items-center rounded-lg border" style={{ borderColor: t.colors.border }}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-11 h-11 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
            <span className="w-14 text-center font-bold border-x" style={{ borderColor: t.colors.border }}>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-11 h-11 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      );
      case 'cta_add_to_cart': {
        const v = b.variant || 'bold-block';
        const baseBtn = "flex-1 h-14 font-bold tracking-widest uppercase text-sm flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5";
        const primaryColor = b.props?.accentColor || t.colors.primary;
        const style: React.CSSProperties = v === 'outline-minimal'
          ? { borderRadius: t.radius, border: `2px solid ${primaryColor}`, color: primaryColor, background: 'transparent' }
          : v === 'gradient'
          ? { borderRadius: t.radius, background: `linear-gradient(135deg, ${primaryColor}, ${t.colors.accent})`, color: t.colors.card }
          : { borderRadius: t.radius, background: primaryColor, color: t.colors.card };
        const label = labelOf(b, 'Ajouter au panier');
        if (v === 'sticky-bottom') {
          return (
            <div className="fixed bottom-0 left-0 right-0 p-3 border-t z-40" style={{ background: t.colors.card, borderColor: t.colors.border }}>
              <button onClick={handleAddToCart} className={baseBtn + ' w-full'} style={style}>
                <ShoppingCart className="w-5 h-5" /> {label}
              </button>
            </div>
          );
        }
        if (v === 'split-buy-now') {
          return (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={handleAddToCart} className={baseBtn} style={{ ...style, background: t.colors.card, border: `2px solid ${primaryColor}`, color: primaryColor }}>
                <ShoppingCart className="w-5 h-5" /> Panier
              </button>
              <button onClick={handleAddToCart} className={baseBtn} style={style}>Acheter</button>
            </div>
          );
        }
        return (
          <div className="flex gap-3 mt-4">
            <button onClick={handleAddToCart} className={baseBtn} style={style}>
              <ShoppingCart className="w-5 h-5" /> {label}
            </button>
            <button className="w-14 h-14 rounded-xl border flex items-center justify-center" style={{ borderColor: t.colors.border, borderRadius: t.radius }}>
              <Heart className="w-5 h-5" />
            </button>
            <button className="w-14 h-14 rounded-xl border flex items-center justify-center" style={{ borderColor: t.colors.border, borderRadius: t.radius }}>
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        );
      }

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
      case 'related_products': return <RelatedProducts currentId={product?.id} category={product?.category} />;
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
                   ...blockStyle(b),
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
