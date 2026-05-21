import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMegaMenu } from '@/context/MegaMenuContext';
import { cn } from '@/lib/utils';

export function MegaMenuTrigger({ className, label = 'Menu' }: { className?: string; label?: string }) {
  const { toggle } = useMegaMenu();
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggle}
      aria-label="Ouvrir le menu"
      className={cn('gap-2 h-9 lg:h-10 px-3 uppercase tracking-[0.2em] text-xs font-bold', className)}
    >
      <Menu className="h-4 w-4 lg:h-5 lg:w-5" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
