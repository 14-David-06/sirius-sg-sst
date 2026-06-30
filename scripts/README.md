# 🛠️ Scripts de Utilidad - Sirius SG-SST

Colección de scripts para mantenimiento, migración y utilidad del proyecto.

## ⚠️ IMPORTANTE - Seguridad de Datos

**NUNCA incluyas el output completo de estos scripts en commits, issues o documentación pública.**

Los scripts de diagnóstico pueden mostrar información sensible:
- Field IDs de Airtable
- Base IDs y Table IDs
- Nombres de colaboradores
- Números de placa
- Cualquier dato del sistema

**Antes de compartir output:** Limpia o redacta manualmente cualquier información sensible.

---

## 📜 Scripts Disponibles

### 1. `limpieza-proyecto.sh`
**Propósito:** Eliminar archivos sin uso y carpetas vacías del proyecto.

```bash
# Modo dry-run (ver qué se eliminaría)
bash scripts/limpieza-proyecto.sh --dry-run

# Ejecutar limpieza real
bash scripts/limpieza-proyecto.sh
```

**Elimina:**
- Carpetas vacías en `src/app/api/`
- Carpetas de configuración sin uso
- Archivos de prueba en `public/`
- Defaults de Next.js/Vercel sin uso

**Documentación:** Ver `INFORME_ORGANIZACION_PROYECTO.md`

---

### 2. `migrar-vehiculos-excel.js`
**Propósito:** Migrar datos de vehículos desde Excel al módulo vehicular.

```bash
# SIEMPRE ejecutar primero en dry-run
node scripts/migrar-vehiculos-excel.js --dry-run

# Migración real (después de verificar dry-run)
node scripts/migrar-vehiculos-excel.js

# Con puerto personalizado
node scripts/migrar-vehiculos-excel.js --dry-run --port=3001
```

**Requisitos:**
- ✅ Servidor Next.js corriendo (`npm run dev`)
- ✅ ExcelJS instalado (`npm install exceljs`)
- ✅ Archivo Excel en: `docs/Personal que se transporta en MOTO.xlsx`
- ✅ Variables de entorno del módulo vehicular configuradas

**Qué hace:**
1. Lee Excel con 13 colaboradores
2. Busca cada uno en Nómina Core por cédula
3. Genera placas temporales (Excel no tiene placas)
4. Registra vehículos en Airtable vía API
5. Registra documentos (SOAT y tecnomecánica)
6. Genera reporte detallado

**Documentación completa:** Ver `docs/modulos/vehicular/GUIA_MIGRACION_EXCEL.md`

---

### 3. `diagnostico-vehicular.js`
**Propósito:** Diagnosticar problemas de configuración y datos del módulo vehicular.

```bash
node scripts/diagnostico-vehicular.js
```

**Verifica:**
- ✅ Variables de entorno requeridas
- ✅ Conexión a Airtable (bases Personal y SG-SST)
- ✅ Vehículos sin datos o configuración incorrecta
- ✅ Lookup de personal (resolución de nombres)

**⚠️ Output sensible:** NO compartir el output sin limpiar Field IDs y datos de personal.

---

### 4. `descubrir-fields-vehicular.js`
**Propósito:** Descubrir Field IDs correctos de la tabla `veh_vehiculos` en Airtable.

```bash
node scripts/descubrir-fields-vehicular.js
```

**Genera:**
- Lista completa de campos con sus Field IDs
- Configuración sugerida para `.env.local`
- Mapeo automático de campos conocidos

**⚠️ Output sensible:** Los Field IDs son información de configuración sensible.

---

## 🚀 Requisitos Generales

### Para Scripts de Bash
- Git Bash (Windows) o Bash (Linux/Mac)
- Permisos de ejecución: `chmod +x scripts/nombre-script.sh`

### Para Scripts de Node.js
- Node.js 20.x o superior
- Dependencias instaladas: `npm install`
- Variables de entorno configuradas (`.env.local`)

---

## 📂 Estructura

```
scripts/
├── README.md                          # Este archivo
├── limpieza-proyecto.sh               # Limpieza de archivos sin uso
├── migrar-vehiculos-excel.js          # Migración de datos vehiculares
├── diagnostico-vehicular.js           # Diagnóstico módulo vehicular
├── descubrir-fields-vehicular.js      # Descubrir Field IDs de Airtable
└── [otros scripts de migración...]    # Scripts legacy de módulos específicos
```

---

## 🔧 Desarrollo de Nuevos Scripts

### Convenciones

1. **Nombres descriptivos:** `verbo-sustantivo-contexto.ext`
   - ✅ `migrar-vehiculos-excel.js`
   - ✅ `limpieza-proyecto.sh`
   - ❌ `script1.js`

2. **Documentación en el script:**
   - Bloque de comentarios al inicio
   - Explicación de uso y flags
   - Ejemplos de ejecución

3. **Modo dry-run obligatorio:**
   - Todos los scripts destructivos deben tener `--dry-run`
   - Mostrar qué se haría sin hacerlo realmente

4. **Colores en la salida:**
   - 🔵 Azul: Información
   - 🟢 Verde: Éxito
   - 🟡 Amarillo: Advertencia
   - 🔴 Rojo: Error

5. **Manejo de errores:**
   - Validar entradas antes de procesar
   - Mensajes claros de error
   - Exit codes apropiados (0 = éxito, 1+ = error)

### Template Bash

```bash
#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Script: nombre-script.sh
# Propósito: Descripción breve
# Uso: bash scripts/nombre-script.sh [--dry-run]
# ═══════════════════════════════════════════════════════════════════

set -e

DRY_RUN=false
[[ "$1" == "--dry-run" ]] && DRY_RUN=true

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Iniciando script..."

# Tu código aquí

echo "Script completado"
```

### Template Node.js

```javascript
#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 * Script: nombre-script.js
 * Propósito: Descripción breve
 * Uso: node scripts/nombre-script.js [--dry-run]
 * ═══════════════════════════════════════════════════════════════════
 */

const CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
};

function log(tipo, mensaje) {
  const colores = {
    info: '\x1b[34m[INFO]\x1b[0m',
    exito: '\x1b[32m[✓]\x1b[0m',
    error: '\x1b[31m[✗]\x1b[0m',
    advertencia: '\x1b[33m[⚠]\x1b[0m',
  };
  console.log(`${colores[tipo]} ${mensaje}`);
}

async function main() {
  log('info', 'Iniciando script...');
  
  // Tu código aquí
  
  log('exito', 'Script completado');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    log('error', `Error fatal: ${error.message}`);
    process.exit(1);
  });
```

---

## 📚 Documentación Relacionada

- **Organización del proyecto:** `../INFORME_ORGANIZACION_PROYECTO.md`
- **Análisis del Excel vehicular:** `../docs/ANALISIS_PERSONAL_MOTO.md`
- **Guía de migración vehicular:** `../docs/modulos/vehicular/GUIA_MIGRACION_EXCEL.md`
- **CLAUDE.md:** `../CLAUDE.md` (reglas de desarrollo)

---

## 🆘 Troubleshooting

### Script no se ejecuta

```bash
# Verificar permisos
ls -la scripts/

# Dar permisos de ejecución
chmod +x scripts/nombre-script.sh

# Ejecutar explícitamente con bash/node
bash scripts/nombre-script.sh
node scripts/nombre-script.js
```

### Dependencias faltantes

```bash
# Node.js
node --version  # Debe ser 20.x o superior
npm install     # Instalar dependencias del proyecto

# Bash (Windows)
# Usar Git Bash instalado con Git for Windows
```

### Variables de entorno

```bash
# Verificar que existe .env.local
ls -la .env.local

# Verificar que contiene las variables necesarias
grep "AIRTABLE" .env.local
```

---

**Última actualización:** 2026-06-30  
**Mantenido por:** Equipo de desarrollo Sirius SG-SST
