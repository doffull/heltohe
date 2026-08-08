import { useCallback, useRef, useState } from 'react';
import { PopupRenderer } from '@/components/popups/PopupRenderer';
import type { PopupCampaign, PopupLayer } from '@/types/popups';
import { cn } from '@/lib/utils';

interface Props {
  campaign: Partial<PopupCampaign>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateLayer: (id: string, patch: Partial<PopupLayer>) => void;
  device: 'desktop' | 'mobile';
}

/** Canvas WYSIWYG : drag & drop des calques + poignée de redimensionnement. */
export function PopupCanvasEditor({ campaign, selectedId, onSelect, onUpdateLayer, device }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [replayKey, setReplayKey] = useState(0);
  const dragRef = useRef<{
    id: string;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    origin: PopupLayer;
    rect: DOMRect;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, layer: PopupLayer, mode: 'move' | 'resize') => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      e.stopPropagation();
      onSelect(layer.id);
      dragRef.current = { id: layer.id, mode, startX: e.clientX, startY: e.clientY, origin: { ...layer }, rect };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [onSelect],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dxPct = ((e.clientX - d.startX) / d.rect.width) * 100;
      const dyPct = ((e.clientY - d.startY) / d.rect.height) * 100;
      if (d.mode === 'move') {
        onUpdateLayer(d.id, {
          x: Math.max(-10, Math.min(100, Math.round((d.origin.x + dxPct) * 10) / 10)),
          y: Math.max(-10, Math.min(100, Math.round((d.origin.y + dyPct) * 10) / 10)),
        });
      } else {
        onUpdateLayer(d.id, {
          w: Math.max(5, Math.min(120, Math.round((d.origin.w + dxPct) * 10) / 10)),
          h: d.origin.h != null ? Math.max(3, Math.round((d.origin.h + dyPct) * 10) / 10) : undefined,
        });
      }
    },
    [onUpdateLayer],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const layers = campaign.layers || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="hud-text text-[10px] text-muted-foreground">
          GLISSER POUR DÉPLACER · POIGNÉE ↘ POUR REDIMENSIONNER
        </p>
        <button
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
          className="hud-text border border-border px-2 py-1 text-[10px] hover:bg-muted"
        >
          REJOUER LES ANIMATIONS
        </button>
      </div>

      <div className={cn('mx-auto', device === 'mobile' ? 'max-w-[320px]' : 'max-w-[420px]')}>
        <div
          ref={wrapRef}
          className="relative select-none border border-border"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onMouseDown={() => onSelect(null)}
        >
          <PopupRenderer
            key={replayKey}
            campaign={{
              layers,
              background: campaign.background || {},
              format: (campaign.format as any) || 'square',
            }}
            interactive={false}
            scale={device === 'mobile' ? 0.85 : 1}
          />

          {/* Overlay d'édition */}
          <div className="absolute inset-0">
            {layers.map((layer) => {
              const isSel = selectedId === layer.id;
              return (
                <div
                  key={layer.id}
                  onPointerDown={(e) => onPointerDown(e, layer, 'move')}
                  className={cn(
                    'absolute cursor-move border',
                    isSel ? 'border-primary' : 'border-transparent hover:border-primary/40',
                  )}
                  style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    width: `${layer.w}%`,
                    height: layer.h ? `${layer.h}%` : '10%',
                    zIndex: 50 + (layer.z ?? 1),
                  }}
                >
                  {isSel && (
                    <>
                      <span className="absolute -top-4 left-0 bg-primary px-1 text-[9px] font-bold uppercase text-primary-foreground">
                        {layer.kind}
                      </span>
                      <div
                        onPointerDown={(e) => onPointerDown(e, layer, 'resize')}
                        className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize bg-primary"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PopupCanvasEditor;
