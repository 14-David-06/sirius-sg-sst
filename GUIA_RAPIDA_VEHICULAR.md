# 🚀 Guía Rápida — Módulo de Seguimiento Vehicular

**Última actualización:** 2026-06-26  
**Tiempo estimado de configuración:** 30-45 minutos

---

## ✅ Checklist de Implementación

### Paso 1: Crear Tablas en Airtable (15 min)

1. **Abrir base SG-SST** en Airtable (`appBU8J9xGIFJSOVc`)

2. **Crear tabla `veh_vehiculos`**
   - Clic derecho en el sidebar → "Add or import" → "Create empty table"
   - Nombre: `veh_vehiculos`
   - Agregar campos (ver sección "Estructura de Tablas" abajo)

3. **Crear tabla `veh_documentos`**
   - Mismo proceso que anterior
   - Nombre: `veh_documentos`

4. **Crear tabla `veh_licencias`**
   - Nombre: `veh_licencias`

5. **Crear tabla `veh_alertas_log`**
   - Nombre: `veh_alertas_log`

### Paso 2: Copiar Field IDs (10 min)

Para cada campo de cada tabla:
1. Clic derecho en el header del campo
2. "Copy field ID"
3. Pegar en `.env.local` (ver plantilla abajo)

**Atajo:** Usar la extensión de navegador "Airtable Field ID Copier" para acelerar el proceso.

### Paso 3: Configurar Variables de Entorno (5 min)

Crear archivo `.env.local` en la raíz del proyecto:

```bash
# ══════════════════════════════════════════════════════════
# Módulo Vehicular — Field IDs
# ══════════════════════════════════════════════════════════

# Tabla veh_vehiculos
AIRTABLE_VEH_VEHICULOS_TABLE_ID=tblXXXXXXXXXXXX
AIRTABLE_VEH_VEH_ID=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_ID_PERSONAL_CORE=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_PLACA=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_TIPO_VEHICULO=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_PROPIETARIO_NOMBRE=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_PROPIETARIO_TIPO=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_PROPIETARIO_DOCUMENTO=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_ACTIVO=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_OBSERVACIONES=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_CREATED_AT=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_UPDATED_AT=fldXXXXXXXXXXXX
AIRTABLE_VEH_VEH_DOCUMENTOS_LINK=fldXXXXXXXXXXXX

# Tabla veh_documentos
AIRTABLE_VEH_DOCUMENTOS_TABLE_ID=tblXXXXXXXXXXXX
AIRTABLE_VEH_DOC_ID=fldXXXXXXXXXXXX
AIRTABLE_VEH_DOC_VEHICULO_LINK=fldXXXXXXXXXXXX
AIRTABLE_VEH_DOC_TIPO_DOCUMENTO=fldXXXXXXXXXXXX
AIRTABLE_VEH_DOC_NUMERO_DOCUMENTO=fldXXXXXXXXXXXX
AIRTABLE_VEH_DOC_ENTIDAD_EMISORA=fldXXXXXXXXXXXX
AIRTABLE_VEH_DOC_FECHA_EXPEDICION=fldXXXXXXXXXXXX
AIRTABLE_VEH_DOC_FECHA_VENCIMIENTO=fldXXXXXXXXXXXX
AIRTABLE_VEH_DOC_ESTADO=fldXXXXXXXXXXXX
AIRTABLE_VEH_DOC_URL_DOCUMENTO=fldXXXXXXXXXXXX
AIRTABLE_VEH_DOC_CREATED_AT=fldXXXXXXXXXXXX

# Tabla veh_licencias
AIRTABLE_VEH_LICENCIAS_TABLE_ID=tblXXXXXXXXXXXX
AIRTABLE_VEH_LIC_ID=fldXXXXXXXXXXXX
AIRTABLE_VEH_LIC_ID_PERSONAL_CORE=fldXXXXXXXXXXXX
AIRTABLE_VEH_LIC_NUMERO_LICENCIA=fldXXXXXXXXXXXX
AIRTABLE_VEH_LIC_CATEGORIA=fldXXXXXXXXXXXX
AIRTABLE_VEH_LIC_FECHA_EXPEDICION=fldXXXXXXXXXXXX
AIRTABLE_VEH_LIC_FECHA_VENCIMIENTO=fldXXXXXXXXXXXX
AIRTABLE_VEH_LIC_ESTADO=fldXXXXXXXXXXXX
AIRTABLE_VEH_LIC_ORGANISMO_TRANSITO=fldXXXXXXXXXXXX
AIRTABLE_VEH_LIC_URL_LICENCIA=fldXXXXXXXXXXXX
AIRTABLE_VEH_LIC_CREATED_AT=fldXXXXXXXXXXXX

# Tabla veh_alertas_log
AIRTABLE_VEH_ALERTAS_TABLE_ID=tblXXXXXXXXXXXX
AIRTABLE_VEH_ALERT_ID=fldXXXXXXXXXXXX
AIRTABLE_VEH_ALERT_ENTIDAD_TIPO=fldXXXXXXXXXXXX
AIRTABLE_VEH_ALERT_ENTIDAD_ID=fldXXXXXXXXXXXX
AIRTABLE_VEH_ALERT_TIPO_ALERTA=fldXXXXXXXXXXXX
AIRTABLE_VEH_ALERT_FECHA_ENVIO=fldXXXXXXXXXXXX
AIRTABLE_VEH_ALERT_DESTINATARIO=fldXXXXXXXXXXXX
AIRTABLE_VEH_ALERT_ENVIADO=fldXXXXXXXXXXXX

# SendGrid (Alertas por correo)
SENDGRID_API_KEY=SG.XXXXXXXXXXXXXXXXXXXXXXXXX
SENDGRID_FROM_EMAIL=sst@siriusregenerative.com
SENDGRID_RESPONSABLE_SST_EMAIL=david@siriusregenerative.com
```

### Paso 4: Configurar SendGrid (5 min)

1. **Crear cuenta** en [SendGrid](https://sendgrid.com/) (plan gratuito: 100 correos/día)
2. **Verificar correo emisor:**
   - Settings → Sender Authentication
   - Single Sender Verification
   - Verificar `sst@siriusregenerative.com`
3. **Crear API Key:**
   - Settings → API Keys → Create API Key
   - Nombre: "SG-SST Alertas Vehicular"
   - Permisos: Full Access (Mail Send)
   - Copiar API key y pegar en `.env.local`

### Paso 5: Probar el Sistema (5 min)

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abrir navegador
http://localhost:3000/dashboard/sgsst/vehicular

# Probar registro de vehículo
curl -X POST http://localhost:3000/api/sgsst/vehicular/vehiculos \
  -H "Content-Type: application/json" \
  -d '{
    "idPersonalCore": "SIRIUS-PER-001",
    "placa": "ABC123",
    "tipoVehiculo": "Automóvil",
    "propietarioNombre": "Juan Pérez",
    "propietarioTipo": "Colaborador"
  }'

# Disparar alertas (testing)
curl -X POST http://localhost:3000/api/sgsst/vehicular/alertas/trigger
```

---

## 📋 Estructura de Tablas (Copiar/Pegar en Airtable)

### Tabla 1: `veh_vehiculos`

| Campo | Tipo | Configuración | Fórmula/Valores |
|---|---|---|---|
| `id` | Formula | | `RECORD_ID()` |
| `ID_Personal_Core` | Single line text | Required | |
| `Placa` | Single line text | Required | |
| `Tipo_Vehiculo` | Single select | Required | Motocicleta, Automóvil, Camioneta, Camión, Bicicleta, Otro |
| `Propietario_Nombre` | Single line text | Required | |
| `Propietario_Tipo` | Single select | Required | Colaborador, Tercero, Empresa |
| `Propietario_Documento` | Single line text | | |
| `Activo` | Checkbox | Default: checked | |
| `Observaciones` | Long text | | |
| `Created_At` | Date | Include time | |
| `Updated_At` | Date | Include time | |
| `Documentos_Link` | Link to `veh_documentos` | | |

### Tabla 2: `veh_documentos`

| Campo | Tipo | Configuración | Fórmula/Valores |
|---|---|---|---|
| `id` | Formula | | `RECORD_ID()` |
| `Vehiculo_Link` | Link to `veh_vehiculos` | Required | |
| `Tipo_Documento` | Single select | Required | SOAT, Tecnomecánica |
| `Numero_Documento` | Single line text | | |
| `Entidad_Emisora` | Single line text | | |
| `Fecha_Expedicion` | Date | | |
| `Fecha_Vencimiento` | Date | Required | |
| `Estado` | Formula | | Ver fórmula abajo ⬇️ |
| `URL_Documento` | URL | | |
| `Created_At` | Date | Include time | |

**Fórmula para campo `Estado`:**
```javascript
IF(
  IS_BEFORE({Fecha_Vencimiento}, TODAY()),
  "Vencido",
  IF(
    DATETIME_DIFF({Fecha_Vencimiento}, TODAY(), 'days') <= 30,
    "Por vencer",
    "Vigente"
  )
)
```

### Tabla 3: `veh_licencias`

| Campo | Tipo | Configuración | Fórmula/Valores |
|---|---|---|---|
| `id` | Formula | | `RECORD_ID()` |
| `ID_Personal_Core` | Single line text | Required | |
| `Numero_Licencia` | Single line text | Required | |
| `Categoria` | Single select | Required | A1, A2, B1, B2, B3, C1, C2, C3 |
| `Fecha_Expedicion` | Date | | |
| `Fecha_Vencimiento` | Date | Required | |
| `Estado` | Formula | | Misma que `veh_documentos` |
| `Organismo_Transito` | Single line text | | |
| `URL_Licencia` | URL | | |
| `Created_At` | Date | Include time | |

### Tabla 4: `veh_alertas_log`

| Campo | Tipo | Configuración | Fórmula/Valores |
|---|---|---|---|
| `id` | Formula | | `RECORD_ID()` |
| `Entidad_Tipo` | Single select | Required | documento, licencia |
| `Entidad_ID` | Single line text | Required | |
| `Tipo_Alerta` | Single select | Required | por_vencer, vencido |
| `Fecha_Envio` | Date | Include time, Required | |
| `Destinatario` | Email | Required | |
| `Enviado` | Checkbox | | |

---

## 🔧 Configurar Cron Job para Alertas Automáticas

### Opción A: Vercel Cron Jobs (Recomendado)

Crear archivo `vercel.json` en la raíz del proyecto:

```json
{
  "crons": [
    {
      "path": "/api/sgsst/vehicular/alertas/trigger",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Explicación:**
- `"0 8 * * *"` = Todos los días a las 8:00 AM (UTC)
- Para 8:00 AM Colombia (UTC-5): usar `"0 13 * * *"`

### Opción B: Servicio Externo (EasyCron, cron-job.org)

1. Registrarse en [cron-job.org](https://cron-job.org/)
2. Crear nuevo cronjob:
   - URL: `https://sgsst.siriusregenerative.com/api/sgsst/vehicular/alertas/trigger`
   - Método: POST
   - Frecuencia: Diaria a las 8:00 AM
   - Headers: `Content-Type: application/json`

---

## 🧪 Casos de Prueba

### Caso 1: Registrar Vehículo con Placa Válida
```bash
curl -X POST http://localhost:3000/api/sgsst/vehicular/vehiculos \
  -H "Content-Type: application/json" \
  -d '{
    "idPersonalCore": "SIRIUS-PER-001",
    "placa": "XYZ789",
    "tipoVehiculo": "Automóvil",
    "propietarioNombre": "María García",
    "propietarioTipo": "Colaborador"
  }'
```
**Resultado esperado:** `{"success": true, "vehiculo": {...}}`

### Caso 2: Registrar Placa Inválida (Debe Fallar)
```bash
curl -X POST http://localhost:3000/api/sgsst/vehicular/vehiculos \
  -H "Content-Type: application/json" \
  -d '{
    "idPersonalCore": "SIRIUS-PER-001",
    "placa": "ABC12",
    "tipoVehiculo": "Automóvil",
    "propietarioNombre": "Test",
    "propietarioTipo": "Colaborador"
  }'
```
**Resultado esperado:** `{"error": "Formato de placa inválido..."}`

### Caso 3: Registrar SOAT
```bash
curl -X POST http://localhost:3000/api/sgsst/vehicular/documentos \
  -H "Content-Type: application/json" \
  -d '{
    "vehiculoId": "recXXXXXXXXXXXX",
    "tipoDocumento": "SOAT",
    "numeroDocumento": "12345678",
    "entidadEmisora": "Seguros Bolívar",
    "fechaExpedicion": "2026-01-01",
    "fechaVencimiento": "2027-01-01"
  }'
```

### Caso 4: Consultar Vencimientos
```bash
# Documentos por vencer
curl http://localhost:3000/api/sgsst/vehicular/documentos/vencimientos?dias=30

# Licencias por vencer
curl http://localhost:3000/api/sgsst/vehicular/licencias/vencimientos?dias=30
```

### Caso 5: Disparar Alertas
```bash
curl -X POST http://localhost:3000/api/sgsst/vehicular/alertas/trigger
```

---

## 🐛 Problemas Comunes y Soluciones

### Error: "AIRTABLE_VEH_VEHICULOS_TABLE_ID is not defined"
**Causa:** Falta configurar variable de entorno  
**Solución:** Verificar que `.env.local` está en la raíz del proyecto y contiene todas las variables

### Error: "Error al crear vehículo en Airtable"
**Causa:** Field ID incorrecto o tabla no existe  
**Solución:**
1. Verificar que la tabla se llama exactamente `veh_vehiculos`
2. Copiar de nuevo los field IDs (pueden cambiar si se borra/recrea la tabla)

### Alertas no se envían (enviado: false)
**Causa:** SendGrid API key inválida o correo no verificado  
**Solución:**
1. Verificar que `SENDGRID_API_KEY` empieza con `SG.`
2. Confirmar que el correo `FROM_EMAIL` está verificado en SendGrid
3. Revisar logs de SendGrid en el dashboard

### Estado siempre aparece "Sin registro"
**Causa:** La fórmula de Airtable no está configurada  
**Solución:**
1. Editar campo `Estado` en tabla `veh_documentos`
2. Cambiar tipo a "Formula"
3. Pegar la fórmula proporcionada arriba

---

## 📊 Métricas de Éxito

Una vez configurado correctamente, deberías ver:

- ✅ Panel vehicular carga sin errores
- ✅ Puedes registrar un vehículo de prueba
- ✅ El semáforo de estados funciona (verde/amarillo/rojo)
- ✅ Las alertas se envían correctamente vía SendGrid
- ✅ El historial de alertas se registra en Airtable

---

## 📞 Soporte

**Responsable técnico:** Claude Code  
**Responsable SST:** david@siriusregenerative.com  

**Documentación completa:**
- `RESUMEN_MODULO_VEHICULAR.md` — Resumen ejecutivo
- `MODULO_VEHICULAR_IMPLEMENTACION.md` — Detalles técnicos
- `CLAUDE.md` — Documentación general del proyecto

---

*Guía generada por Claude Code · Última actualización: 2026-06-26*
