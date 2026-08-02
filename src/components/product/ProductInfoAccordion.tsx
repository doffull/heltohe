import { motion } from 'framer-motion';
import { FileText, ListChecks, Shirt, Droplets } from 'lucide-react';
import { Product } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { EditableProductField } from '@/components/visual-editor/EditableProductField';
import { useAuth } from '@/context/AuthContext';
import { useVisualEditor } from '@/components/visual-editor/VisualEditorProvider';
import { cn } from '@/lib/utils';

interface ProductInfoAccordionProps {
  product: Product;
  className?: string;
}

/**
 * Description, caractéristiques techniques, matière & entretien.
 * Blocs vides masqués côté client, toujours visibles en mode éditeur admin.
 */
export default function ProductInfoAccordion({ product, className }: ProductInfoAccordionProps) {
  const { isAdmin } = useAuth();
  const { isOpen: editorOpen } = useVisualEditor();
  const editing = isAdmin && editorOpen;

  const hasDescription = Boolean(product.description && String(product.description).trim());
  const hasMaterial = Boolean(product.material && String(product.material).trim());
  const hasCare = Boolean(product.careInstructions && String(product.careInstructions).trim());
  const attrs = product.attributes && Object.keys(product.attributes).length > 0 ? product.attributes : null;

  const showDescription = hasDescription || editing;
  const showAttrs = Boolean(attrs);
  const showMaterial = hasMaterial || editing;
  const showCare = hasCare || editing;

  if (!showDescription && !showAttrs && !showMaterial && !showCare) return null;

  const firstOpen = showDescription ? 'description' : showAttrs ? 'attrs' : showMaterial ? 'material' : 'care';

  return (
    <motion.div
      className={cn('w-full', className)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Accordion type="multiple" defaultValue={[firstOpen]} className="w-full">
        {showDescription && (
          <AccordionItem value="description" className="border-border/60">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2.5 text-sm font-bold hud-text uppercase tracking-wider">
                <FileText className="h-4 w-4 text-primary" />
                Description
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <EditableProductField
                product={product}
                field="description"
                as="p"
                multiline
                className="text-sm text-muted-foreground leading-relaxed"
                placeholder="Ajouter une description…"
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {showAttrs && (
          <AccordionItem value="attrs" className="border-border/60">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2.5 text-sm font-bold hud-text uppercase tracking-wider">
                <ListChecks className="h-4 w-4 text-primary" />
                Caractéristiques techniques
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-2 gap-x-8">
                {Object.entries(attrs!).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 py-2 border-b border-border/40 text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {(showMaterial || showCare) && (
          <AccordionItem value={showMaterial ? 'material' : 'care'} className="border-border/60">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2.5 text-sm font-bold hud-text uppercase tracking-wider">
                <Shirt className="h-4 w-4 text-primary" />
                Matière &amp; Entretien
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-2 gap-6">
                {showMaterial && (
                  <div>
                    <h3 className="text-xs font-bold hud-text mb-2 uppercase tracking-wider flex items-center gap-2">
                      <Shirt className="h-3.5 w-3.5 text-primary" />
                      Matière
                    </h3>
                    <EditableProductField
                      product={product}
                      field="material"
                      as="p"
                      multiline
                      className="text-sm text-muted-foreground"
                      placeholder="Ex: 100% polyester recyclé"
                    />
                  </div>
                )}
                {showCare && (
                  <div>
                    <h3 className="text-xs font-bold hud-text mb-2 uppercase tracking-wider flex items-center gap-2">
                      <Droplets className="h-3.5 w-3.5 text-primary" />
                      Entretien
                    </h3>
                    <EditableProductField
                      product={product}
                      field="careInstructions"
                      as="p"
                      multiline
                      className="text-sm text-muted-foreground"
                      placeholder="Ex: Lavage 30°C, séchage à plat"
                    />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </motion.div>
  );
}
