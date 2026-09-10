#!/usr/bin/env bash
#
# Réécrit l'en-tête Cache-Control des objets du bucket `media`.
#
# ── POURQUOI ────────────────────────────────────────────────────────────────
#
# Le transfert du 04/09 (§21 de PROJECT.md) a recopié les 1 894 objets sans
# en-tête `cache-control`. L'API Storage retombe alors sur `no-cache` : ni le
# navigateur ni le CDN ne gardent quoi que ce soit, chaque affichage retélécharge
# l'image entière. Mesuré le 10/09 : 444 Go de cached egress pour un quota de
# 250 Go, soit 178 %, sur 694 Mo d'objets réels.
#
# ⚠️ NE PAS ESSAYER DE CORRIGER `storage.objects.metadata` EN SQL. Cette colonne
# n'est qu'un miroir alimenté à l'upload, pour le listing. L'en-tête réellement
# servi vient du `Cache-Control` porté par l'objet S3. Testé le 10/09 : après un
# UPDATE de la métadonnée, la base affichait bien la nouvelle valeur et le CDN
# continuait de répondre `no-cache`.
#
# On passe donc par le protocole S3, avec une copie sur place
# (`--metadata-directive REPLACE`) : rien n'est téléchargé ni réenvoyé, seules
# les métadonnées sont réécrites côté serveur.
#
# ── UN AN, ET POURQUOI C'EST SÛR ────────────────────────────────────────────
#
# Les six points d'upload du code construisent tous un chemin horodaté :
#
#   categories/${Date.now()}.${ext}
#   products/${Date.now()}-${random}.${ext}
#   products/gifs/${productId}-${Date.now()}.gif
#
# Aucun chemin n'est jamais réutilisé — remplacer une image crée une nouvelle
# URL. Le cache immuable d'un an ne peut donc pas servir une version périmée.
#
# ⚠️ Si un jour un upload écrit à chemin fixe, cette hypothèse tombe et l'image
# restera figée un an chez les visiteurs qui l'ont déjà vue.
#
# ── PRÉREQUIS ───────────────────────────────────────────────────────────────
#
#   1. Dashboard → Storage → S3 Connection → New access key
#   2. Noter la région affichée sur cette même page
#   3. aws configure set aws_access_key_id     <KEY>    --profile hmp
#      aws configure set aws_secret_access_key <SECRET> --profile hmp
#      aws configure set region                <REGION> --profile hmp
#
# ── USAGE ───────────────────────────────────────────────────────────────────
#
#   ./scripts/fix-media-cache-control.sh --dry-run                  # inventaire
#   ./scripts/fix-media-cache-control.sh --only products/xxx.gif    # un objet
#   ./scripts/fix-media-cache-control.sh                            # tout
#
# Idempotent : les objets déjà à jour sont ignorés.
#
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-hzjzqdlyehclnpeqkier}"
ENDPOINT="${ENDPOINT:-https://${PROJECT_REF}.supabase.co/storage/v1/s3}"
PROFILE="${AWS_PROFILE_NAME:-hmp}"
BUCKET="${BUCKET:-media}"
CACHE_VALUE="public, max-age=31536000, immutable"

DRY_RUN=0
ONLY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --only)    ONLY="${2:-}"; shift 2 ;;
    *) echo "Option inconnue : $1" >&2; exit 2 ;;
  esac
done

aws_s3() { aws --endpoint-url "$ENDPOINT" --profile "$PROFILE" "$@"; }

echo "Bucket   : $BUCKET"
echo "Endpoint : $ENDPOINT"
echo "Valeur   : $CACHE_VALUE"
echo

if [[ -n "$ONLY" ]]; then
  keys="$ONLY"
else
  echo "Inventaire…"
  keys=$(aws_s3 s3api list-objects-v2 --bucket "$BUCKET" \
           --query 'Contents[].Key' --output text | tr '\t' '\n')
fi

total=0; done_n=0; skipped=0; failed=0

while IFS= read -r key; do
  [[ -z "$key" ]] && continue
  total=$((total + 1))

  # Type et cache actuels — on relit chaque objet pour ne PAS perdre son
  # Content-Type au passage : `REPLACE` efface toutes les métadonnées, il faut
  # donc les réécrire explicitement.
  meta=$(aws_s3 s3api head-object --bucket "$BUCKET" --key "$key" \
           --query '[ContentType,CacheControl]' --output text 2>/dev/null || echo "ERREUR")

  if [[ "$meta" == "ERREUR" ]]; then
    echo "  ✗ $key — lecture impossible"; failed=$((failed + 1)); continue
  fi

  ctype=$(echo "$meta" | cut -f1)
  ccur=$(echo "$meta" | cut -f2)
  [[ "$ctype" == "None" || -z "$ctype" ]] && ctype="application/octet-stream"

  if [[ "$ccur" == "$CACHE_VALUE" ]]; then
    skipped=$((skipped + 1)); continue
  fi

  if [[ $DRY_RUN -eq 1 ]]; then
    echo "  → $key  [$ctype]  $ccur"
    continue
  fi

  if aws_s3 s3api copy-object \
       --bucket "$BUCKET" --key "$key" \
       --copy-source "${BUCKET}/${key}" \
       --metadata-directive REPLACE \
       --cache-control "$CACHE_VALUE" \
       --content-type "$ctype" \
       >/dev/null 2>&1; then
    done_n=$((done_n + 1))
    printf '\r  %d traités…' "$done_n"
  else
    echo; echo "  ✗ $key — copie refusée"; failed=$((failed + 1))
  fi
done <<< "$keys"

echo; echo
echo "Objets      : $total"
echo "Traités     : $done_n"
echo "Déjà à jour : $skipped"
echo "Échecs      : $failed"
echo
echo "Contrôle :"
echo "  curl -sI https://${PROJECT_REF}.supabase.co/storage/v1/object/public/${BUCKET}/<chemin> | grep -i cache"
