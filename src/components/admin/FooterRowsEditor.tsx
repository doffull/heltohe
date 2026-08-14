import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaLibraryDialog } from '@/components/visual-editor/MediaLibraryDialog';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Image as ImageIcon, Plus, Rows3, Trash2,
} from 'lucide-react';
import {
  FOOTER_BLOCK_LABELS, FOOTER_BLOCK_TYPES, FOOTER_WIDTHS,
  makeFooterBlock, makeFooterRow, resolveFooterRows, uid,
} from '@/lib/footerBuilder';
import type { FooterBlock, FooterBlockType, FooterConfig, FooterRow } from '@/types';

interface Props {
  cfg: FooterConfig;
  setCfg: (patch: Partial<FooterConfig>) => void;
}

/**
 * Constructeur de lignes du footer : place 1 à 4 blocs côte à côte,
 * règle leur largeur, leur alignement, leur visibilité et leur contenu.
 */
export function FooterRowsEditor({ cfg, setCfg }: Props) {
  const rows = resolveFooterRows(cfg);
  const [pickImage, setPickImage] = useState<{ row: number; block: number } | null>(null);

  const commit = (next: FooterRow[]) => setCfg({ rows: next });

  const patchRow = (ri: number, patch: Partial<FooterRow>) => {
    const next = rows.map((r, i) => (i === ri ? { ...r, ...patch } : r));
    commit(next);
  };

  const patchBlock = (ri: number, bi: number, patch: Partial<FooterBlock>) => {
    const next = rows.map((r, i) =>
      i === ri ? { ...r, blocks: r.blocks.map((b, j) => (j === bi ? { ...b, ...patch } : b)) } : r,
    );
    commit(next);
  };

  const patchProps = (ri: number, bi: number, patch: Record<string, unknown>) => {
    const block = rows[ri].blocks[bi];
    patchBlock(ri, bi, { props: { ...(block.props || {}), ...patch } });
  };

  const moveRow = (ri: number, dir: -1 | 1) => {
    const next = [...rows];
    const t = ri + dir;
    if (t < 0 || t >= next.length) return;
    [next[ri], next[t]] = [next[t], next[ri]];
    commit(next);
  };

  const moveBlock = (ri: number, bi: number, dir: -1 | 1) => {
    const blocks = [...rows[ri].blocks];
    const t = bi + dir;
    if (t < 0 || t >= blocks.length) return;
    [blocks[bi], blocks[t]] = [blocks[t], blocks[bi]];
    patchRow(ri, { blocks });
  };

  const addRow = () => commit([...rows, makeFooterRow([makeFooterBlock('text')])]);
  const duplicateRow = (ri: number) =>
    commit([
      ...rows.slice(0, ri + 1),
      { ...rows[ri], id: uid('row'), blocks: rows[ri].blocks.map(b => ({ ...b, id: uid() })) },
      ...rows.slice(ri + 1),
    ]);
  const deleteRow = (ri: number) => commit(rows.filter((_, i) => i !== ri));

  const addBlock = (ri: number, type: FooterBlockType) => {
    const count = rows[ri].blocks.length + 1;
    const width = count >= 4 ? '1/4' : count === 3 ? '1/3' : count === 2 ? '1/2' : 'full';
    patchRow(ri, { blocks: [...rows[ri].blocks, makeFooterBlock(type, width)] });
  };
  const deleteBlock = (ri: number, bi: number) =>
    patchRow(ri, { blocks: rows[ri].blocks.filter((_, j) => j !== bi) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Chaque ligne accueille plusieurs blocs côte à côte. Réglez la largeur pour les aligner
          (ex. « Suivez-nous » en 1/2 + « Paiement sécurisé » en 1/2 sur la même ligne).
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={addRow}>
            <Plus className="h-4 w-4" /> Ajouter une ligne
          </Button>
          {cfg.rows?.length ? (
            <Button variant="ghost" size="sm" onClick={() => setCfg({ rows: undefined })}>
              Réinitialiser
            </Button>
          ) : null}
        </div>
      </div>

      {rows.map((row, ri) => (
        <div key={row.id} className="border border-border">
          {/* En-tête de ligne */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <Rows3 className="h-4 w-4 opacity-60" />
            <span className="text-sm font-bold">Ligne {ri + 1}</span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select value={row.gap || 'md'} onValueChange={(v) => patchRow(ri, { gap: v as any })}>
                <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Écart serré</SelectItem>
                  <SelectItem value="md">Écart normal</SelectItem>
                  <SelectItem value="lg">Écart large</SelectItem>
                </SelectContent>
              </Select>
              <Select value={row.valign || 'start'} onValueChange={(v) => patchRow(ri, { valign: v as any })}>
                <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Haut</SelectItem>
                  <SelectItem value="center">Milieu</SelectItem>
                  <SelectItem value="end">Bas</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-xs">
                Séparateur
                <Switch checked={row.divider === true} onCheckedChange={(v) => patchRow(ri, { divider: v })} />
              </label>
              <Button variant="ghost" size="icon" disabled={ri === 0} onClick={() => moveRow(ri, -1)} aria-label="Monter la ligne">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={ri === rows.length - 1} onClick={() => moveRow(ri, 1)} aria-label="Descendre la ligne">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => duplicateRow(ri)} aria-label="Dupliquer la ligne">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteRow(ri)} aria-label="Supprimer la ligne">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Blocs */}
          <div className="space-y-3 p-3">
            {row.blocks.map((block, bi) => (
              <div key={block.id} className="space-y-3 border border-border/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={block.type} onValueChange={(v) => patchBlock(ri, bi, { type: v as FooterBlockType })}>
                    <SelectTrigger className="h-9 w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FOOTER_BLOCK_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{FOOTER_BLOCK_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={block.width || 'full'} onValueChange={(v) => patchBlock(ri, bi, { width: v as any })}>
                    <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FOOTER_WIDTHS.map((w) => (
                        <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={block.align || 'inherit'}
                    onValueChange={(v) => patchBlock(ri, bi, { align: v === 'inherit' ? undefined : (v as any) })}
                  >
                    <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">Alignement global</SelectItem>
                      <SelectItem value="left">Gauche</SelectItem>
                      <SelectItem value="center">Centré</SelectItem>
                      <SelectItem value="right">Droite</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 text-xs">
                    Visible
                    <Switch
                      checked={block.visible !== false}
                      onCheckedChange={(v) => patchBlock(ri, bi, { visible: v })}
                    />
                  </label>
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="icon" disabled={bi === 0} onClick={() => moveBlock(ri, bi, -1)} aria-label="Déplacer à gauche">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={bi === row.blocks.length - 1} onClick={() => moveBlock(ri, bi, 1)} aria-label="Déplacer à droite">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteBlock(ri, bi)} aria-label="Supprimer le bloc">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Réglages spécifiques */}
                {block.type === 'text' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Titre</Label>
                      <Input
                        value={block.props?.title ?? ''}
                        onChange={(e) => patchProps(ri, bi, { title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Texte</Label>
                      <Textarea
                        rows={3}
                        value={block.props?.text ?? ''}
                        onChange={(e) => patchProps(ri, bi, { text: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {block.type === 'image' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 sm:col-span-2">
                      {block.props?.url ? (
                        <img src={block.props.url} alt="" className="h-12 w-auto max-w-[120px] border border-border object-contain p-1" />
                      ) : null}
                      <Button variant="outline" className="gap-2" onClick={() => setPickImage({ row: ri, block: bi })}>
                        <ImageIcon className="h-4 w-4" /> {block.props?.url ? 'Changer' : 'Choisir une image'}
                      </Button>
                      {block.props?.url && (
                        <Button variant="ghost" size="sm" onClick={() => patchProps(ri, bi, { url: '' })}>Retirer</Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label>Texte alternatif</Label>
                      <Input value={block.props?.alt ?? ''} onChange={(e) => patchProps(ri, bi, { alt: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Lien (optionnel)</Label>
                      <Input placeholder="/boutique" value={block.props?.href ?? ''} onChange={(e) => patchProps(ri, bi, { href: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Largeur (px)</Label>
                      <Input
                        type="number"
                        value={block.props?.imgWidth ?? 160}
                        onChange={(e) => patchProps(ri, bi, { imgWidth: Number(e.target.value) || 160 })}
                      />
                    </div>
                  </div>
                )}

                {block.type === 'spacer' && (
                  <div className="space-y-1 max-w-[200px]">
                    <Label>Hauteur (px)</Label>
                    <Input
                      type="number"
                      value={block.props?.height ?? 24}
                      onChange={(e) => patchProps(ri, bi, { height: Number(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>
            ))}

            <Select value="" onValueChange={(v) => addBlock(ri, v as FooterBlockType)}>
              <SelectTrigger className="h-10 w-full sm:w-[280px]">
                <span className="flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> Ajouter un bloc à cette ligne</span>
              </SelectTrigger>
              <SelectContent>
                {FOOTER_BLOCK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{FOOTER_BLOCK_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}

      <MediaLibraryDialog
        open={pickImage !== null}
        onOpenChange={(o: boolean) => { if (!o) setPickImage(null); }}
        onSelect={(url: string) => {
          if (!pickImage) return;
          patchProps(pickImage.row, pickImage.block, { url });
          setPickImage(null);
        }}
      />
    </div>
  );
}

export default FooterRowsEditor;
