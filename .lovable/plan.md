# Refonte RouletteWheel — nettoyage & machine d'états

## Problèmes actuels

- `fromRef.current = fromRef.current;` ligne morte.
- `lastRotationRef` utilisée avant déclaration (TDZ-like, fonctionne par chance car ref).
- Animation JS (tick) et animation CSS (`transition: transform`) tournent en parallèle → désynchronisation possible entre les ticks et la rotation visuelle.
- Easing JS (`1 - (1-t)^3`) ≠ easing CSS (`cubic-bezier(0.22,0.61,0.36,1)`) → ticks décalés.
- Géométrie SVG (paths, labels, hub, pointer) noyée dans le composant principal.
- Pas d'état explicite : `spinning` booléen + `rotation` number, pas de phase "settling" pour gérer la fin propre.

## Architecture cible

```text
src/components/games/roulette/
  RouletteWheel.tsx       ← orchestrateur + machine d'états
  wheelGeometry.ts        ← maths pures (slice path, label/icon positions, font sizing)
  WheelSvg.tsx            ← rendu SVG pur (props: segments, size, geometry)
  WheelPointer.tsx        ← pointeur (hors rotation)
  useSpinAnimation.ts     ← hook: state machine + tick sync
```

## 1. `wheelGeometry.ts` (pur, testable)

```ts
export interface SliceGeom { path: string; labelX: number; labelY: number; iconX: number; iconY: number; rotDeg: number; }
export function computeGeometry(size: number, count: number): { r, innerR, slices: SliceGeom[], labelFont, iconFont, maxChord }
```
Aucune dépendance React. Calculé une fois par `useMemo(size, count)`.

## 2. `WheelSvg.tsx`

Reçoit `segments`, `geometry`, `rotation`, `durationMs`. Render SVG + `transition: transform`. Aucune logique.

## 3. `useSpinAnimation.ts`

Machine d'états explicite :

```ts
type Phase = 'idle' | 'spinning' | 'settling';
useSpinAnimation({ targetRotation, durationMs, segmentCount, onTick, onSettled })
  → { phase, currentRotation }
```

Logique :
- `idle` → `spinning` quand `targetRotation` change.
- Pendant `spinning` : `requestAnimationFrame` calcule la rotation interpolée avec **le même easing que CSS** (bezier sampling helper), détecte le passage de segment sous le pointeur, appelle `onTick`.
- À `t === 1` → phase `settling` (50 ms tampon) → `idle` + `onSettled`.
- Rotation visuelle pilotée par CSS `transition` côté `WheelSvg` (perf GPU), tick pilotée par rAF avec easing identique → synchro garantie.
- Helper `sampleCubicBezier(p1x, p1y, p2x, p2y)` partagé entre CSS et JS.

## 4. `RouletteWheel.tsx` (nouveau)

```tsx
export function RouletteWheel({ segments, rotation, onTick, onSettled, durationMs }) {
  const geom = useMemo(() => computeGeometry(size, segments.length), [size, segments.length]);
  const { phase } = useSpinAnimation({ targetRotation: rotation, durationMs, segmentCount: segments.length, onTick, onSettled });
  return (
    <Container ref={containerRef}>
      <WheelSvg segments={segments} geometry={geom} rotation={rotation} durationMs={durationMs} />
      <WheelPointer size={size} />
    </Container>
  );
}
```

- `ResizeObserver` conservé pour `size`.
- Suppression `lastRotationRef`, `fromRef`, `toRef`, lignes mortes.
- Ajout prop `onSettled` (optionnelle) pour que `RouletteFab` n'utilise plus `setTimeout(SPIN_DURATION + 100)` → fin gérée par la wheel.

## 5. Intégration `RouletteFab.tsx`

Remplacer le `setTimeout` post-spin par `onSettled={() => { setSpinning(false); setResult(data); sounds.win(); persistResult(data); }}`. Tout le reste inchangé (FAB drag, dialog, admin).

## Détails techniques

- **Easing partagé** : constante `SPIN_BEZIER = [0.22, 0.61, 0.36, 1]`, utilisée pour `transition-timing-function` ET pour `sampleCubicBezier()` côté JS.
- **Tick detection** : index = `floor(((360 - currentRot%360) % 360) / sliceDeg)`. Inchangé mais isolé dans le hook.
- **Cleanup** : `cancelAnimationFrame` dans le return de l'effect, reset des refs.
- **Compat** : API publique `<RouletteWheel segments rotation spinning onTick durationMs />` conservée + nouveau `onSettled`. `spinning` prop devient optionnelle (déduite de la machine).

## Hors-scope

- Pas de changement visuel (couleurs, tailles, ombres identiques).
- Pas de modif des sons, du RPC, ni de `useRoulette`.
- `GameScratchFab` non touché.
