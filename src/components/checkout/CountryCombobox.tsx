import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  getCountryOptions,
  normalizeCountryCode,
  searchableLabel,
  type CountryOption,
} from '@/lib/colissimo-countries';

/**
 * Choix du pays de livraison.
 *
 * Un `<select>` natif se défend pour cinq entrées ; la table Colissimo en
 * compte 251. Sans recherche, trouver « Nouvelle-Zélande » demande de faire
 * défiler à l'aveugle — sur mobile, c'est une roulette interminable. D'où une
 * liste filtrable, ouverte sur les destinations réellement commandées.
 *
 * Détails qui font la différence à l'usage :
 * — recherche insensible aux accents et à la casse (« suede » trouve Suède) ;
 * — recherche aussi par code ISO, pour qui tape « CH » ;
 * — les destinations fréquentes forment un groupe séparé, visible sans taper ;
 * — le déclencheur montre le drapeau, ce qui rend l'erreur de pays évidente
 *   d'un coup d'œil au moment de relire la commande.
 */
interface CountryComboboxProps {
  value: string;
  onChange: (code: string) => void;
  /** Rendu compact, pour les écrans d'administration. */
  compact?: boolean;
  className?: string;
  id?: string;
}

export function CountryCombobox({
  value,
  onChange,
  compact = false,
  className,
  id,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);

  const options = getCountryOptions();
  const code = normalizeCountryCode(value);
  const selected = options.find((o) => o.code === code) ?? options[0];

  const [priority, others] = useMemo(() => {
    const p: CountryOption[] = [];
    const o: CountryOption[] = [];
    for (const option of options) (option.priority ? p : o).push(option);
    return [p, o];
  }, [options]);

  const handleSelect = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const renderItem = (option: CountryOption) => (
    <CommandItem
      key={option.code}
      // cmdk filtre sur cette valeur : on y glisse le code ISO pour que « CH »
      // trouve la Suisse aussi bien que « suisse ».
      value={`${option.name} ${option.code}`}
      onSelect={() => handleSelect(option.code)}
      className="gap-2.5 cursor-pointer"
    >
      <span className="text-base leading-none" aria-hidden>{option.flag}</span>
      <span className="flex-1 truncate">{option.name}</span>
      <span className="text-[10px] tracking-wider text-muted-foreground tabular-nums">
        {option.code}
      </span>
      <Check
        className={cn(
          'h-4 w-4 shrink-0 transition-opacity',
          option.code === code ? 'opacity-100' : 'opacity-0',
        )}
      />
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Pays de livraison"
          className={cn(
            'w-full justify-between font-normal',
            compact
              ? 'h-10 bg-background text-sm'
              : 'h-10 bg-secondary/50 text-base hover:bg-secondary/70',
            className,
          )}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="text-base leading-none" aria-hidden>
              {selected?.flag ?? <Globe className="h-4 w-4" />}
            </span>
            <span className="truncate">{selected?.name ?? 'Choisir un pays'}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        // Le panneau épouse la largeur du champ : un menu plus étroit ou plus
        // large que son déclencheur donne une impression de flottement.
        className="w-[--radix-popover-trigger-width] min-w-[260px] p-0"
      >
        <Command
          filter={(itemValue, search) => {
            const haystack = searchableLabel(itemValue);
            const needle = searchableLabel(search);
            if (!needle) return 1;
            // Un pays dont le nom *commence* par la recherche passe devant :
            // « ma » propose Maroc avant Danemark (qui contient « ma »).
            if (haystack.startsWith(needle)) return 1;
            return haystack.includes(needle) ? 0.5 : 0;
          }}
        >
          <CommandInput placeholder="Rechercher un pays…" className="text-base" />
          <CommandList className="max-h-[280px]">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              Aucun pays ne correspond.
            </CommandEmpty>
            <CommandGroup heading="Destinations fréquentes">
              {priority.map(renderItem)}
            </CommandGroup>
            <CommandGroup heading="Tous les pays">{others.map(renderItem)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
