#!/bin/bash
# ==============================================================
# Script de Inicio Rápido - Loc-OS Linux
# Esteban Correa Personal Trainer
# ==============================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

# Configurar Node en el PATH local si existe el binario portátil
if [ -d "$DIR/.node/bin" ]; then
    export PATH="$DIR/.node/bin:$PATH"
fi

echo "=========================================================="
echo "  ESTEBAN CORREA - PERSONAL TRAINER PLATAFORMA"
echo "  Optimizada para Loc-OS Linux"
echo "=========================================================="
echo "Iniciando servidor de desarrollo Vite en http://localhost:3000..."
echo ""

npm run dev
