# Fix: Módulo Vehicular - Datos Vacíos

**Fecha:** 2026-06-30  
**Problema:** El módulo vehicular muestra "⏳ Cargando..." para todos los vehículos

## 🔍 Diagnóstico

### Síntomas
- Dashboard vehicular muestra 13 vehículos
- Todos aparecen como "⏳ Cargando..." sin nombre ni placa
- Estado muestra "OK" pero sin datos reales

### Causa Raíz
Ejecutando `node scripts/diagnostico-vehicular.js` se descubrió que:

1. **Los 13 vehículos en Airtable están VACÍOS:**
   - Sin placa
   - Sin `ID_Personal_Core`
   - Todos marcados como inactivos (`Activo = false`)

2. **Campo ID incorrectamente configurado:**
   - `.env.local` tiene el mismo Field ID para `AIRTABLE_VEH_VEH_ID` y `AIRTABLE_VEH_VEH_ID_PERSONAL_CORE`
   - Ambos están mapeados al campo `ID_Personal_Core`

3. **La tabla NO tiene campo ID autogenerado** - Solo usa `ID_Personal_Core`

## ✅ Solución

### Opción 1: Corregir configuración de .env.local (RECOMENDADO)

La tabla solo usa `ID_Personal_Core` como identificador principal. Actualizar `.env.local`:

**Ejecuta el script de descubrimiento para obtener los Field IDs correctos:**

```bash
node scripts/descubrir-fields-vehicular.js
```

Este script te mostrará todos los Field IDs correctos que debes copiar a tu `.env.local`.

**Campos que necesitan corrección:**
- `AIRTABLE_VEH_VEH_TIPO_VEHICULO` - Usar el campo "Tipo_Vehiculo"
- `AIRTABLE_VEH_VEH_PROPIETARIO_TIPO` - Agregar campo "Propietario_Tipo"
- `AIRTABLE_VEH_VEH_PROPIETARIO_DOCUMENTO` - Agregar campo "Propietario_Documento"
- `AIRTABLE_VEH_VEH_UPDATED_AT` - Agregar campo "Updated_At"
- `AIRTABLE_VEH_VEH_DOCUMENTOS_LINK` - Agregar campo de lookup a documentos

### Opción 2: Poblar datos en Airtable

Los 13 registros vacíos deben ser:
1. **Eliminados** (si son pruebas), O
2. **Completados** con datos reales:
   - Marcar `Activo = true`
   - Asignar `ID_Personal_Core` válido (que exista en tabla Personal)
   - Asignar `Placa` del vehículo
   - Seleccionar `Tipo_Vehiculo`

## 🧪 Verificación

Después de aplicar la solución:

```bash
# 1. Verificar configuración
node scripts/diagnostico-vehicular.js

# 2. Reiniciar servidor dev
npm run dev

# 3. Visitar http://localhost:3000/dashboard/sgsst/vehicular
```

**Resultado esperado:**
- Si se corrigió el .env: La página cargará sin error
- Si se poblaron datos: Verás los vehículos con nombres y placas reales

## 📋 Mejoras de Código Aplicadas

### 1. Optimización de Lookup (src/app/api/sgsst/vehicular/route.ts)
- Cambio de N queries individuales a 1 query con OR()
- Manejo robusto de campos faltantes
- Logging detallado para debugging

### 2. Mensajes más descriptivos
- En lugar de "⏳ Cargando..." mostrar:
  - "Sin datos (ID)" si falta el colaborador
  - "Sin área registrada" si falta el área

### 3. Scripts de diagnóstico
- `scripts/diagnostico-vehicular.js` - Verificar datos y configuración
- `scripts/descubrir-fields-vehicular.js` - Descubrir Field IDs correctos

## 🚨 Próximos Pasos

1. **URGENTE:** Decidir si los 13 vehículos vacíos deben eliminarse o completarse
2. **Corregir `.env.local`** con los Field IDs correctos del script de descubrimiento
3. **Agregar validación de startup** para verificar que Field IDs estén definidos
4. **Crear migration script** para poblar datos de ejemplo o migrar desde Excel

## 📝 Notas

- El código de la API y frontend está **correcto** ✅
- El problema es **100% de datos y configuración**
- La tabla `veh_vehiculos` NO tiene campo ID autogenerado - usa `ID_Personal_Core` como PK

## 🔗 Referencias

- CLAUDE.md línea 500-551: Documentación del módulo vehicular
- src/infrastructure/config/airtableSGSST.ts línea 840-853: Config de vehiculosFields
- src/app/api/sgsst/vehicular/route.ts: Endpoint de listado con lookup optimizado
