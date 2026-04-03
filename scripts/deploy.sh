#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WRANGLER="$PROJECT_DIR/server/node_modules/.bin/wrangler"
R2_BUCKET="${R2_BUCKET:-isle}"

# ── Parse arguments ────────────────────────────────────────────
ENV=""
SKIP_BUILD=false
INCLUDE_ASSETS=false

for arg in "$@"; do
    case "$arg" in
        --skip-build)     SKIP_BUILD=true ;;
        --include-assets) INCLUDE_ASSETS=true ;;
        dev|production)   ENV="$arg" ;;
        *)                echo "Unknown argument: $arg"; echo "Usage: $0 [dev|production] [--skip-build] [--include-assets]"; exit 1 ;;
    esac
done

ENV="${ENV:-dev}"

# ── Environment configuration ──────────────────────────────────
case "$ENV" in
    dev)
        R2_PREFIX="dev/"
        DOMAIN="dev.isle.pizza"
        ;;
    production)
        R2_PREFIX=""
        DOMAIN="isle.pizza"
        ;;
esac

# ── Check prerequisites ───────────────────────────────────────
if [ ! -f "$WRANGLER" ]; then
    echo "Error: wrangler not found at $WRANGLER"
    echo "Run 'npm install' in $PROJECT_DIR/server/ first."
    exit 1
fi

# ── Compute versions ──────────────────────────────────────────
cd "$PROJECT_DIR"
FRONTEND_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

WASM_VERSION=""
if [ -f "$PROJECT_DIR/isle.js" ]; then
    WASM_VERSION=$(grep -oP 'wasmVersion"\]\s*=\s*"\K[^"]+' "$PROJECT_DIR/isle.js" 2>/dev/null || echo "")
fi

echo "Environment:      $ENV"
echo "R2 prefix:        ${R2_PREFIX:-(root)}"
echo "Domain:           $DOMAIN"
echo "Frontend version: $FRONTEND_VERSION"
echo "WASM version:     ${WASM_VERSION:-not found}"
echo ""

# ── Production safety gate ─────────────────────────────────────
if [ "$ENV" = "production" ]; then
    echo "WARNING: You are about to deploy to PRODUCTION ($DOMAIN)"
    read -r -p "Continue? [y/N] " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
fi

# ── Build ──────────────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
    echo "Building frontend..."
    cd "$PROJECT_DIR"
    RELAY_URL="wss://relay.isle.pizza" API_URL="https://api.isle.pizza" BUILD_VERSION="$FRONTEND_VERSION" npm run build
    echo ""
fi

# ── Verify dist ────────────────────────────────────────────────
if [ ! -d "$PROJECT_DIR/dist" ] || [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
    echo "Error: dist/ directory not found or empty. Run without --skip-build first."
    exit 1
fi

# ── Content-type mapping ──────────────────────────────────────
get_content_type() {
    case "${1##*.}" in
        html) echo "text/html; charset=utf-8" ;;
        js)   echo "application/javascript; charset=utf-8" ;;
        css)  echo "text/css; charset=utf-8" ;;
        json) echo "application/json; charset=utf-8" ;;
        wasm) echo "application/wasm" ;;
        webp) echo "image/webp" ;;
        png)  echo "image/png" ;;
        svg)  echo "image/svg+xml" ;;
        gif)  echo "image/gif" ;;
        mp3)  echo "audio/mpeg" ;;
        pdf)  echo "application/pdf" ;;
        bin)  echo "application/octet-stream" ;;
        map)  echo "application/json" ;;
        *)    echo "application/octet-stream" ;;
    esac
}

# ── Upload dist/ to R2 ────────────────────────────────────────
echo "Uploading to R2 (bucket: $R2_BUCKET, prefix: ${R2_PREFIX:-(root)})..."

cd "$PROJECT_DIR/dist"
find . -type f | sort | while read -r file; do
    file="${file#./}"

    # Skip asset directories unless --include-assets
    if [ "$INCLUDE_ASSETS" = false ]; then
        case "$file" in
            images/*|audio/*|pdf/*|workbox/*) continue ;;
        esac
    fi

    key="${R2_PREFIX}${file}"
    ct=$(get_content_type "$file")
    echo "  $key ($ct)"
    "$WRANGLER" r2 object put "$R2_BUCKET/$key" --file "$PROJECT_DIR/dist/$file" --content-type "$ct" --remote 2>/dev/null
done

echo ""

# ── Upload source map to symbols/ ─────────────────────────────
if [ -n "$WASM_VERSION" ] && [ -f "$PROJECT_DIR/isle.wasm.map" ]; then
    SYMBOLS_KEY="symbols/${WASM_VERSION}/isle.wasm.map"
    echo "Uploading source map: $SYMBOLS_KEY"
    "$WRANGLER" r2 object put "$R2_BUCKET/$SYMBOLS_KEY" --file "$PROJECT_DIR/isle.wasm.map" --content-type "application/json" --remote 2>/dev/null
else
    echo "Warning: Skipping source map upload (wasm version: '${WASM_VERSION:-}', map file exists: $([ -f "$PROJECT_DIR/isle.wasm.map" ] && echo yes || echo no))"
fi

echo ""
echo "Deploy complete!"
echo "  Environment:      $ENV ($DOMAIN)"
echo "  Frontend version: $FRONTEND_VERSION"
echo "  WASM version:     ${WASM_VERSION:-unknown}"
echo ""
echo "Remember to purge the Cloudflare cache for $DOMAIN."
