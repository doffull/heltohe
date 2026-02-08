import { motion } from 'framer-motion';
import { Check, Truck, Shield, RotateCcw } from 'lucide-react';
import { Product } from '@/types';

interface ProductInfoProps {
  product: Product;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function ProductInfo({ product }: ProductInfoProps) {
  return (
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
        <h1 className="text-4xl font-bold hud-text uppercase tracking-wider">{product.name}</h1>
        {product.subtitle && (
          <p className="text-lg text-muted-foreground mt-1">{product.subtitle}</p>
        )}
      </motion.div>

      {/* Price */}
      <motion.div className="flex items-center gap-4" {...fadeUp} transition={{ delay: 0.2 }}>
        {product.salePrice ? (
          <>
            <span className="text-4xl font-bold text-primary">{product.salePrice}€</span>
            <span className="text-2xl line-through text-muted-foreground">{product.price}€</span>
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
          <span className="text-4xl font-bold">{product.price}€</span>
        )}
      </motion.div>

      {/* Stock */}
      <motion.div className="flex items-center gap-2" {...fadeUp} transition={{ delay: 0.25 }}>
        {product.stock > 0 ? (
          <>
            <Check className="h-5 w-5 text-primary" />
            <span className="text-sm">
              {product.stock > 10 ? 'En stock' : `Plus que ${product.stock} en stock`}
            </span>
          </>
        ) : (
          <span className="text-destructive font-bold">Rupture de stock</span>
        )}
      </motion.div>

      {/* Features bar */}
      <motion.div
        className="grid grid-cols-3 gap-4 py-6 border-y border-border"
        {...fadeUp}
        transition={{ delay: 0.5 }}
      >
        {[
          { icon: Truck, label: 'Livraison gratuite dès 100€' },
          { icon: Shield, label: 'Garantie 2 ans' },
          { icon: RotateCcw, label: 'Retours sous 30 jours' },
        ].map(({ icon: Icon, label }, i) => (
          <motion.div
            key={label}
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          >
            <Icon className="h-7 w-7 mx-auto mb-2 text-primary" />
            <p className="text-xs text-muted-foreground">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Description */}
      {product.description && (
        <motion.div {...fadeUp} transition={{ delay: 0.7 }}>
          <h2 className="text-lg font-bold hud-text mb-3 uppercase tracking-wider">Description</h2>
          <p className="text-muted-foreground leading-relaxed">{product.description}</p>
        </motion.div>
      )}

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
      {(product.material || product.careInstructions) && (
        <motion.div className="grid md:grid-cols-2 gap-6" {...fadeUp} transition={{ delay: 0.9 }}>
          {product.material && (
            <div>
              <h3 className="text-sm font-bold hud-text mb-2 uppercase tracking-wider">Matière</h3>
              <p className="text-sm text-muted-foreground">{product.material}</p>
            </div>
          )}
          {product.careInstructions && (
            <div>
              <h3 className="text-sm font-bold hud-text mb-2 uppercase tracking-wider">Entretien</h3>
              <p className="text-sm text-muted-foreground">{product.careInstructions}</p>
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}
