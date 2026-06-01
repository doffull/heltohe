import { ReactNode, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { useVisualEditor } from './VisualEditorProvider';
import { useAuth } from '@/context/AuthContext';

interface Props {
  text: string;
  url: string;
  onChange: (next: { text: string; url: string }) => void;
  children: ReactNode;
}

/**
 * Wrap a CTA (button or link). In edit mode admins see a pencil overlay.
 * Clicking it opens a popover to update label + url.
 */
export function EditableCta({ text, url, onChange, children }: Props) {
  const { isAdmin } = useAuth();
  const { isOpen, setIsDirty } = useVisualEditor();
  const [popOpen, setPopOpen] = useState(false);
  const [draftText, setDraftText] = useState(text);
  const [draftUrl, setDraftUrl] = useState(url);

  const active = isAdmin && isOpen;
  if (!active) return <>{children}</>;

  const commit = () => {
    onChange({ text: draftText, url: draftUrl });
    setIsDirty(true);
    setPopOpen(false);
  };

  return (
    <span className="relative inline-block group/editable-cta">
      {children}
      <Popover open={popOpen} onOpenChange={(o) => {
        if (o) { setDraftText(text); setDraftUrl(url); }
        setPopOpen(o);
      }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute -top-2 -right-2 z-30 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-lg opacity-0 group-hover/editable-cta:opacity-100 transition-opacity"
            title="Modifier le bouton"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="end">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider">Libellé</Label>
            <Input value={draftText} onChange={(e) => setDraftText(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider">URL / route</Label>
            <Input value={draftUrl} onChange={(e) => setDraftUrl(e.target.value)} className="h-8 text-xs" placeholder="/boutique" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPopOpen(false)} className="text-xs px-2 py-1 rounded hover:bg-muted">Annuler</button>
            <button onClick={commit} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Appliquer</button>
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}
