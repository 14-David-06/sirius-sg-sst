# 🚗 Resumen: Script de Migración Vehicular

**Fecha:** 2026-06-30  
**Script creado:** `scripts/migrar-vehiculos-excel.js`  
**Estado:** ✅ Listo para usar

---

## 🎯 Objetivo

Migrar automáticamente los **13 colaboradores** del archivo Excel "Personal que se transporta en MOTO.xlsx" al módulo de seguimiento vehicular del sistema.

---

## ⚡ Inicio Rápido

### 1. Instalar Dependencia

```bash
npm install exceljs
```

### 2. Iniciar Servidor

```bash
npm run dev
```

### 3. Ejecutar en Modo Dry-Run (Simulación)

```bash
node scripts/migrar-vehiculos-excel.js --dry-run
```

Esto **NO inserta datos**, solo muestra qué haría.

### 4. Si Todo Se Ve Bien, Migración Real

```bash
node scripts/migrar-vehiculos-excel.js
```

⚠️ Espera 5 segundos antes de empezar para que puedas cancelar con Ctrl+C.

---

## 📊 Datos a Migrar

| Dato | Cantidad | Estado |
|------|----------|--------|
| Colaboradores en Excel | 13 | Total |
| Con SOAT vigente | 10 | 77% |
| Con tecnomecánica vigente | 10 | 77% |
| Sin datos completos | 3 | 23% |

**Colaboradores con datos incompletos:**
1. Sirley Yesenia Ramirez (1057014925) - Sin SOAT ni tecnomecánica
2. Alejandro Uricoechea (1018497693) - Sin documentos
3. María Alejandra Polania (1077859500) - Formato inconsistente

---

## ✨ Qué Hace el Script

### Automático
✅ Lee el archivo Excel (hoja ACTIVOS)  
✅ Busca cada colaborador en Nómina Core por cédula  
✅ Normaliza fechas al formato YYYY-MM-DD  
✅ Genera placas temporales (`SIN01D`, `SIN02D`, etc.)  
✅ Determina tipo de propietario (Colaborador/Tercero)  
✅ Registra vehículos en Airtable  
✅ Registra documentos (SOAT y tecnomecánica)  
✅ Genera reporte detallado con colores  

### Manual (Después de la Migración)
⚠️ Reemplazar placas temporales con placas reales  
⚠️ Completar datos faltantes de 3 colaboradores  
⚠️ Añadir licencias de conducción (no están en Excel)  

---

## 🔍 Ejemplo de Salida

```bash
08:30:15 [INFO] ═══════════════════════════════════════════════════════════════
08:30:15 [INFO]  MIGRACIÓN: Personal MOTO → Sistema Vehicular
08:30:15 [INFO] ═══════════════════════════════════════════════════════════════
08:30:15 [INFO] Modo: DRY-RUN (simulación)
08:30:15 [✓] Hoja "ACTIVOS" cargada: 18 filas
08:30:15 [✓] Se encontraron 13 colaboradores con vehículos
08:30:15 [INFO] ─────────────────────────────────────────────────────────────
08:30:15 [INFO]  FASE 1: Validación y Búsqueda de Colaboradores
08:30:15 [INFO] ─────────────────────────────────────────────────────────────
08:30:15 [INFO] [1] Procesando: Santiago Alexander Amaya (1006834877)
08:30:16 [✓]   Encontrado: SIRIUS-PER-0123 - Santiago Alexander Amaya
08:30:16 [⚠]   Sin placa, asignando temporal: SIN01D
08:30:16 [INFO]   SOAT: 2026-08-01 | Tecnomecánica: 2028-08-01
...
08:30:45 [INFO] ═══════════════════════════════════════════════════════════════
08:30:45 [INFO]  REPORTE FINAL
08:30:45 [INFO] ═══════════════════════════════════════════════════════════════
08:30:45 [INFO] Total registros:     13
08:30:45 [INFO] Validados:           13
08:30:45 [✓] Insertados:          13
08:30:45 [✗] Fallidos:            0
```

---

## ⚙️ Configuración

### Archivo Excel
```
📂 docs/Personal que se transporta en MOTO.xlsx
└─ Hoja: ACTIVOS
   └─ Filas 6+: Datos de colaboradores
```

### API Endpoints Usados
```
POST /api/personal/validar           → Buscar colaborador por cédula
POST /api/sgsst/vehicular/vehiculos  → Registrar vehículo
POST /api/sgsst/vehicular/documentos → Registrar SOAT/Tecnomecánica
```

### Variables de Entorno Requeridas
```bash
# Base SG-SST
AIRTABLE_SGSST_API_TOKEN=...
AIRTABLE_SGSST_BASE_ID=...

# Tablas vehiculares
AIRTABLE_VEH_VEHICULOS_TABLE_ID=...
AIRTABLE_VEH_DOCUMENTOS_TABLE_ID=...

# Field IDs (53 variables)
AIRTABLE_VEH_* (ver .env.example)
```

---

## 🚨 Limitaciones Conocidas

### Placas Temporales
❌ **Problema:** El Excel NO contiene placas de vehículos en ACTIVOS  
✅ **Solución:** El script genera placas temporales (`SIN01D`, `SIN02D`, etc.)  
⚠️ **Acción requerida:** Reemplazar manualmente con placas reales después

### Datos Faltantes
❌ **Problema:** 3 colaboradores sin SOAT o tecnomecánica  
✅ **Solución:** El script los registra de todas formas  
⚠️ **Acción requerida:** Completar datos faltantes en el sistema

### Licencias de Conducción
❌ **Problema:** El Excel NO contiene información de licencias  
✅ **Solución:** El script solo registra vehículos y documentos  
⚠️ **Acción requerida:** Añadir licencias manualmente después

### Re-ejecución
❌ **Problema:** El script NO verifica duplicados  
⚠️ **Solución:** NO ejecutar dos veces sin limpiar datos primero

---

## 📋 Checklist de Ejecución

### Antes de Ejecutar
- [ ] Instalar ExcelJS: `npm install exceljs`
- [ ] Iniciar servidor: `npm run dev`
- [ ] Verificar que el Excel está en: `docs/Personal que se transporta en MOTO.xlsx`
- [ ] Verificar variables de entorno en `.env.local`

### Ejecución
- [ ] Ejecutar dry-run: `node scripts/migrar-vehiculos-excel.js --dry-run`
- [ ] Revisar salida del dry-run (sin errores)
- [ ] Ejecutar migración real: `node scripts/migrar-vehiculos-excel.js`
- [ ] Esperar confirmación de 5 segundos
- [ ] Verificar reporte final (éxitos vs fallidos)

### Después de Ejecutar
- [ ] Ir a `/dashboard/sgsst/vehicular`
- [ ] Verificar que aparecen los 13 vehículos
- [ ] Reemplazar placas temporales con reales
- [ ] Completar datos de los 3 colaboradores sin documentos
- [ ] Añadir licencias de conducción para todos

---

## 📚 Documentación Completa

| Documento | Propósito |
|-----------|-----------|
| [ANALISIS_PERSONAL_MOTO.md](docs/ANALISIS_PERSONAL_MOTO.md) | Análisis detallado del archivo Excel |
| [GUIA_MIGRACION_EXCEL.md](docs/modulos/vehicular/GUIA_MIGRACION_EXCEL.md) | Guía paso a paso completa |
| [README.md (scripts)](scripts/README.md) | Documentación de todos los scripts |
| [migrar-vehiculos-excel.js](scripts/migrar-vehiculos-excel.js) | Código fuente del script |

---

## 🎯 Resultado Esperado

Después de ejecutar el script exitosamente:

✅ **13 vehículos registrados** en el módulo vehicular  
✅ **10 con SOAT** registrado  
✅ **10 con tecnomecánica** registrada  
✅ **Todos con placas temporales** (requieren actualización)  
✅ **Listos para monitoreo** de vencimientos  
✅ **Sistema de alertas activado** automáticamente  

---

## 🆘 ¿Problemas?

### El script no encuentra colaboradores
→ Verificar que las cédulas en el Excel coinciden con Nómina Core

### Error "Cannot find module 'exceljs'"
→ Ejecutar: `npm install exceljs`

### Error "ECONNREFUSED localhost:3000"
→ Iniciar servidor: `npm run dev`

### Quiero re-ejecutar el script
→ ⚠️ **Primero limpiar datos** en Airtable (tablas `veh_vehiculos` y `veh_documentos`)

---

**Estado:** ✅ Script listo para usar  
**Próximo paso:** Ejecutar en modo dry-run  
**Tiempo estimado:** 5-10 minutos (incluyendo verificación)
