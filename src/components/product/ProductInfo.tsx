import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Truck, Shield, RotateCcw, Sparkles, Ruler, User, Leaf, Award, Package, Headphones, CreditCard, MapPin, Heart, Zap, Gift, Star } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { SizeGuideAIModal } from './SizeGuideAIModal';
import type { SizeCategory } from '@/lib/sizeCharts';
import { useApp } from '@/context/AppContext';
import { getProductTrustBadges, TRUST_BADGE_ICONS } from '@/lib/productTrustBadges';
import { EditableProductField } from '@/components/visual-editor/EditableProductField';


interface ProductInfoProps {
  product: Product;
  isNew?: boolean;
  /** Mobile reorder: render only header block (category, title, price, stock, model, size guide CTA) */
  headerOnly?: boolean;
  /** Mobile reorder: render only details block (features, description, attrs, material/care) */
  detailsOnly?: boolean;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function ProductInfo({ product, isNew, headerOnly, detailsOnly }: ProductInfoProps) {
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const { designSettings } = useApp();
  const guessCategory = (): SizeCategory => {
    const c = (product.category || '').toLowerCase();
    if (c.includes('femme')) return 'femme';
    if (c.includes('enfant') || c.includes('kid')) return 'enfant';
    return 'homme';
  };
  const showHeader = !detailsOnly;
  const showDetails = !headerOnly;
  const { enabled: badgesEnabled, badges: trustBadges } = getProductTrustBadges(designSettings, product.category);
  return (

    <>
      {showHeader && (
        <>
          {/* Category & SKU */}
      <motion.div
        className="flex items-center justify-between"
        {...fadeUp}
        transition={{ delay: 0.1 }}
      >
        <span className="text-sm text-muted-foreground uppercase tracking-[0.2em] font-mono">
          {product.category}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          SKU: {product.sku}
        </span>
      </motion.div>

      {/* Title */}
      <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <EditableProductField
            product={product}
            field="name"
            as="h1"
            className="text-2xl md:text-4xl font-bold hud-text uppercase tracking-wider"
          />
          {isNew && (
            <motion.span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-xs font-bold hud-text"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 260 }}
            >
              <Sparkles className="h-3 w-3" />
              IA
            </motion.span>
          )}
        </div>
        <EditableProductField
          product={product}
          field="subtitle"
          as="p"
          className="text-lg text-muted-foreground mt-1"
          placeholder="Sous-titre du produit…"
        />
      </motion.div>

      {/* Price */}
      <motion.div className="flex items-center gap-4" {...fadeUp} transition={{ delay: 0.2 }}>
        {product.salePrice ? (
          <>
            <EditableProductField
              product={product}
              field="salePrice"
              as="span"
              className="text-2xl md:text-4xl font-bold text-primary"
              parse={(v) => (v === '' ? null : Number(v))}
              format={(v) => (v == null ? '' : String(v))}
            >
              {product.salePrice}€
            </EditableProductField>
            <EditableProductField
              product={product}
              field="price"
              as="span"
              className="text-2xl line-through text-muted-foreground"
              parse={(v) => Number(v)}
              format={(v) => String(v ?? '')}
            >
              {product.price}€
            </EditableProductField>
            <motion.span
              className="bg-destructive text-destructive-foreground px-3 py-1 text-sm font-bold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
            >
              -{Math.round((1 - product.salePrice / product.price) * 100)}%
            </motion.span>
          </>
        ) : (
          <EditableProductField
            product={product}
            field="price"
            as="span"
            className="text-2xl md:text-4xl font-bold"
            parse={(v) => Number(v)}
            format={(v) => String(v ?? '')}
          >
            {product.price}€
          </EditableProductField>
        )}
      </motion.div>


      {/* Stock */}
      <motion.div className="flex items-center gap-2" {...fadeUp} transition={{ delay: 0.25 }}>
        {product.stock > 0 ? <Check className="h-5 w-5 text-primary" /> : null}
        <span className="text-sm inline-flex items-center gap-1">
          {product.stock > 0 ? (product.stock > 10 ? 'En stock (' : 'Plus que ') : <span className="text-destructive font-bold mr-1">Rupture — </span>}
          <EditableProductField
            product={product}
            field="stock"
            as="span"
            className="font-semibold"
            parse={(v) => Math.max(0, parseInt(v) || 0)}
            format={(v) => String(v ?? 0)}
          >
            {product.stock}
          </EditableProductField>
          {product.stock > 0 ? (product.stock > 10 ? ' unités)' : ' en stock') : ' unités'}
        </span>
      </motion.div>

      {/* Model info — always editable in admin editor mode */}
      <motion.div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs" {...fadeUp} transition={{ delay: 0.27 }}>
        <User className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-muted-foreground">
          <EditableProductField product={product} field="modelName" as="span" className="font-semibold text-foreground" placeholder="Mannequin" />
          {' mesure '}
          <EditableProductField product={product} field="modelHeight" as="span" className="font-semibold text-foreground" placeholder="—" />
          {' et porte la taille '}
          <EditableProductField product={product} field="modelSizeWorn" as="span" className="font-semibold text-foreground" placeholder="—" />
        </span>
      </motion.div>


      {/* Size guide AI button */}
      {product.sizes && product.sizes.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.28 }}>
          <Button variant="outline" size="sm" onClick={() => setSizeGuideOpen(true)} className="gap-2 w-full sm:w-auto">
            <Ruler className="h-3.5 w-3.5" />
            <Sparkles className="h-3 w-3" />
            Trouver ma taille
          </Button>
          <SizeGuideAIModal
            open={sizeGuideOpen}
            onOpenChange={setSizeGuideOpen}
            productName={product.name}
            availableSizes={product.sizes}
            defaultCategory={guessCategory()}
          />
        </motion.div>
      )}
        </>
      )}

      {showDetails && (
        <>
      {/* Features bar */}
      {badgesEnabled && trustBadges.length > 0 && (
        <motion.div
          className="grid gap-2 py-4 border-y border-border"
          style={{ gridTemplateColumns: `repeat(${Math.min(trustBadges.length, 4)}, minmax(0, 1fr))` }}
          {...fadeUp}
          transition={{ delay: 0.5 }}
        >
          {trustBadges.map((badge, i) => {
            const Icon = TRUST_BADGE_ICONS[badge.icon] || Truck;
            return (
              <motion.div
                key={badge.id}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
              >
                <Icon className="h-5 w-5 sm:h-7 sm:w-7 mx-auto mb-1 sm:mb-2 text-primary" />
                <p className="text-[9px] sm:text-xs text-muted-foreground leading-tight">{badge.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      )}


      {/* Description */}
      <motion.div {...fadeUp} transition={{ delay: 0.7 }}>
        <h2 className="text-lg font-bold hud-text mb-3 uppercase tracking-wider">Description</h2>
        <EditableProductField
          product={product}
          field="description"
          as="p"
          multiline
          className="text-muted-foreground leading-relaxed"
          placeholder="Ajouter une description…"
        />
      </motion.div>

      {/* Attributes */}
      {product.attributes && Object.keys(product.attributes).length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.8 }}>
          <h2 className="text-lg font-bold hud-text mb-3 uppercase tracking-wider">Caractéristiques</h2>
          <div className="space-y-2">
            {Object.entries(product.attributes).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Material & Care */}
      <motion.div className="grid md:grid-cols-2 gap-6" {...fadeUp} transition={{ delay: 0.9 }}>
        <div>
          <h3 className="text-sm font-bold hud-text mb-2 uppercase tracking-wider">Matière</h3>
          <EditableProductField
            product={product}
            field="material"
            as="p"
            multiline
            className="text-sm text-muted-foreground"
            placeholder="Ex: 100% polyester recyclé"
          />
        </div>
        <div>
          <h3 className="text-sm font-bold hud-text mb-2 uppercase tracking-wider">Entretien</h3>
          <EditableProductField
            product={product}
            field="careInstructions"
            as="p"
            multiline
            className="text-sm text-muted-foreground"
            placeholder="Ex: Lavage 30°C, séchage à plat"
          />
        </div>
      </motion.div>

        </>
      )}
    </>
  );
}
