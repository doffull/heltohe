#!/usr/bin/env node
/**
 * Redimensionnement des médias trop lourds du bucket `media`.
 *
 * ── Pourquoi ce script existe ──────────────────────────────────────────────
 *
 * 160 Go d'egress par jour pour une boutique de cette taille. Le
 * `cache-control` n'est plus en cause (corrigé le 10/09, vérifié en GET sur
 * 85 objets) : ce qui coûte, c'est le POIDS des fichiers servis.
 *
 * Mesuré le 17/09 : 1 917 objets, 2,4 Go, 1,3 Mo de moyenne. Et surtout
 * **189 images de plus de 3 Mo qui pèsent 52 % du total** — dont des PNG
 * 4096 × 4096 de 26 Mo affichés dans des emplacements de 800 px.
 *
 * Ce script s'attaque à ce lot-là, et à lui seul. C'est une mesure : on
 * allège, on observe l'egress quelques jours, et on décide ensuite d'un
 * traitement à l'upload.
 *
 * ── Ce qu'il fait, et ce qu'il ne fait PAS ─────────────────────────────────
 *
 * Il REDIMENSIONNE. Il ne convertit RIEN : un PNG reste un PNG, un JPEG reste
 * un JPEG, la transparence est préservée. Deux raisons :
 *
 *  1. `virtual-tryon` envoie les images produit à Gemini ; on ne veut pas
 *     changer sous ses pieds la nature des fichiers qu'il consomme ;
 *  2. plusieurs galeries sont en PNG + alpha — un passage en JPEG aplatirait
 *     la transparence sur du noir.
 *
 * Le gain n'en souffre presque pas : les PNG d'origine sont mal encodés, et
 * le seul ré-encodage par libvips fait déjà ×2,9 **à dimensions identiques**.
 *
 * Le chemin de chaque objet est INCHANGÉ. Aucune URL ne bouge, donc aucune
 * ligne de base ni de code à modifier.
 *
 * ── ⚠️ La conséquence du chemin fixe ───────────────────────────────────────
 *
 * `src/lib/storageUpload.ts` prévient : le cache d'un an (`immutable`) ne
 * tient que parce que tous les chemins d'envoi sont horodatés, donc jamais
 * réutilisés. Ce script écrit à chemin FIXE — il sort donc de cette
 * hypothèse, en connaissance de cause.
 *
 * Conséquence : un visiteur qui détient déjà l'image continuera de voir
 * l'ancienne version, lourde, jusqu'à un an. C'est SANS effet sur l'objectif :
 * ce visiteur ne retéléchargeait déjà rien. L'egress vient des caches froids,
 * et eux recevront la version allégée. Le CDN Supabase, lui, est purgé à
 * l'upsert.
 *
 * ── Le backup est LOCAL, et c'est un engagement ────────────────────────────
 *
 * Aucune copie n'est conservée côté serveur. Le dossier de backup est la
 * SEULE trace des originaux : le perdre, c'est perdre les masters 4096 px.
 *
 * D'où l'ordre des opérations, qui n'est pas négociable :
 *
 *     télécharger → écrire le backup → RELIRE et vérifier le SHA-256
 *                → seulement alors, redimensionner et réécrire
 *
 * Un backup qui ne se relit pas à l'identique fait sauter le fichier. Aucun
 * écrasement ne peut précéder un backup vérifié.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *
 *   node scripts/resize-media.mjs                          # inventaire seul
 *   node scripts/resize-media.mjs --only <chemin> --apply  # un seul objet
 *   node scripts/resize-media.mjs --apply                  # le lot complet
 *   node scripts/resize-media.mjs --rollback backup-media/<dossier>
 *
 * Prérequis : Node ≥ 18, `npm i -D sharp`, et dans `.env` :
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_KEY=sb_secret_...     (jamais commité)
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── Réglages ───────────────────────────────────────────────────────────────

const BUCKET = 'media';

/** Seuil d'entrée dans le lot. En dessous, on ne touche à rien. */
const MIN_SIZE_MB = 3;

/**
 * Largeur cible par préfixe — la PREMIÈRE correspondance gagne, donc l'ordre
 * compte : les règles les plus spécifiques d'abord.
 *
 * Les valeurs ne sont pas arbitraires. L'image produit s'affiche au maximum
 * à ~812 px de large (conteneur `max-w-[1500px]`, colonne `1.15fr`, gouttière
 * 56 px). Avec le zoom ramené à ×2,5, un rendu 1:1 au zoom maximal demande
 * 812 × 2,5 ≈ 2 030 px — d'où 2048.
 *
 * ⚠️ Ces deux valeurs sont liées : baisser `products/*` sous 2048 px OU
 * remonter le zoom au-dessus de ×2,5 rendra les images floues au zoom
 * maximal. Voir `ProductImageGallery.tsx`.
 *
 * Le décor n'a pas de zoom : 1600 px suffit largement. Les fonds de hero
 * s'affichent pleine largeur, d'où 1920.
 */
const WIDTH_RULES = [
  { prefix: 'hero/background/', width: 1920 },
  { prefix: 'hero/mobile/', width: 1080 },
  { prefix: 'products/', width: 2048 },
  { prefix: '', width: 1600 },
];

/**
 * Qualité JPEG. Mesuré le 17/09 sur une image réelle du catalogue, écart
 * moyen par rapport à un redimensionnement sans perte (échelle 0–255) :
 *
 *     q75 → 3,04   ·   q80 → 2,74   ·   q85 → 2,41   ·   q90 → 2,01
 *
 * Sur les ZONES SOMBRES — le cas défavorable ici, le catalogue étant très
 * noir — q85 donne 1,80, sous le seuil de visibilité (~3). Passer à q90
 * coûte 26 % de poids pour gagner 0,3 point : ça ne se voit pas.
 */
const JPEG_QUALITY = 85;

/**
 * Gain minimal pour accepter la réécriture.
 *
 * Réécrire un objet pour 2 % de moins ne vaut ni l'appel réseau, ni la perte
 * du master, ni l'invalidation du cache CDN.
 */
const MIN_GAIN_RATIO = 0.9;

/**
 * Les GIF sont EXCLUS, décision du 17/09 : ils se traitent par conversion en
 * MP4/WebM (×10–20), pas par redimensionnement, et c'est la phase 2. Les
 * redimensionner ici les ré-encoderait image par image pour un gain médiocre.
 */
const SKIPPED_MIME = new Set(['image/gif']);

// ── Arguments ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};

const APPLY = has('--apply');
const ROLLBACK_DIR = valueOf('--rollback');
const ONLY = valueOf('--only');
const MIN_SIZE = Number(valueOf('--min-size') ?? MIN_SIZE_MB) * 1024 * 1024;

// ── Environnement ──────────────────────────────────────────────────────────

/**
 * `.env` lu à la main : le script tourne hors Vite, et n'ajouter une
 * dépendance (`dotenv`) pour trois lignes ne se justifie pas.
 */
function loadEnv() {
  const out = {};
  const path = join(ROOT, '.env');
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis (.env ou environnement).');
  process.exit(1);
}

const AUTH = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

/**
 * Valeur exacte servie aujourd'hui par les objets corrigés le 10/09.
 *
 * ⚠️ Elle DOIT être réémise à chaque upload. L'API Storage retombe sur
 * `no-cache` quand l'en-tête est absent — c'est la cause même des 444 Go
 * d'egress de septembre. Réécrire un objet sans cet en-tête le rendrait
 * bien plus coûteux qu'avant, allégé ou non.
 */
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

// ── Accès au Storage ───────────────────────────────────────────────────────

/** Liste récursive du bucket. Un « dossier » se reconnaît à son `id` nul. */
async function listAll(prefix = '', acc = []) {
  let offset = 0;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: { ...AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' },
      }),
    });
    if (!res.ok) throw new Error(`list ${prefix} → ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const row of rows) {
      if (row.id === null || !row.metadata) await listAll(`${prefix}${row.name}/`, acc);
      else acc.push({ path: `${prefix}${row.name}`, size: row.metadata.size, mime: row.metadata.mimetype });
    }
    if (rows.length < 100) break;
    offset += 100;
  }
  return acc;
}

/**
 * Téléchargement par l'endpoint AUTHENTIFIÉ, pas l'URL publique.
 *
 * L'URL publique passe par le CDN, qui peut servir une copie en cache — donc
 * potentiellement une version déjà réécrite. On sauvegarderait alors un
 * « original » qui n'en est pas un. L'endpoint authentifié lit le stockage.
 */
async function download(path) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, { headers: AUTH });
  if (!res.ok) throw new Error(`download ${path} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function upload(path, buffer, contentType) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
    method: 'POST',
    headers: {
      ...AUTH,
      'Content-Type': contentType,
      'cache-control': CACHE_CONTROL,
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`upload ${path} → ${res.status} ${await res.text()}`);
}

// ── Traitement d'une image ─────────────────────────────────────────────────

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function targetWidth(path) {
  return WIDTH_RULES.find((r) => path.startsWith(r.prefix)).width;
}

/**
 * Redimensionne en conservant le format d'origine.
 *
 * `.rotate()` sans argument applique l'orientation EXIF **avant** le
 * redimensionnement. Sans lui, une photo prise à l'horizontale et corrigée
 * par son seul en-tête EXIF ressortirait pivotée : sharp ne recopie pas les
 * métadonnées, l'orientation serait perdue en silence.
 */
async function resize(sharp, buffer, width, mime) {
  const pipeline = sharp(buffer).rotate().resize({ width, withoutEnlargement: true });
  if (mime === 'image/png') {
    // PNG = sans perte. Tout le gain vient des dimensions et d'un encodeur
    // meilleur que celui d'origine — mesuré ×2,9 à dimensions inchangées.
    return pipeline.png({ compressionLevel: 9, effort: 10 }).toBuffer();
  }
  if (mime === 'image/webp') return pipeline.webp({ quality: JPEG_QUALITY }).toBuffer();
  return pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
}

const mb = (n) => (n / 1048576).toFixed(2);

// ── Rollback ───────────────────────────────────────────────────────────────

/**
 * Restaure depuis un dossier de backup, en se fiant au MANIFESTE et non au
 * contenu du dossier : le manifeste ne liste que ce qui a réellement été
 * écrasé. Remonter tout le dossier réécrirait aussi les fichiers sautés.
 *
 * Le SHA-256 de chaque fichier local est revérifié avant renvoi : restaurer
 * un backup corrompu serait pire que ne rien restaurer.
 */
async function rollback(dir) {
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`✗ Aucun manifest.json dans ${dir}`);
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const done = manifest.entries.filter((e) => e.status === 'applied');
  console.log(`↩ Restauration de ${done.length} objet(s) depuis ${dir}\n`);

  let ok = 0, failed = 0;
  for (const entry of done) {
    try {
      const buf = await readFile(join(dir, entry.path));
      if (sha256(buf) !== entry.sha256Before) throw new Error('SHA-256 du backup non conforme');
      if (APPLY) await upload(entry.path, buf, entry.mime);
      ok += 1;
      console.log(`  ✓ ${entry.path}`);
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${entry.path} — ${err.message}`);
    }
  }
  console.log(`\n${APPLY ? 'Restauré' : '[dry-run] Restaurerait'} : ${ok} · échecs : ${failed}`);
  if (!APPLY) console.log('→ ajouter --apply pour écrire réellement.');
}

// ── Programme principal ────────────────────────────────────────────────────

async function main() {
  if (ROLLBACK_DIR) return rollback(resolve(ROLLBACK_DIR));

  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    console.error('✗ `sharp` est absent. Installer : npm i -D sharp');
    process.exit(1);
  }

  console.log(`Projet   : ${SUPABASE_URL}`);
  console.log(`Mode     : ${APPLY ? '⚠️  APPLY (écriture réelle)' : 'dry-run (aucune écriture)'}`);
  console.log(`Seuil    : ${mb(MIN_SIZE)} Mo\n`);

  const all = await listAll();
  let targets = all
    .filter((o) => (o.mime || '').startsWith('image/'))
    .filter((o) => !SKIPPED_MIME.has(o.mime))
    .filter((o) => o.size > MIN_SIZE)
    .sort((a, b) => b.size - a.size);

  if (ONLY) targets = targets.filter((o) => o.path === ONLY);

  if (targets.length === 0) {
    console.log(ONLY ? `Aucun objet éligible pour « ${ONLY} ».` : 'Aucun objet au-dessus du seuil.');
    return;
  }

  const totalBefore = targets.reduce((s, o) => s + o.size, 0);
  console.log(`${targets.length} objet(s) — ${mb(totalBefore)} Mo\n`);

  // Le dossier vit DANS le projet (décision du 17/09) et porte l'horodatage
  // du lot : deux passes ne peuvent pas se recouvrir.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = join(ROOT, 'backup-media', stamp);
  if (APPLY) await mkdir(backupDir, { recursive: true });

  const entries = [];
  let savedTotal = 0, applied = 0, skipped = 0, failed = 0;

  for (const obj of targets) {
    const width = targetWidth(obj.path);
    const label = `${obj.path.slice(0, 58).padEnd(58)} ${mb(obj.size).padStart(6)} Mo`;

    try {
      const original = await download(obj.path);
      const resized = await resize(sharp, original, width, obj.mime);
      const gain = resized.length / original.length;

      if (gain > MIN_GAIN_RATIO) {
        skipped += 1;
        console.log(`  – ${label} → gain négligeable (${Math.round((1 - gain) * 100)} %), ignoré`);
        entries.push({ path: obj.path, mime: obj.mime, status: 'skipped', reason: 'gain négligeable' });
        continue;
      }

      if (!APPLY) {
        savedTotal += original.length - resized.length;
        console.log(`  · ${label} → ${mb(resized.length).padStart(6)} Mo  ×${(1 / gain).toFixed(1)}  (${width}px)`);
        continue;
      }

      // ── Backup AVANT toute écriture, puis relecture vérifiée ────────────
      const backupPath = join(backupDir, obj.path);
      await mkdir(dirname(backupPath), { recursive: true });
      await writeFile(backupPath, original);

      const reread = await readFile(backupPath);
      const digest = sha256(original);
      if (reread.length !== original.length || sha256(reread) !== digest) {
        throw new Error('backup local non conforme à la relecture — objet laissé intact');
      }

      await upload(obj.path, resized, obj.mime);

      savedTotal += original.length - resized.length;
      applied += 1;
      entries.push({
        path: obj.path,
        mime: obj.mime,
        width,
        sizeBefore: original.length,
        sizeAfter: resized.length,
        sha256Before: digest,
        sha256After: sha256(resized),
        status: 'applied',
      });
      console.log(`  ✓ ${label} → ${mb(resized.length).padStart(6)} Mo  ×${(1 / gain).toFixed(1)}  (${width}px)`);
    } catch (err) {
      failed += 1;
      entries.push({ path: obj.path, mime: obj.mime, status: 'failed', error: err.message });
      console.error(`  ✗ ${label} — ${err.message}`);
    }
  }

  if (APPLY) {
    await writeFile(
      join(backupDir, 'manifest.json'),
      JSON.stringify({ createdAt: new Date().toISOString(), bucket: BUCKET, entries }, null, 2),
    );
  }

  console.log('\n────────────────────────────────────────────');
  console.log(`${APPLY ? 'Réécrits' : 'À réécrire'} : ${applied || targets.length - skipped}`);
  if (skipped) console.log(`Ignorés          : ${skipped}`);
  if (failed) console.log(`Échecs           : ${failed}`);
  console.log(`Poids avant      : ${mb(totalBefore)} Mo`);
  console.log(`Économie         : ${mb(savedTotal)} Mo (${Math.round((100 * savedTotal) / totalBefore)} %)`);
  if (APPLY) {
    console.log(`\nBackup : ${backupDir}`);
    console.log('⚠️  Seule copie des originaux — ne pas déplacer sans mettre à jour le rollback.');
  } else {
    console.log('\n→ ajouter --apply pour écrire réellement (backup local automatique).');
  }
}

main().catch((err) => {
  console.error('\n💥', err.message);
  process.exit(1);
});
