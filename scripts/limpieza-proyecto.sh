#!/bin/bash

# ═══════════════════════════════════════════════════════════════════
# Script de Limpieza del Proyecto Sirius SG-SST
# ═══════════════════════════════════════════════════════════════════
# Elimina carpetas vacías y archivos sin uso identificados en el
# informe de organización.
#
# Uso: bash scripts/limpieza-proyecto.sh [--dry-run]
# ═══════════════════════════════════════════════════════════════════

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DRY_RUN=false

# Verificar si es dry-run
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo -e "${YELLOW}[MODO DRY-RUN]${NC} No se eliminará nada, solo se mostrará lo que se haría."
  echo ""
fi

# Función para eliminar (o simular eliminación)
remove_item() {
  local item="$1"
  if [ -e "$item" ]; then
    if [ "$DRY_RUN" = true ]; then
      echo -e "${YELLOW}[DRY-RUN]${NC} Se eliminaría: $item"
    else
      rm -rf "$item"
      echo -e "${RED}[✓]${NC} Eliminado: $item"
    fi
  else
    echo -e "${GREEN}[OK]${NC} Ya no existe: $item"
  fi
}

echo "═══════════════════════════════════════════════════════════════════"
echo " Limpieza del Proyecto Sirius SG-SST"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ───────────────────────────────────────────────────────────────────
# 1. CARPETAS VACÍAS EN src/
# ───────────────────────────────────────────────────────────────────
echo "1️⃣  Eliminando carpetas vacías en src/app/api/..."
echo ""

# API - Inducciones
remove_item "src/app/api/inducciones/debug"
remove_item "src/app/api/inducciones/firma-cifrada"
remove_item "src/app/api/inducciones/test-filter"

# API - Inspecciones Áreas
remove_item "src/app/api/inspecciones-areas/foto-criterio/actualizar"
remove_item "src/app/api/inspecciones-areas/foto-criterio/presign"

echo ""
echo "2️⃣  Eliminando carpetas de configuración sin uso..."
echo ""

remove_item "src/config"
remove_item "src/app/dashboard/sgsst/vehicular/components"

echo ""
echo "3️⃣  Revisando módulo sociodemográfico..."
echo ""

# Verificar si hay archivos en use-cases
if [ -d "src/modules/sociodemografico/application/use-cases" ]; then
  FILE_COUNT=$(find "src/modules/sociodemografico/application/use-cases" -type f | wc -l)
  if [ "$FILE_COUNT" -eq 0 ]; then
    remove_item "src/modules/sociodemografico/application/use-cases"
    echo -e "${YELLOW}[INFO]${NC} Considera revisar si todo el módulo sociodemográfico está en uso"
  else
    echo -e "${GREEN}[OK]${NC} Carpeta use-cases contiene archivos, no se elimina"
  fi
else
  echo -e "${GREEN}[OK]${NC} Carpeta use-cases ya no existe"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo " Archivos en public/"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ───────────────────────────────────────────────────────────────────
# 2. ARCHIVOS SIN USO EN public/
# ───────────────────────────────────────────────────────────────────
echo "4️⃣  Eliminando archivos de prueba y defaults sin uso..."
echo ""

# Video de prueba (archivo grande)
remove_item "public/ESTRELLAS PRUEBA 2.mp4"

# Defaults de Next.js/Vercel
remove_item "public/next.svg"
remove_item "public/vercel.svg"

echo ""
echo "5️⃣  Verificando SVGs potencialmente sin uso..."
echo ""

# Verificar si los SVGs están en uso
SVG_FILES=("file.svg" "globe.svg" "window.svg")

for svg in "${SVG_FILES[@]}"; do
  if [ -f "public/$svg" ]; then
    # Buscar referencias en src/
    if grep -r "$svg" src/ > /dev/null 2>&1; then
      echo -e "${GREEN}[EN USO]${NC} public/$svg - encontradas referencias en código"
    else
      echo -e "${YELLOW}[SIN REF]${NC} public/$svg - no se encontraron referencias"
      if [ "$DRY_RUN" = false ]; then
        read -p "¿Eliminar public/$svg? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
          remove_item "public/$svg"
        else
          echo -e "${GREEN}[SKIP]${NC} Conservado: public/$svg"
        fi
      fi
    fi
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo " Resumen de Limpieza"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}[MODO DRY-RUN]${NC} Ningún archivo fue eliminado."
  echo ""
  echo "Para ejecutar la limpieza real, ejecuta:"
  echo "  bash scripts/limpieza-proyecto.sh"
else
  echo -e "${GREEN}[✓] Limpieza completada${NC}"
  echo ""
  echo "Acciones realizadas:"
  echo "  - Eliminadas carpetas vacías de API"
  echo "  - Eliminadas carpetas de configuración sin uso"
  echo "  - Eliminados archivos de prueba en public/"
  echo "  - Verificados SVGs en public/"
  echo ""
  echo "Próximos pasos recomendados:"
  echo "  1. Ejecutar: npm run build"
  echo "  2. Revisar que todo funcione correctamente"
  echo "  3. Commit de cambios si todo está OK"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
