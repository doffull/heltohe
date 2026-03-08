import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Ruler } from 'lucide-react';

interface SizeGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SIZES = [
  { size: 'XS', chest: '82–87', waist: '66–71', hips: '88–93', length: '66' },
  { size: 'S',  chest: '88–93', waist: '72–77', hips: '94–99', length: '68' },
  { size: 'M',  chest: '94–99', waist: '78–83', hips: '100–105', length: '70' },
  { size: 'L',  chest: '100–105', waist: '84–89', hips: '106–111', length: '72' },
  { size: 'XL', chest: '106–111', waist: '90–95', hips: '112–117', length: '74' },
  { size: 'XXL',chest: '112–117', waist: '96–102', hips: '118–124', length: '76' },
];

export default function SizeGuideModal({ open, onOpenChange }: SizeGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="hud-text flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            GUIDE DES TAILLES
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[180px_1fr] gap-6 mt-2">
          {/* Body silhouette SVG */}
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 120 260" className="w-36 text-foreground" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Head */}
              <circle cx="60" cy="22" r="16" stroke="currentColor" strokeWidth="1.5" />
              {/* Neck */}
              <line x1="54" y1="38" x2="52" y2="52" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="66" y1="38" x2="68" y2="52" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              {/* Shoulders / chest */}
              <path d="M28 60 C28 54 52 52 60 52 C68 52 92 54 92 60 L94 100 L26 100 Z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              {/* Arms */}
              <path d="M28 60 L14 110 L22 112 L34 70" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M92 60 L106 110 L98 112 L86 70" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Waist */}
              <path d="M26 100 C26 100 34 116 60 116 C86 116 94 100 94 100" stroke="currentColor" strokeWidth="1.5" />
              {/* Hips */}
              <path d="M34 116 C30 124 24 130 24 140 L40 170 L80 170 L96 140 C96 130 90 124 86 116"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              {/* Legs */}
              <path d="M40 170 L36 240 L50 240 L60 195 L70 240 L84 240 L80 170"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />

              {/* Chest arrow */}
              <line x1="8" y1="72" x2="22" y2="72" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 2" />
              <line x1="98" y1="72" x2="112" y2="72" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 2" />
              <text x="60" y="69" textAnchor="middle" fontSize="7" fill="hsl(var(--primary))" fontFamily="monospace">A</text>

              {/* Waist arrow */}
              <line x1="10" y1="108" x2="26" y2="108" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 2" />
              <line x1="94" y1="108" x2="110" y2="108" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 2" />
              <text x="60" y="105" textAnchor="middle" fontSize="7" fill="hsl(var(--primary))" fontFamily="monospace">B</text>

              {/* Hips arrow */}
              <line x1="6" y1="132" x2="24" y2="132" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 2" />
              <line x1="96" y1="132" x2="114" y2="132" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 2" />
              <text x="60" y="129" textAnchor="middle" fontSize="7" fill="hsl(var(--primary))" fontFamily="monospace">C</text>

              {/* Length arrow (vertical) */}
              <line x1="116" y1="52" x2="116" y2="240" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 2" />
              <text x="116" y="150" textAnchor="middle" fontSize="7" fill="hsl(var(--primary))" fontFamily="monospace" transform="rotate(90,116,150)">D</text>
            </svg>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 hud-text text-xs text-muted-foreground font-medium">Taille</th>
                  <th className="text-center py-2 px-2 hud-text text-xs text-muted-foreground font-medium">
                    <span className="text-primary">A</span> Poitrine
                  </th>
                  <th className="text-center py-2 px-2 hud-text text-xs text-muted-foreground font-medium">
                    <span className="text-primary">B</span> Taille
                  </th>
                  <th className="text-center py-2 px-2 hud-text text-xs text-muted-foreground font-medium">
                    <span className="text-primary">C</span> Hanches
                  </th>
                  <th className="text-center py-2 px-2 hud-text text-xs text-muted-foreground font-medium">
                    <span className="text-primary">D</span> Longueur
                  </th>
                </tr>
              </thead>
              <tbody>
                {SIZES.map((row, i) => (
                  <tr
                    key={row.size}
                    className={i % 2 === 0 ? 'bg-muted/20' : ''}
                  >
                    <td className="py-2.5 pr-3 font-bold hud-text text-xs">{row.size}</td>
                    <td className="py-2.5 px-2 text-center text-xs font-mono">{row.chest}</td>
                    <td className="py-2.5 px-2 text-center text-xs font-mono">{row.waist}</td>
                    <td className="py-2.5 px-2 text-center text-xs font-mono">{row.hips}</td>
                    <td className="py-2.5 px-2 text-center text-xs font-mono">{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              Toutes les mesures sont en centimètres. En cas de doute entre deux tailles, choisissez la plus grande.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
