# Guía: Obtener Field IDs de Medicina Laboral

Este script automatiza la obtención de Field IDs desde Airtable para el módulo de Medicina Laboral.

## 📋 Prerrequisitos

Antes de ejecutar el script, asegúrate de completar estos pasos:

### 1. Crear las 5 tablas en Airtable

Las tablas deben estar creadas en la base **SG-SST** con estos nombres exactos:

- `med_examenes`
- `med_seguimientos`
- `med_incapacidades`
- `med_reubicaciones`
- `med_enfermedades_laborales`

**Guía detallada:** Ver `docs/modulos/medicina-laboral/GUIA_CREAR_TABLAS_AIRTABLE.md`

### 2. Obtener los Table IDs

Una vez creadas las tablas, necesitas sus Table IDs:

1. Abre cada tabla en Airtable
2. El Table ID está en la URL: `https://airtable.com/appXXX/tblYYYYYYYYYY/...`
   - `tblYYYYYYYYYY` es el Table ID
3. Copia cada Table ID

### 3. Configurar Table IDs en .env.local

Actualiza estas líneas en `.env.local` (actualmente tienen valores `tblPENDIENTE_CREAR_TABLA`):

```bash
# Reemplazar estos valores ANTES de ejecutar el script:
AIRTABLE_MED_EXAMENES_TABLE_ID=tblXXXXXXXXXXXXXX
AIRTABLE_MED_SEGUIMIENTOS_TABLE_ID=tblYYYYYYYYYYYYYY
AIRTABLE_MED_INCAPACIDADES_TABLE_ID=tblZZZZZZZZZZZZZZ
AIRTABLE_MED_REUBICACIONES_TABLE_ID=tblAAAAAAAAAAAAA
AIRTABLE_MED_ENFERMEDADES_LABORALES_TABLE_ID=tblBBBBBBBBBBBBBB
```

### 4. Verificar variables de entorno base

Asegúrate de que estas variables estén configuradas en `.env.local`:

```bash
AIRTABLE_SGSST_API_TOKEN=keyXXXXXXXXXXXXXX
AIRTABLE_SGSST_BASE_ID=appXXXXXXXXXXXXXX
```

---

## 🚀 Ejecutar el Script

Una vez completados los prerrequisitos, ejecuta:

```bash
npx tsx scripts/obtener-field-ids-medicina-laboral.ts
```

**Nota:** El proyecto usa `tsx` para ejecutar scripts TypeScript. Si no está instalado:

```bash
npm install -D tsx
```

---

## 📄 Salida del Script

El script generará un archivo con las variables de entorno:

```
scripts/output-field-ids-medicina-laboral.txt
```

### Ejemplo de salida:

```bash
# ══════════════════════════════════════════════════════════
# MÓDULO MEDICINA LABORAL (med_*) - Field IDs
# Generado automáticamente por scripts/obtener-field-ids-medicina-laboral.ts
# Fecha: 2026-08-19T15:30:00.000Z
# ══════════════════════════════════════════════════════════

# ── Tabla "med_examenes" ────────────────────────────────
AIRTABLE_MED_EXAMENES_TABLE_ID=tblXXXXXXXXXXXXXX
AIRTABLE_MED_EXM_CONSECUTIVO=fldYYYYYYYYYYYYYY
AIRTABLE_MED_EXM_FECHA_EXAMEN=fldZZZZZZZZZZZZZZ
AIRTABLE_MED_EXM_TIPO_EXAMEN=fldAAAAAAAAAAAAA
...
```

---

## 🔄 Actualizar .env.local

Una vez generado el archivo, sigue estos pasos:

### Opción A: Reemplazo manual

1. Abre `scripts/output-field-ids-medicina-laboral.txt`
2. Copia todo el contenido
3. Abre `.env.local`
4. Busca la sección de Medicina Laboral (líneas 1394-1496)
5. Reemplaza todas las líneas con `fldPENDIENTE` por las generadas

### Opción B: Reemplazo automático con PowerShell

```powershell
# Hacer backup primero
Copy-Item .env.local .env.local.backup

# Ver las líneas a reemplazar (líneas 1394-1496 son 103 líneas)
# Reemplazo manual recomendado para mayor seguridad
```

---

## ✅ Verificar la Configuración

### 1. Revisar el archivo generado

```bash
cat scripts/output-field-ids-medicina-laboral.txt
```

Verifica que:
- ✅ No haya líneas con `fldPENDIENTE`
- ✅ No haya líneas con `# ⚠️ FALTANTE`
- ✅ Todos los Field IDs empiecen con `fld` (15 caracteres)

### 2. Reiniciar el servidor

```bash
npm run dev
```

### 3. Probar el endpoint de indicadores

```bash
curl http://localhost:3000/api/medicina-laboral/indicadores?mes=8&anio=2026
```

**Respuesta esperada:**

```json
{
  "success": true,
  "data": {
    "periodo": {
      "desde": "2026-08-01",
      "hasta": "2026-08-31",
      "mes": 8,
      "anio": 2026
    },
    "indicadores": {
      "diasIncapacidadEnfermedadGeneral": 0,
      "enfermedadesLaboralesEnProceso": 0,
      "enfermedadesLaboralesReconocidas": 0,
      "trabajadoresReubicadosTemporales": 0,
      "trabajadoresReubicadosDefinitivos": 0,
      "trabajadoresRehabilitados": 0
    },
    "filasSeguimientos": [],
    "filasIncapacidades": []
  }
}
```

Si obtienes esta respuesta, ¡la configuración es correcta! ✅

---

## ⚠️ Troubleshooting

### Problema 1: "Tabla no tiene Table ID configurado"

```
⚠️ Tabla "med_examenes" no tiene Table ID configurado. Saltando...
```

**Solución:** Verifica que el Table ID en `.env.local` no sea `tblPENDIENTE_CREAR_TABLA`. Debe ser un ID real como `tblXXXXXXXXXXXXXX`.

---

### Problema 2: "No se pudo obtener el esquema de la tabla"

```
❌ No se pudo obtener el esquema de la tabla "med_examenes"
```

**Posibles causas:**

1. **El Table ID es incorrecto**
   - Verifica el Table ID en la URL de Airtable
   - Debe tener formato: `tblXXXXXXXXXXXXXX` (17 caracteres)

2. **El token de API no tiene permisos**
   - Verifica `AIRTABLE_SGSST_API_TOKEN` en `.env.local`
   - El token debe tener permisos de lectura sobre la base

3. **La tabla no existe en la base SG-SST**
   - Verifica que `AIRTABLE_SGSST_BASE_ID` sea correcto
   - Confirma que la tabla esté creada en esa base

---

### Problema 3: "Campos faltantes"

```
   ⚠️ 5 campos faltantes:
      - Fecha_Examen
      - Tipo_Examen
      - Estado
      - Activo
      - Created_At
```

**Solución:**

Los nombres de campos en Airtable deben ser **exactamente** como se especifican:

- ✅ Correcto: `Fecha_Examen` (con guion bajo)
- ❌ Incorrecto: `Fecha Examen` (con espacio)
- ❌ Incorrecto: `fecha_examen` (minúsculas)

**Acción:** Renombra los campos en Airtable para que coincidan exactamente.

---

### Problema 4: Error 403 al ejecutar el endpoint

```
Error: Airtable 403: {"error":{"type":"INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND"}}
```

**Solución:**

1. Verifica que todos los Field IDs estén actualizados en `.env.local`
2. Reinicia el servidor: `npm run dev`
3. Los Field IDs deben ser reales, no `fldPENDIENTE`

---

## 📊 Resumen de Variables

El script genera **95 variables de entorno**:

| Tabla | Table ID | Field IDs |
|---|---|---|
| `med_examenes` | 1 | 18 |
| `med_seguimientos` | 1 | 16 |
| `med_incapacidades` | 1 | 19 |
| `med_reubicaciones` | 1 | 19 |
| `med_enfermedades_laborales` | 1 | 18 |
| **Total** | **5** | **90** |

---

## 🎯 Siguiente Paso

Una vez configurados todos los Field IDs:

1. **Reactivar el módulo en el dashboard:**
   ```typescript
   // src/app/dashboard/page.tsx:280
   status: "active",  // Cambiar de "soon" a "active"
   ```

2. **Crear un registro de prueba:**
   ```bash
   curl -X POST http://localhost:3000/api/medicina-laboral/examenes \
     -H "Content-Type: application/json" \
     -d '{
       "fechaExamen": "2026-08-19",
       "tipoExamen": "Ingreso",
       "idEmpleadoCore": "123",
       "nombreEmpleado": "Prueba Test",
       "numeroDocumento": "1234567",
       "cargo": "Operario",
       "estado": "Programado"
     }'
   ```

3. **Desarrollar las interfaces de usuario** para cada submódulo.

---

## 📚 Documentación Relacionada

- `docs/modulos/medicina-laboral/README.md` — Documentación completa del módulo
- `docs/modulos/medicina-laboral/GUIA_CREAR_TABLAS_AIRTABLE.md` — Guía para crear tablas
- `docs/modulos/medicina-laboral/CHECKLIST_IMPLEMENTACION.md` — Checklist de implementación

---

**¿Necesitas ayuda?** Revisa los logs del script para ver detalles de errores y advertencias.
