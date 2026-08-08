import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDropZone } from '@/components/admin/FileDropZone';
import { POPUP_FONTS, type PopupAnimation, type PopupLayer } from '@/types/popups';

const ANIMATIONS: PopupAnimation[] = [
  'none', 'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom', 'typewriter', 'glow',
];

const ACTIONS = [
  { value: 'none', label: 'Aucune' },
  { value: 'link', label: 'Lien / page' },
  { value: 'chatbot', label: 'Ouvrir le chatbot' },
  { value: 'voice', label: 'Commande vocale' },
  { value: 'install-app', label: "Installer l'app" },
  { value: 'close', label: 'Fermer' },
];

interface Props {
  layer: PopupLayer;
  onChange: (patch: Partial<PopupLayer>) => void;
}

export function PopupLayerInspector({ layer, onChange }: Props) {
  const isText = layer.kind === 'text' || layer.kind === 'button' || layer.kind === 'countdown' || layer.kind === 'promo';
  const isMedia = layer.kind === 'image' || layer.kind === 'video';

  return (
    <div className="space-y-4">
      {layer.kind === 'text' && (
        <div>
          <Label className="text-xs">Texte</Label>
          <Textarea value={layer.text || ''} onChange={(e) => onChange({ text: e.target.value })} rows={2} />
        </div>
      )}

      {layer.kind === 'button' && (
        <>
          <div>
            <Label className="text-xs">Libellé du bouton</Label>
            <Input value={layer.text || ''} onChange={(e) => onChange({ text: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Action au clic</Label>
            <Select
              value={layer.action?.type || 'none'}
              onValueChange={(v) =>
                onChange({ action: v === 'link' ? { type: 'link', href: (layer.action as any)?.href || '/shop' } : ({ type: v } as any) })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {layer.action?.type === 'link' && (
            <div className="space-y-2">
              <Input
                placeholder="/shop ou https://…"
                value={(layer.action as any).href || ''}
                onChange={(e) => onChange({ action: { type: 'link', href: e.target.value, newTab: (layer.action as any).newTab } })}
              />
              <div className="flex items-center justify-between">
                <Label className="text-xs">Nouvel onglet</Label>
                <Switch
                  checked={!!(layer.action as any).newTab}
                  onCheckedChange={(v) => onChange({ action: { type: 'link', href: (layer.action as any).href, newTab: v } })}
                />
              </div>
            </div>
          )}
        </>
      )}

      {layer.kind === 'email' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Placeholder</Label>
            <Input value={layer.placeholder || ''} onChange={(e) => onChange({ placeholder: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Bouton</Label>
            <Input value={layer.ctaLabel || ''} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
          </div>
        </div>
      )}

      {layer.kind === 'promo' && (
        <div>
          <Label className="text-xs">Code promo</Label>
          <Input value={layer.code || ''} onChange={(e) => onChange({ code: e.target.value.toUpperCase() })} />
        </div>
      )}

      {layer.kind === 'countdown' && (
        <div>
          <Label className="text-xs">Fin du compte à rebours</Label>
          <Input
            type="datetime-local"
            value={layer.endsAt ? layer.endsAt.slice(0, 16) : ''}
            onChange={(e) => onChange({ endsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
          />
        </div>
      )}

      {isMedia && (
        <>
          <div>
            <Label className="text-xs">{layer.kind === 'video' ? 'Vidéo' : 'Image / GIF'}</Label>
            <FileDropZone
              currentFile={layer.src || ''}
              onUpload={(url) => onChange({ src: url })}
              accept={layer.kind === 'video' ? ['video'] : ['image']}
              folder="popups"
            />
            <Input
              className="mt-2"
              placeholder="ou coller une URL"
              value={layer.src || ''}
              onChange={(e) => onChange({ src: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Cadrage</Label>
              <Select value={layer.fit || 'cover'} onValueChange={(v) => onChange({ fit: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Remplir (cover)</SelectItem>
                  <SelectItem value="contain">Contenir</SelectItem>
                  <SelectItem value="fill">Étirer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Arrondi (px)</Label>
              <Input type="number" value={layer.radius ?? 0} onChange={(e) => onChange({ radius: Number(e.target.value) })} />
            </div>
          </div>
          {layer.kind === 'video' && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['autoplay', 'loop', 'muted'] as const).map((k) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <Label className="text-[10px] uppercase">{k}</Label>
                  <Switch checked={layer[k] !== false} onCheckedChange={(v) => onChange({ [k]: v } as any)} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isText && (
        <>
          <div>
            <Label className="text-xs">Typographie</Label>
            <Select value={layer.fontFamily || POPUP_FONTS[0]} onValueChange={(v) => onChange({ fontFamily: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POPUP_FONTS.map((f) => (
                  <SelectItem key={f} value={f}><span style={{ fontFamily: f }}>{f.split(',')[0]}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Taille</Label>
              <Input type="number" value={layer.fontSize ?? 16} onChange={(e) => onChange({ fontSize: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Graisse</Label>
              <Select value={String(layer.fontWeight ?? 400)} onValueChange={(v) => onChange({ fontWeight: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[300, 400, 500, 600, 700, 800, 900].map((w) => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Interlettrage</Label>
              <Input type="number" step="0.01" value={layer.letterSpacing ?? 0} onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Alignement</Label>
              <Select value={layer.align || 'center'} onValueChange={(v) => onChange({ align: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Gauche</SelectItem>
                  <SelectItem value="center">Centre</SelectItem>
                  <SelectItem value="right">Droite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Couleur texte</Label>
              <Input type="color" value={layer.color || '#ffffff'} onChange={(e) => onChange({ color: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Couleur fond</Label>
              <Input type="color" value={layer.bgColor || '#000000'} onChange={(e) => onChange({ bgColor: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Majuscules</Label>
            <Switch checked={!!layer.uppercase} onCheckedChange={(v) => onChange({ uppercase: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Ombre portée</Label>
            <Switch checked={!!layer.shadow} onCheckedChange={(v) => onChange({ shadow: v })} />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Animation</Label>
          <Select value={layer.animation || 'fade'} onValueChange={(v) => onChange({ animation: v as PopupAnimation })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANIMATIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Rotation (°)</Label>
          <Input type="number" value={layer.rotate ?? 0} onChange={(e) => onChange({ rotate: Number(e.target.value) })} />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Délai d'apparition : {(layer.delay ?? 0).toFixed(1)}s</Label>
          <Slider value={[layer.delay ?? 0]} min={0} max={5} step={0.1} onValueChange={([v]) => onChange({ delay: v })} />
        </div>
        <div>
          <Label className="text-xs">Durée : {(layer.duration ?? 0.5).toFixed(1)}s</Label>
          <Slider value={[layer.duration ?? 0.5]} min={0.1} max={3} step={0.1} onValueChange={([v]) => onChange({ duration: v })} />
        </div>
        <div>
          <Label className="text-xs">Opacité : {Math.round((layer.opacity ?? 1) * 100)}%</Label>
          <Slider value={[layer.opacity ?? 1]} min={0.1} max={1} step={0.05} onValueChange={([v]) => onChange({ opacity: v })} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(['x', 'y', 'w'] as const).map((k) => (
          <div key={k}>
            <Label className="text-[10px] uppercase">{k} %</Label>
            <Input type="number" value={layer[k] ?? 0} onChange={(e) => onChange({ [k]: Number(e.target.value) } as any)} />
          </div>
        ))}
        <div>
          <Label className="text-[10px] uppercase">H %</Label>
          <Input
            type="number"
            value={layer.h ?? ''}
            onChange={(e) => onChange({ h: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}

export default PopupLayerInspector;
