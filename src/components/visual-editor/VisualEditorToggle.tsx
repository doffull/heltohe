import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, X } from 'lucide-react';
import { useVisualEditor } from './VisualEditorProvider';

export function VisualEditorToggle() {
  const { isOpen, setIsOpen, isDirty } = useVisualEditor();

  // Add/remove body class for global cursor hints
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('visual-editor-active');
    } else {
      document.body.classList.remove('visual-editor-active');
    }
    return () => document.body.classList.remove('visual-editor-active');
  }, [isOpen]);

  return (
    <motion.button
      onClick={() => setIsOpen(!isOpen)}
      className="fixed left-4 top-1/2 -translate-y-1/2 z-[80] flex flex-col items-center gap-1 group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isOpen ? "Fermer l'éditeur" : 'Ouvrir l\'éditeur visuel'}
    >
      {/* Main button */}
      <div className="relative w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-2 ring-primary/20 transition-all duration-200 group-hover:shadow-xl group-hover:ring-primary/40">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div key="edit" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Pencil className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dirty indicator */}
        {isDirty && !isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-orange-500 border border-background" />
        )}
      </div>

      {/* LIVE badge */}
      <AnimatePresence>
        {isOpen && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[9px] font-bold tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20"
          >
            LIVE
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
