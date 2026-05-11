import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Pencil, Loader2 } from 'lucide-react';

interface Props {
  inventoryId: string;
  locationId: string;
  size?: string | null;
  color?: string | null;
  /** Existing stock_levels row id (if known) */
  levelId?: string | null;
  currentValue: number;
  onSaved?: () => void;
  /** Tailwind text style override */
  className?: string;
  /** Disable editing (e.g. for parent rows with variants) */
  disabled?: boolean;
}

export function InlineStockEditor({
  inventoryId,
  locationId,
  size = null,
  color = null,
  levelId,
  currentValue,
  onSaved,
  className,
  disabled,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentValue));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(String(currentValue));
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, currentValue]);

  const save = async () => {
    const num = parseInt(value, 10);
    if (!Number.isFinite(num) || num < 0) {
      toast.error('Valeur invalide');
      setEditing(false);
      return;
    }
    if (num === currentValue) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      if (levelId) {
        const { error } = await supabase
          .from('stock_levels')
          .update({ quantity: num, updated_at: new Date().toISOString() })
          .eq('id', levelId);
        if (error) throw error;
      } else {
        // Find existing row by composite key first
        const q = supabase
          .from('stock_levels')
          .select('id')
          .eq('inventory_id', inventoryId)
          .eq('location_id', locationId);
        const { data: found } = await (size
          ? color
            ? q.eq('size', size).eq('color', color)
            : q.eq('size', size).is('color', null)
          : color
            ? q.is('size', null).eq('color', color)
            : q.is('size', null).is('color', null)
        ).maybeSingle();

        if (found?.id) {
          const { error } = await supabase
            .from('stock_levels')
            .update({ quantity: num, updated_at: new Date().toISOString() })
            .eq('id', found.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('stock_levels').insert({
            inventory_id: inventoryId,
            location_id: locationId,
            size,
            color,
            quantity: num,
            reserved: 0,
          });
          if (error) throw error;
        }
      }
      toast.success(`Stock mis à jour: ${num}`);
      onSaved?.();
      setEditing(false);
    } catch (err: any) {
      toast.error('Erreur: ' + (err.message || 'inconnue'));
    } finally {
      setSaving(false);
    }
  };

  if (disabled) {
    return <span className={cn('text-sm font-mono', className)}>{currentValue}</span>;
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min={0}
          value={value}
          disabled={saving}
          onChange={e => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-16 px-1.5 py-0.5 text-sm font-mono border border-primary rounded bg-background text-right focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Cliquer pour modifier"
      className={cn(
        'group inline-flex items-center gap-1 px-1.5 py-0.5 -my-0.5 rounded hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 transition-colors cursor-pointer',
        className
      )}
    >
      <span className="font-mono">{currentValue}</span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
