#!/bin/bash
echo "Starting Bubblewrap init..."
echo ""
echo "Y" | bubblewrap init \
  --manifest https://app-tela-corporativa.vercel.app/manifest.json \
  --package-id com.nexdisplay.app \
  --app-name NEXDISPLAY \
  --launcher-name "NEXDISPLAY - Gestão Inteligente" \
  --version 1.0.0 \
  --version-code 1 \
  --min-sdk-version 21

echo ""
echo "Init completed!"
