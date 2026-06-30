# 🔄 Guía de Migración: Excel → Módulo Vehicular

**Script:** `scripts/migrar-vehiculos-excel.js`  
**Archivo origen:** `docs/Personal que se transporta en MOTO.xlsx`  
**Fecha:** 2026-06-30

---

## 📋 Resumen

Este script automatiza la migración de datos de vehículos desde el archivo Excel "Personal que se transporta en MOTO.xlsx" hacia el módulo de seguimiento vehicular del sistema.

### ¿Qué hace el script?

1. ✅ Lee datos del Excel (hoja ACTIVOS)
2. ✅ Busca cada colaborador en Nómina Core por cédula
3. ✅ Valida y normaliza fechas (SOAT y tecnomecánica)
4. ✅ Genera placas temporales (el Excel no tiene placas)
5. ✅ Determina tipo de propietario (Colaborador/Tercero)
6. ✅ Registra vehículos en Airtable vía API
7. ✅ Registra documentos (SOAT y tecnomecánica)
8. ✅ Genera reporte detallado de éxitos y errores

---

## 🚀 Instalación de Dependencias

```bash
# Instalar ExcelJS (requerido por el script)
npm install exceljs

# O con yarn
yarn add exceljs
```

---

## 📖 Uso del Script

### Modo Dry-Run (Recomendado Primero)

**SIEMPRE ejecuta primero en modo dry-run** para ver qué hará el script sin insertar datos:

```bash
node scripts/migrar-vehiculos-excel.js --dry-run
```

Esto:
- ✅ Lee y valida el Excel
- ✅ Busca colaboradores en Nómina Core
- ✅ Muestra qué datos se insertarían
- ❌ NO inserta nada en Airtable

### Migración Real

**Solo después de verificar el dry-run:**

```bash
node scripts/migrar-vehiculos-excel.js
```

⚠️ **Advertencia:** El script esperará 5 segundos antes de iniciar para que puedas cancelar con Ctrl+C si es necesario.

### Opciones Adicionales

```bash
# Con puerto personalizado (si Next.js corre en otro puerto)
node scripts/migrar-vehiculos-excel.js --dry-run --port=3001

# Con URL completa personalizada
node scripts/migrar-vehiculos-excel.js --url=https://sirius-sgsst.com
```

---

## ⚙️ Requisitos Previos

### 1. Servidor Next.js Corriendo

```bash
# En otra terminal
npm run dev
```

El servidor debe estar corriendo en el puerto configurado (default: 3000).

### 2. Variables de Entorno Configuradas

Asegúrate de tener todas las variables del módulo vehicular en `.env.local`:

```bash
# Base SG-SST
AIRTABLE_SGSST_API_TOKEN=...
AIRTABLE_SGSST_BASE_ID=...

# Tablas vehiculares (4 tablas)
AIRTABLE_VEH_VEHICULOS_TABLE_ID=...
AIRTABLE_VEH_DOCUMENTOS_TABLE_ID=...
AIRTABLE_VEH_LICENCIAS_TABLE_ID=...
AIRTABLE_VEH_ALERTAS_TABLE_ID=...

# Field IDs (53 variables)
AIRTABLE_VEH_ID_VEHICULO=...
AIRTABLE_VEH_ID_PERSONAL_CORE=...
# ... (ver .env.example para lista completa)
```

### 3. Archivo Excel en la Ubicación Correcta

```
docs/Personal que se transporta en MOTO.xlsx
```

---

## 📊 Proceso de Migración Paso a Paso

### Fase 1: Validación y Búsqueda (Automático)

Para cada colaborador en el Excel:

1. ✅ Lee: cédula, nombres, apellidos, fechas
2. ✅ Busca colaborador en Nómina Core por cédula
3. ✅ Obtiene: `id_empleado`, nombre completo, área
4. ✅ Normaliza fechas al formato `YYYY-MM-DD`
5. ✅ Genera placa temporal (formato: `SIN01D`, `SIN02D`, etc.)
6. ✅ Determina tipo de propietario:
   - Si coincide nombre → `Colaborador`
   - Si no coincide → `Tercero`

**Resultado:** Lista de registros validados listos para insertar.

### Fase 2: Inserción (Solo si no es --dry-run)

Para cada registro validado:

1. ✅ **POST** `/api/sgsst/vehicular/vehiculos` → Crea vehículo
2. ✅ **POST** `/api/sgsst/vehicular/documentos` → Registra SOAT (si existe)
3. ✅ **POST** `/api/sgsst/vehicular/documentos` → Registra tecnomecánica (si existe)

**Observaciones añadidas:**
```
Migrado desde Excel el 2026-06-30.
Placa temporal asignada (Excel no contenía placas).
```

---

## 📈 Datos Que Se Migran

### Del Excel → Sistema

| Campo Excel | Campo Sistema | Notas |
|-------------|---------------|-------|
| CÉDULA | Lookup a Nómina Core | Busca `id_empleado` |
| NOMBRES + APELLIDOS | - | Solo para lookup |
| VENC. SOAT | Fecha vencimiento SOAT | Normalizado a YYYY-MM-DD |
| TECNO-MECÁNICA | Fecha vencimiento Tecnomecánica | Normalizado a YYYY-MM-DD |
| PROPIETARIO | Propietario nombre + tipo | Determina si es Colaborador/Tercero |

### Datos Generados Automáticamente

| Campo | Valor | Razón |
|-------|-------|-------|
| Placa | `SIN01D`, `SIN02D`, ... | Excel no tiene placas |
| Tipo vehículo | `Motocicleta` | Archivo se llama "...MOTO" |
| Propietario tipo | `Colaborador` o `Tercero` | Comparación de nombres |
| Observaciones | Texto de migración | Rastreo del origen de datos |
| Fecha creación | Timestamp actual | Auditoría |

---

## ⚠️ Problemas Conocidos y Soluciones

### Problema 1: Colaborador No Encontrado

**Error:**
```
[✗] Colaborador con cédula 1057014925 NO encontrado en Nómina Core
```

**Causas posibles:**
1. El colaborador no está registrado en Nómina Core
2. La cédula está mal escrita en el Excel
3. El colaborador está inactivo

**Solución:**
1. Verificar que el colaborador existe en la tabla Personal
2. Corregir cédula en el Excel si está mal
3. Registrar al colaborador en Nómina Core si es nuevo

### Problema 2: Formato de Fecha Inconsistente

**Error en Excel:**
```
María Alejandra Polania: "16/04/2026-05/08/2026"
```

**Solución:**
El script intenta extraer la primera fecha válida, pero es mejor corregir el Excel antes de migrar:
1. Abrir Excel
2. Cambiar la celda a: `2026-04-16`
3. Guardar y volver a ejecutar el script

### Problema 3: Datos Vacíos

**Advertencia:**
```
[⚠] SOAT: sin dato en Excel
[⚠] Tecnomecánica: sin dato en Excel
```

**Qué hace el script:**
- Registra el vehículo de todas formas
- No registra documentos que no existan
- El sistema mostrará "Sin registro" para esos documentos

**Solución:**
Después de la migración, completar los datos manualmente:
1. Ir a `/dashboard/sgsst/vehicular`
2. Buscar el vehículo
3. Editar y añadir los documentos faltantes

### Problema 4: Placas Ficticias

**Por qué:**
El Excel NO contiene placas de vehículos en la hoja ACTIVOS.

**Impacto:**
- El script genera placas temporales: `SIN01D`, `SIN02D`, etc.
- Estas placas son válidas pero no reales

**Solución:**
Después de la migración:
1. Ir a `/dashboard/sgsst/vehicular`
2. Para cada vehículo:
   - Ver detalle
   - Editar placa → reemplazar con placa real
   - Guardar

---

## 📊 Ejemplo de Salida del Script

### Modo Dry-Run

```
08:30:15 [INFO] ═══════════════════════════════════════════════════════════════
08:30:15 [INFO]  MIGRACIÓN: Personal que se transporta en MOTO → Sistema Vehicular
08:30:15 [INFO] ═══════════════════════════════════════════════════════════════
08:30:15 [INFO]
08:30:15 [INFO] Archivo Excel: docs/Personal que se transporta en MOTO.xlsx
08:30:15 [INFO] API URL: http://localhost:3000
08:30:15 [INFO] Modo: DRY-RUN (simulación)
08:30:15 [INFO]
08:30:15 [INFO] Cargando archivo Excel...
08:30:15 [✓] Hoja "ACTIVOS" cargada: 18 filas
08:30:15 [INFO]
08:30:15 [INFO] Leyendo registros del Excel...
08:30:15 [✓] Se encontraron 13 colaboradores con vehículos
08:30:15 [INFO]
08:30:15 [INFO] ─────────────────────────────────────────────────────────────────
08:30:15 [INFO]  FASE 1: Validación y Búsqueda de Colaboradores
08:30:15 [INFO] ─────────────────────────────────────────────────────────────────
08:30:15 [INFO]
08:30:15 [INFO] [1] Procesando: Santiago Alexander Amaya Salazar (1006834877)
08:30:16 [✓]   Encontrado: SIRIUS-PER-0123 - Santiago Alexander Amaya Salazar
08:30:16 [⚠]   Sin placa registrada, asignando placa temporal: SIN01D
08:30:16 [INFO]   Tipo vehículo: Motocicleta
08:30:16 [INFO]   Propietario: SANTIAGO ALEXANDER AMAYA (Colaborador)
08:30:16 [INFO]   SOAT: 2026-08-01
08:30:16 [INFO]   Tecnomecánica: 2028-08-01
08:30:16 [INFO]
[... más registros ...]
08:30:45 [INFO] ─────────────────────────────────────────────────────────────────
08:30:45 [INFO]  RESULTADOS VALIDACIÓN: 13/13 OK
08:30:45 [INFO] ─────────────────────────────────────────────────────────────────
08:30:45 [INFO]
08:30:45 [⚠] ═══════════════════════════════════════════════════════════════
08:30:45 [⚠]  MODO DRY-RUN: NINGÚN DATO FUE INSERTADO
08:30:45 [⚠]  Para ejecutar la migración real, ejecuta sin --dry-run
08:30:45 [⚠] ═══════════════════════════════════════════════════════════════
08:30:45 [INFO]
08:30:45 [INFO] Script finalizado exitosamente
```

### Modo Real (Extracto)

```
[INFO] [1] Registrando vehículo: SIN01D
[✓]   Vehículo creado: recXYZ123456789
[✓]   SOAT registrado: vence 2026-08-01
[✓]   Tecnomecánica registrada: vence 2028-08-01
[INFO]
[INFO] [2] Registrando vehículo: SIN02D
[✓]   Vehículo creado: recABC987654321
[✓]   SOAT registrado: vence 2027-06-19
[✓]   Tecnomecánica registrada: vence 2027-06-27
[INFO]
[... más registros ...]
[INFO] ═══════════════════════════════════════════════════════════════
[INFO]  REPORTE FINAL
[INFO] ═══════════════════════════════════════════════════════════════
[INFO]
[INFO] Total registros en Excel:     13
[INFO] Validados correctamente:      13
[✓] Insertados con éxito:         13
[✗] Fallidos:                     0
[INFO]
[✓] ═══════════════════════════════════════════════════════════════
[✓]  MIGRACIÓN COMPLETADA
[✓] ═══════════════════════════════════════════════════════════════
```

---

## ✅ Checklist Post-Migración

### Inmediatamente Después

- [ ] Verificar que el script terminó sin errores
- [ ] Revisar el reporte final
- [ ] Anotar cantidad de registros insertados

### Verificación en el Sistema

- [ ] Ir a `/dashboard/sgsst/vehicular`
- [ ] Verificar que aparecen los 13 vehículos (o cantidad esperada)
- [ ] Revisar estado consolidado (verde/amarillo/rojo)
- [ ] Verificar que los nombres de colaboradores coinciden

### Correcciones Necesarias

- [ ] Reemplazar placas ficticias (`SIN01D`, etc.) con placas reales
- [ ] Completar datos faltantes:
  - Sirley Yesenia Ramirez (sin SOAT ni tecnomecánica)
  - Alejandro Uricoechea (sin documentos)
  - María Alejandra Polania (formato inconsistente)
- [ ] Verificar propietarios de terceros
- [ ] Añadir licencias de conducción (no están en Excel)

### Opcional

- [ ] Exportar reporte desde el sistema para comparar con Excel
- [ ] Generar alertas de documentos por vencer
- [ ] Documentar placas reales en una tabla aparte

---

## 🔄 Re-ejecutar el Script

### ¿Puedo ejecutarlo dos veces?

**NO sin consecuencias.** El script:
- ✅ Genera placas ficticias únicas cada vez (`SIN01D`, `SIN02D`...)
- ❌ NO verifica si un colaborador YA tiene un vehículo registrado
- ❌ Insertará DUPLICADOS si lo ejecutas dos veces

### Si necesitas re-ejecutar:

**Opción 1: Limpiar datos primero**
1. Ir a Airtable
2. Eliminar registros de `veh_vehiculos` manualmente
3. Eliminar registros relacionados en `veh_documentos`
4. Volver a ejecutar el script

**Opción 2: Modificar el script**
Agregar verificación de vehículos existentes antes de insertar (requiere desarrollo adicional).

---

## 📂 Archivos Relacionados

- **Script de migración:** `scripts/migrar-vehiculos-excel.js`
- **Excel origen:** `docs/Personal que se transporta en MOTO.xlsx`
- **Análisis del Excel:** `docs/ANALISIS_PERSONAL_MOTO.md`
- **API vehículos:** `src/app/api/sgsst/vehicular/vehiculos/route.ts`
- **API documentos:** `src/app/api/sgsst/vehicular/documentos/route.ts`
- **Dashboard:** `src/app/dashboard/sgsst/vehicular/page.tsx`

---

## 💡 Mejoras Futuras

1. **Verificar duplicados** antes de insertar
2. **Leer placas** de la hoja RETIRADOS (donde sí hay placas) y usarlas como referencia
3. **Importar licencias** si se añade esa columna al Excel
4. **Modo interactivo** para confirmar cada inserción
5. **Reporte en archivo** (CSV o JSON) además de consola
6. **Rollback automático** si falla alguna inserción

---

## 🆘 Soporte

Si el script falla o tienes dudas:

1. **Revisar logs:** El script es muy verboso, lee los mensajes de error
2. **Verificar servidor:** ¿Está corriendo `npm run dev`?
3. **Verificar .env:** ¿Están todas las variables del módulo vehicular?
4. **Consultar análisis:** Ver `docs/ANALISIS_PERSONAL_MOTO.md`

---

**Última actualización:** 2026-06-30  
**Versión del script:** 1.0.0  
**Estado:** ✅ Listo para usar (con dry-run primero)
