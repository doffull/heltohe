import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  GripVertical, Plus, Trash2, Image, Video, Type, AlignLeft, Pencil,
  Heading1, Heading2, LayoutGrid, ChevronUp, ChevronDown, Grid3x3, MousePointerClick, Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileDropZone } from '@/components/admin/FileDropZone';
import { useCategories } from '@/hooks/useCategories';
import type { PageSection } from '@/hooks/usePages';

const HOVER_EFFECTS = [
  { value: 'none', label: 'Aucun' },
  { value: 'zoom', label: 'Zoom avant' },
  { value: 'zoom-out', label: 'Zoom arrière' },
  { value: 'tilt', label: 'Inclinaison' },
  { value: 'brightness', label: 'Luminosité' },
  { value: 'grayscale-off', label: 'Couleur au survol' },
] as const;

const SECTION_TYPES = [
  { value: 'hero', label: 'Header / Hero', icon: LayoutGrid },
  { value: 'banner', label: 'Bannière pub', icon: Megaphone },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'video', label: 'Vidéo', icon: Video },
  { value: 'slider', label: 'Slider Images', icon: Image },
  { value: 'title', label: 'Titre', icon: Heading1 },
  { value: 'subtitle', label: 'Sous-titre', icon: Heading2 },
  { value: 'text', label: 'Texte libre', icon: AlignLeft },
  { value: 'products', label: 'Grille produits', icon: LayoutGrid },
  { value: 'categories', label: 'Catégories', icon: Grid3x3 },
  { value: 'popup_button', label: 'Bouton + Popup', icon: MousePointerClick },
] as const;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function SectionEditor({
  section,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  defaultOpen,
}: {
  section: PageSection;
  onChange: (s: PageSection) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  defaultOpen?: boolean;
}) {
  const typeMeta = SECTION_TYPES.find(t => t.value === section.type);
  const Icon = typeMeta?.icon || Type;
  const [open, setOpen] = useState(!!defaultOpen);

  const updateContent = (key: string, value: any) => {
    onChange({ ...section, content: { ...section.content, [key]: value } });
  };

  const summary = section.content.title || section.content.text || section.content.alt || section.content.buttonLabel || '';

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium uppercase tracking-wider truncate">
              {typeMeta?.label || section.type}
            </div>
            {summary && !open && (
              <div className="text-xs text-muted-foreground truncate">{summary}</div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={isFirst}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={isLast}>
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(o => !o)} title={open ? 'Replier' : 'Modifier'}>
              <Pencil className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette section&nbsp;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est définitive et retirera la section de votre page.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {open && (
        <>


        {/* Hero */}
        {section.type === 'hero' && (
          <div className="space-y-3">
            <Input placeholder="Titre du Hero" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} />
            <Input placeholder="Sous-titre" value={section.content.subtitle || ''} onChange={e => updateContent('subtitle', e.target.value)} />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Image de fond</div>
              <FileDropZone
                accept={['image']}
                folder="home/hero"
                currentFile={section.content.backgroundImage || ''}
                onUpload={(url) => updateContent('backgroundImage', url)}
                label="Glissez une image de fond"
              />
            </div>
            <Input placeholder="Texte du bouton CTA" value={section.content.ctaText || ''} onChange={e => updateContent('ctaText', e.target.value)} />
            <Input placeholder="Lien du bouton CTA" value={section.content.ctaUrl || ''} onChange={e => updateContent('ctaUrl', e.target.value)} />
          </div>
        )}

        {/* Image */}
        {section.type === 'image' && (
          <div className="space-y-3">
            <FileDropZone
              accept={['image']}
              folder="home/images"
              currentFile={section.content.url || ''}
              onUpload={(url) => updateContent('url', url)}
              label="Glissez une image ou cliquez pour téléverser"
            />
            <Input placeholder="Texte alternatif (alt)" value={section.content.alt || ''} onChange={e => updateContent('alt', e.target.value)} />
            <Select value={section.content.size || 'full'} onValueChange={v => updateContent('size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Petit</SelectItem>
                <SelectItem value="medium">Moyen</SelectItem>
                <SelectItem value="full">Pleine largeur</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label className="text-xs">Effet au survol</Label>
              <Select value={section.content.hoverEffect || 'none'} onValueChange={v => updateContent('hoverEffect', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOVER_EFFECTS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded border p-2">
              <Label className="text-xs">Parallax au scroll</Label>
              <Switch checked={!!section.content.parallax} onCheckedChange={v => updateContent('parallax', v)} />
            </div>
            {section.content.parallax && (
              <div className="space-y-1">
                <Label className="text-[10px] flex justify-between">
                  <span>Intensité parallax</span>
                  <span className="font-mono">{(section.content.parallaxSpeed ?? 0.25).toFixed(2)}</span>
                </Label>
                <Slider
                  value={[section.content.parallaxSpeed ?? 0.25]}
                  min={0.1} max={0.6} step={0.05}
                  onValueChange={([v]) => updateContent('parallaxSpeed', v)}
                />
              </div>
            )}
          </div>
        )}

        {/* Video */}
        {section.type === 'video' && (
          <div className="space-y-3">
            <FileDropZone
              accept={['video']}
              folder="home/videos"
              currentFile={section.content.url || ''}
              onUpload={(url) => updateContent('url', url)}
              label="Glissez une vidéo MP4/WebM ou cliquez pour téléverser"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={section.content.autoplay ?? true} onChange={e => updateContent('autoplay', e.target.checked)} />
              Lecture automatique
            </label>
          </div>
        )}

        {/* Slider */}
        {section.type === 'slider' && (
          <div className="space-y-3">
            {((section.content.images as string[]) || []).map((img, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <FileDropZone
                    accept={['image']}
                    folder="home/slider"
                    currentFile={img}
                    onUpload={(url) => {
                      const next = [...((section.content.images as string[]) || [])];
                      if (url) next[i] = url; else next.splice(i, 1);
                      updateContent('images', next);
                    }}
                    label={`Image ${i + 1}`}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateContent('images', [...((section.content.images as string[]) || []), ''])}
            >
              <Plus className="h-3 w-3 mr-1" /> Ajouter une image
            </Button>
            <div className="space-y-1">
              <Label className="text-xs">Effet au survol</Label>
              <Select value={section.content.hoverEffect || 'none'} onValueChange={v => updateContent('hoverEffect', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOVER_EFFECTS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Title */}
        {section.type === 'title' && (
          <Input placeholder="Titre" value={section.content.text || ''} onChange={e => updateContent('text', e.target.value)} className="text-lg font-bold" />
        )}

        {/* Subtitle */}
        {section.type === 'subtitle' && (
          <Input placeholder="Sous-titre" value={section.content.text || ''} onChange={e => updateContent('text', e.target.value)} />
        )}

        {/* Text */}
        {section.type === 'text' && (
          <Textarea placeholder="Contenu texte..." value={section.content.text || ''} onChange={e => updateContent('text', e.target.value)} rows={4} />
        )}

        {/* Products grid */}
        {section.type === 'products' && (
          <div className="space-y-3">
            <Input placeholder="Catégorie à afficher (laisser vide = toutes)" value={section.content.category || ''} onChange={e => updateContent('category', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Colonnes desktop</div>
                <Select value={String(section.content.columns || 3)} onValueChange={v => updateContent('columns', parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Colonnes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 colonnes</SelectItem>
                    <SelectItem value="3">3 colonnes</SelectItem>
                    <SelectItem value="4">4 colonnes</SelectItem>
                    <SelectItem value="5">5 colonnes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Colonnes mobile</div>
                <Select value={String(section.content.columnsMobile || 2)} onValueChange={v => updateContent('columnsMobile', parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Mobile" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 colonne</SelectItem>
                    <SelectItem value="2">2 colonnes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Taille des cartes</div>
                <Select value={section.content.cardSize || 'normal'} onValueChange={v => updateContent('cardSize', v)}>
                  <SelectTrigger><SelectValue placeholder="Taille" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compacte</SelectItem>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Espacement</div>
                <Select value={section.content.gap || 'md'} onValueChange={v => updateContent('gap', v)}>
                  <SelectTrigger><SelectValue placeholder="Espacement" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="sm">Serré</SelectItem>
                    <SelectItem value="md">Normal</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input type="number" placeholder="Nombre max de produits" value={section.content.limit || ''} onChange={e => updateContent('limit', parseInt(e.target.value) || undefined)} />
          </div>
        )}

        {/* Categories grid */}
        {section.type === 'categories' && (
          <CategoriesEditor section={section} updateContent={updateContent} />
        )}

        {/* Popup button */}
        {section.type === 'popup_button' && (
          <PopupButtonEditor section={section} updateContent={updateContent} />
        )}

        {/* Banner */}
        {section.type === 'banner' && (
          <BannerEditor section={section} updateContent={updateContent} />
        )}
        </>
        )}
      </CardContent>
    </Card>
  );
}

function CategoriesEditor({ section, updateContent }: { section: PageSection; updateContent: (k: string, v: any) => void }) {
  const { data: categories = [] } = useCategories();
  const selected: string[] = section.content.categoryIds || [];
  const toggle = (id: string) => {
    updateContent('categoryIds', selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };
  return (
    <div className="space-y-3">
      <Input placeholder="Titre du bloc (optionnel)" value={section.content.title || ''} onChange={e => updateContent('title', e.target.value)} />
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Catégories à afficher</div>
        <div className="max-h-60 overflow-auto border border-border rounded p-2 space-y-1">
          {categories.length === 0 && <p className="text-xs text-muted-foreground">Aucune catégorie.</p>}
          {categories.map(c => (
            <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-1.5 py-1">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
              <span className="truncate">{c.title}</span>
              {c.parentId && <span className="text-[10px] text-muted-foreground">(sous-cat.)</span>}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder="Nb max (vide=tout)" value={section.content.limit || ''} onChange={e => updateContent('limit', parseInt(e.target.value) || undefined)} />
        <Select value={String(section.content.columns || 3)} onValueChange={v => updateContent('columns', parseInt(v))}>
          <SelectTrigger><SelectValue placeholder="Colonnes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 colonnes</SelectItem>
            <SelectItem value="3">3 colonnes</SelectItem>
            <SelectItem value="4">4 colonnes</SelectItem>
            <SelectItem value="6">6 colonnes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Select value={section.content.style || 'card'} onValueChange={v => updateContent('style', v)}>
        <SelectTrigger><SelectValue placeholder="Style" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="card">Carte image</SelectItem>
          <SelectItem value="compact">Compact (libellé seul)</SelectItem>
          <SelectItem value="banner">Bandeau large</SelectItem>
        </SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!section.content.showCount} onChange={e => updateContent('showCount', e.target.checked)} />
        Afficher le nombre de produits
      </label>
    </div>
  );
}

function PopupButtonEditor({ section, updateContent }: { section: PageSection; updateContent: (k: string, v: any) => void }) {
  const c = section.content;
  const popupType = c.popupType || 'text';
  return (
    <div className="space-y-4">
      {/* Button config */}
      <div className="space-y-2 border border-border/60 rounded p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bouton</div>
        <Input placeholder="Libellé du bouton" value={c.buttonLabel || ''} onChange={e => updateContent('buttonLabel', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={c.buttonVariant || 'default'} onValueChange={v => updateContent('buttonVariant', v)}>
            <SelectTrigger><SelectValue placeholder="Style" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Principal</SelectItem>
              <SelectItem value="outline">Contour</SelectItem>
              <SelectItem value="secondary">Secondaire</SelectItem>
              <SelectItem value="ghost">Fantôme</SelectItem>
              <SelectItem value="link">Lien</SelectItem>
            </SelectContent>
          </Select>
          <Select value={c.buttonSize || 'default'} onValueChange={v => updateContent('buttonSize', v)}>
            <SelectTrigger><SelectValue placeholder="Taille" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Petit</SelectItem>
              <SelectItem value="default">Normal</SelectItem>
              <SelectItem value="lg">Grand</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={c.buttonAlign || 'center'} onValueChange={v => updateContent('buttonAlign', v)}>
          <SelectTrigger><SelectValue placeholder="Alignement" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Gauche</SelectItem>
            <SelectItem value="center">Centre</SelectItem>
            <SelectItem value="right">Droite</SelectItem>
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Couleur fond</Label>
            <Input type="color" value={c.buttonBg || '#000000'} onChange={e => updateContent('buttonBg', e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px]">Couleur texte</Label>
            <Input type="color" value={c.buttonColor || '#ffffff'} onChange={e => updateContent('buttonColor', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Popup config */}
      <div className="space-y-2 border border-border/60 rounded p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Popup</div>
        <Select value={popupType} onValueChange={v => updateContent('popupType', v)}>
          <SelectTrigger><SelectValue placeholder="Type de contenu" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Texte riche</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Vidéo</SelectItem>
            <SelectItem value="newsletter">Formulaire newsletter</SelectItem>
            <SelectItem value="promo">Code promo</SelectItem>
            <SelectItem value="html">HTML libre</SelectItem>
          </SelectContent>
        </Select>

        <Input placeholder="Titre de la popup" value={c.popupTitle || ''} onChange={e => updateContent('popupTitle', e.target.value)} />
        <Input placeholder="Sous-titre" value={c.popupSubtitle || ''} onChange={e => updateContent('popupSubtitle', e.target.value)} />

        {popupType === 'image' && (
          <FileDropZone accept={['image']} folder="popups" currentFile={c.mediaUrl || ''} onUpload={url => updateContent('mediaUrl', url)} label="Image de la popup" />
        )}
        {popupType === 'video' && (
          <FileDropZone accept={['video']} folder="popups" currentFile={c.mediaUrl || ''} onUpload={url => updateContent('mediaUrl', url)} label="Vidéo de la popup" />
        )}
        {(popupType === 'text' || popupType === 'image' || popupType === 'video' || popupType === 'newsletter') && (
          <Textarea placeholder="Texte / description" value={c.popupText || ''} onChange={e => updateContent('popupText', e.target.value)} rows={3} />
        )}
        {popupType === 'html' && (
          <Textarea placeholder="<div>HTML personnalisé...</div>" value={c.popupHtml || ''} onChange={e => updateContent('popupHtml', e.target.value)} rows={5} className="font-mono text-xs" />
        )}
        {popupType === 'promo' && (
          <>
            <Input placeholder="Code promo (ex: WELCOME10)" value={c.promoCode || ''} onChange={e => updateContent('promoCode', e.target.value)} />
            <Input placeholder="Description de l'offre" value={c.popupText || ''} onChange={e => updateContent('popupText', e.target.value)} />
          </>
        )}
        {popupType === 'newsletter' && (
          <>
            <Input placeholder="Libellé bouton inscription" value={c.formCta || 'Je m\'inscris'} onChange={e => updateContent('formCta', e.target.value)} />
            <Input placeholder="Message de succès" value={c.successMessage || 'Merci pour votre inscription !'} onChange={e => updateContent('successMessage', e.target.value)} />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!c.askFirstName} onChange={e => updateContent('askFirstName', e.target.checked)} />
              Demander le prénom
            </label>
          </>
        )}

        <Input placeholder="CTA secondaire — libellé (optionnel)" value={c.ctaLabel || ''} onChange={e => updateContent('ctaLabel', e.target.value)} />
        <Input placeholder="CTA secondaire — URL" value={c.ctaUrl || ''} onChange={e => updateContent('ctaUrl', e.target.value)} />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Fond popup</Label>
            <Input type="color" value={c.popupBg || '#ffffff'} onChange={e => updateContent('popupBg', e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px]">Texte popup</Label>
            <Input type="color" value={c.popupColor || '#000000'} onChange={e => updateContent('popupColor', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={c.popupSize || 'md'} onValueChange={v => updateContent('popupSize', v)}>
            <SelectTrigger><SelectValue placeholder="Taille" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Petite</SelectItem>
              <SelectItem value="md">Moyenne</SelectItem>
              <SelectItem value="lg">Grande</SelectItem>
              <SelectItem value="full">Plein écran</SelectItem>
            </SelectContent>
          </Select>
          <Select value={c.popupAnim || 'fade'} onValueChange={v => updateContent('popupAnim', v)}>
            <SelectTrigger><SelectValue placeholder="Animation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fade">Fade</SelectItem>
              <SelectItem value="slide">Slide-up</SelectItem>
              <SelectItem value="zoom">Zoom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Options de fermeture</div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={c.closeButton ?? true} onChange={e => updateContent('closeButton', e.target.checked)} />
            Bouton croix
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={c.closeOnOutside ?? true} onChange={e => updateContent('closeOnOutside', e.target.checked)} />
            Clic à l'extérieur
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={c.closeOnEsc ?? true} onChange={e => updateContent('closeOnEsc', e.target.checked)} />
            Touche Échap
          </label>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Affichage automatique</div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!c.autoOpen} onChange={e => updateContent('autoOpen', e.target.checked)} />
            Ouvrir automatiquement à l'arrivée
          </label>
          {c.autoOpen && (
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Délai (s)" value={c.autoDelay ?? 3} onChange={e => updateContent('autoDelay', parseInt(e.target.value) || 0)} />
              <Input type="number" placeholder="Fréquence (j)" value={c.frequencyDays ?? 7} onChange={e => updateContent('frequencyDays', parseInt(e.target.value) || 0)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BannerEditor({ section, updateContent }: { section: PageSection; updateContent: (k: string, v: any) => void }) {
  const c = section.content;
  const mediaType = c.mediaType || 'image';
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Type de média</Label>
        <Select value={mediaType} onValueChange={v => updateContent('mediaType', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Vidéo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mediaType === 'image' ? (
        <FileDropZone
          accept={['image']}
          folder="home/banners"
          currentFile={c.mediaUrl || ''}
          onUpload={url => updateContent('mediaUrl', url)}
          label="Glissez une image de bannière (paysage recommandé)"
        />
      ) : (
        <FileDropZone
          accept={['video']}
          folder="home/banners"
          currentFile={c.mediaUrl || ''}
          onUpload={url => updateContent('mediaUrl', url)}
          label="Glissez une vidéo MP4/WebM"
        />
      )}

      <Input placeholder="URL de redirection (ex: /boutique ou https://…)" value={c.link || ''} onChange={e => updateContent('link', e.target.value)} />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={!!c.newTab} onChange={e => updateContent('newTab', e.target.checked)} />
        Ouvrir dans un nouvel onglet
      </label>

      <div className="border-t border-border/40 pt-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Texte sur la bannière (optionnel)</div>
        <Input placeholder="Titre" value={c.title || ''} onChange={e => updateContent('title', e.target.value)} />
        <Input placeholder="Sous-titre" value={c.subtitle || ''} onChange={e => updateContent('subtitle', e.target.value)} />
        <Input placeholder="Libellé du bouton (vide = bannière entièrement cliquable)" value={c.buttonLabel || ''} onChange={e => updateContent('buttonLabel', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={c.textPosition || 'center'} onValueChange={v => updateContent('textPosition', v)}>
            <SelectTrigger><SelectValue placeholder="Position du texte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="top-left">Haut · Gauche</SelectItem>
              <SelectItem value="top-center">Haut · Centre</SelectItem>
              <SelectItem value="top-right">Haut · Droite</SelectItem>
              <SelectItem value="center-left">Milieu · Gauche</SelectItem>
              <SelectItem value="center">Milieu · Centre</SelectItem>
              <SelectItem value="center-right">Milieu · Droite</SelectItem>
              <SelectItem value="bottom-left">Bas · Gauche</SelectItem>
              <SelectItem value="bottom-center">Bas · Centre</SelectItem>
              <SelectItem value="bottom-right">Bas · Droite</SelectItem>
            </SelectContent>
          </Select>
          <div>
            <Label className="text-[10px]">Couleur du texte</Label>
            <Input type="color" value={c.textColor || '#ffffff'} onChange={e => updateContent('textColor', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] flex justify-between">
            <span>Voile sombre (opacité)</span>
            <span className="font-mono">{Math.round((c.overlayOpacity ?? 0.3) * 100)} %</span>
          </Label>
          <Slider
            value={[c.overlayOpacity ?? 0.3]}
            min={0} max={0.8} step={0.05}
            onValueChange={([v]) => updateContent('overlayOpacity', v)}
          />
        </div>
      </div>

      <div className="border-t border-border/40 pt-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Apparence</div>
        <Select value={c.height || 'md'} onValueChange={v => updateContent('height', v)}>
          <SelectTrigger><SelectValue placeholder="Hauteur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="sm">Petite (240 px)</SelectItem>
            <SelectItem value="md">Moyenne (360 px)</SelectItem>
            <SelectItem value="lg">Grande (480 px)</SelectItem>
            <SelectItem value="xl">XL (600 px)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={c.hoverEffect || 'none'} onValueChange={v => updateContent('hoverEffect', v)}>
          <SelectTrigger><SelectValue placeholder="Effet au survol" /></SelectTrigger>
          <SelectContent>
            {HOVER_EFFECTS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between rounded border p-2">
          <Label className="text-xs">Parallax au scroll</Label>
          <Switch checked={!!c.parallax} onCheckedChange={v => updateContent('parallax', v)} />
        </div>
        {c.parallax && (
          <div className="space-y-1">
            <Label className="text-[10px] flex justify-between">
              <span>Intensité parallax</span>
              <span className="font-mono">{(c.parallaxSpeed ?? 0.25).toFixed(2)}</span>
            </Label>
            <Slider
              value={[c.parallaxSpeed ?? 0.25]}
              min={0.1} max={0.6} step={0.05}
              onValueChange={([v]) => updateContent('parallaxSpeed', v)}
            />
          </div>
        )}
      </div>

      {mediaType === 'video' && (
        <div className="border-t border-border/40 pt-3 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Vidéo</div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={c.autoplay ?? true} onChange={e => updateContent('autoplay', e.target.checked)} />
            Lecture automatique
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={c.loop ?? true} onChange={e => updateContent('loop', e.target.checked)} />
            En boucle
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={c.muted ?? true} onChange={e => updateContent('muted', e.target.checked)} />
            Sans son
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!c.controls} onChange={e => updateContent('controls', e.target.checked)} />
            Afficher les contrôles
          </label>
        </div>
      )}
    </div>
  );
}

interface PageBuilderProps {
  sections: PageSection[];
  onChange: (sections: PageSection[]) => void;
}

export default function PageBuilder({ sections, onChange }: PageBuilderProps) {
  const [addType, setAddType] = useState<string>('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const addSection = (type: string) => {
    const newSection: PageSection = {
      id: generateId(),
      type: type as any,
      content: {},
      order: sections.length,
    };
    onChange([...sections, newSection]);
    setLastAddedId(newSection.id);
    setAddType('');
  };

  const updateSection = (index: number, section: PageSection) => {
    const updated = [...sections];
    updated[index] = section;
    onChange(updated);
  };

  const removeSection = (index: number) => {
    onChange(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Ajouter une section</h3>
          </div>
          <span className="text-xs text-muted-foreground">{sections.length} section{sections.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {SECTION_TYPES.map(t => (
            <Button
              key={t.value}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => addSection(t.value)}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {sections.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune section. Cliquez sur un bouton ci-dessus pour ajouter du contenu personnalisé.</p>
        </div>
      )}

      <div className="space-y-3">
        {sections.map((section, index) => (
          <SectionEditor
            key={section.id}
            section={section}
            onChange={s => updateSection(index, s)}
            onRemove={() => removeSection(index)}
            onMoveUp={() => moveSection(index, 'up')}
            onMoveDown={() => moveSection(index, 'down')}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
            defaultOpen={section.id === lastAddedId}
          />
        ))}
      </div>

      {sections.length > 2 && (
        <div className="flex gap-2 flex-wrap pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground w-full mb-1">+ Ajouter une autre section :</span>
          {SECTION_TYPES.map(t => (
            <Button
              key={`bottom-${t.value}`}
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => addSection(t.value)}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
