# Migración de Firmas a S3

## Problema

La variable `IND_FIRMA_RESPONSABLE_SST` contiene una firma cifrada muy grande que excede el límite de 64KB de variables de entorno en Next.js/Vercel.

**Error:**
```
❌ Error: The total size of all Environment Variables (76.89KB) exceeds 64KB.
```

## Solución: Almacenar en S3

En lugar de guardar la firma en variables de entorno, se almacena en **AWS S3** (que ya está configurado en el proyecto).

### Ventajas de S3:
- ✅ **Sin límite de tamaño** para archivos
- ✅ **Más seguro**: No se expone en variables de entorno
- ✅ **No va al repositorio**: Evita fugas de información sensible
- ✅ **Cifrado en reposo**: S3 aplica AES256 automáticamente
- ✅ **Control de acceso**: IAM policies de AWS

---

## Pasos de Migración

### 1. Subir la firma a S3

Ejecutar el script de migración **UNA SOLA VEZ**:

```bash
npx tsx scripts/upload-firma-s3.ts
```

Este script:
- Lee la variable `IND_FIRMA_RESPONSABLE_SST` desde `.env.local`
- La sube a S3 en la ruta: `firmas/responsable-sst.json`
- Aplica cifrado AES256 en reposo

### 2. Habilitar S3 para firmas

Agregar a `.env.local`:

```bash
USE_S3_FOR_SIGNATURES=true
```

### 3. (Opcional) Limpiar variable de entorno

Una vez verificado que funciona correctamente con S3, puedes **eliminar** o **comentar** la variable en `.env.local` para ahorrar espacio:

```bash
# IND_FIRMA_RESPONSABLE_SST=Q4w...
```

**⚠️ IMPORTANTE:** Antes de eliminarla, asegúrate de que S3 funciona correctamente.

---

## Cómo Funciona

### Antes (Variables de Entorno)
```
.env.local → API Route → Descifrar firma → Usar en PDF
   ❌ Límite: 64KB total
```

### Después (S3)
```
S3 → API Route → Descarga firma → Descifrar → Usar en PDF
   ✅ Sin límite de tamaño
   ✅ Más seguro
```

### Fallback Automático

El sistema tiene **doble estrategia**:

1. **Primero intenta S3** (si `USE_S3_FOR_SIGNATURES=true`)
2. **Fallback a variable de entorno** (si S3 falla o no está configurado)

Código:
```typescript
import { obtenerFirmaResponsableSst } from "@/lib/firmaStorage";

// Obtiene la firma automáticamente desde S3 o env
const firmaDataUrl = await obtenerFirmaResponsableSst();
```

---

## Verificación

### Probar que funciona:

1. **Con S3 habilitado:**
   ```bash
   # En .env.local
   USE_S3_FOR_SIGNATURES=true
   ```

2. **Generar un documento que use firma:**
   - Ir a un registro de inducción
   - Regenerar documento con firma automática
   - Verificar que el PDF se genera correctamente

3. **Revisar logs:**
   ```
   ✅ [firmaStorage] Firma cargada desde S3
   ```

### Si hay errores:

```
❌ [firmaStorage] Error cargando firma desde S3: ...
```

Posibles causas:
- Credenciales AWS incorrectas
- Bucket S3 no accesible
- La firma no se subió correctamente

**Solución temporal:** Deshabilitar S3:
```bash
USE_S3_FOR_SIGNATURES=false
```

---

## Variables de Entorno Necesarias

### Para usar S3:
```bash
# AWS S3 (ya configuradas en el proyecto)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=...

# Habilitar S3 para firmas
USE_S3_FOR_SIGNATURES=true

# (Opcional) Cambiar la ruta en S3
IND_FIRMA_RESPONSABLE_S3_KEY=firmas/responsable-sst.json
```

### Fallback (si S3 falla):
```bash
# Mantener como respaldo
IND_FIRMA_RESPONSABLE_SST=w...
```

---

## Seguridad

### ✅ Buenas prácticas aplicadas:

1. **Cifrado doble:**
   - Firma cifrada con AES256 antes de guardar (tu código)
   - S3 aplica cifrado en reposo adicional (`ServerSideEncryption: "AES256"`)

2. **No se sube al repositorio:**
   - La firma solo existe en S3 (infraestructura privada)
   - `.env.local` está en `.gitignore`

3. **Control de acceso:**
   - S3 bucket privado (no público)
   - Acceso solo con credenciales IAM correctas

4. **Auditoría:**
   - Logs de acceso en CloudWatch (AWS)
   - Metadata de cuándo se subió la firma

### ❌ Evitar:

- ❌ Subir la firma cifrada al código fuente (aunque esté cifrada)
- ❌ Hardcodear credenciales en el código
- ❌ Hacer público el bucket S3
- ❌ Compartir el archivo `.env.local` en Slack/email

---

## Mantenimiento

### Actualizar la firma:

Si necesitas cambiar la firma del responsable SST:

1. Cifrar la nueva firma (usando tu proceso actual)
2. Actualizar en `.env.local`: `IND_FIRMA_RESPONSABLE_SST=...`
3. Ejecutar de nuevo el script:
   ```bash
   npx tsx scripts/upload-firma-s3.ts
   ```
4. Verificar que funciona

### Backup:

Las firmas en S3 se pueden:
- Versionar (activar versionado en el bucket)
- Respaldar con AWS Backup
- Replicar a otra región con Cross-Region Replication

---

## Troubleshooting

### Error: "Firma no encontrada en S3"

**Causa:** El archivo no se subió correctamente.

**Solución:**
1. Verificar que el script se ejecutó sin errores
2. Revisar en AWS Console que existe `firmas/responsable-sst.json`
3. Re-ejecutar el script de migración

### Error: "Access Denied"

**Causa:** Credenciales AWS sin permisos.

**Solución:**
Asegurarse de que el usuario IAM tiene permisos:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject"
  ],
  "Resource": "arn:aws:s3:::BUCKET-NAME/firmas/*"
}
```

### Error: "Bucket does not exist"

**Causa:** `AWS_S3_BUCKET_NAME` incorrecto.

**Solución:**
Verificar en `.env.local` que el nombre del bucket es correcto.

---

## Conclusión

✅ **Migración recomendada** para resolver el problema de límite de 64KB  
✅ **Más seguro** que variables de entorno  
✅ **Escalable** para agregar más firmas en el futuro  
✅ **Fallback automático** si S3 falla  

**Tiempo estimado:** 5 minutos  
**Complejidad:** Baja  
**Riesgo:** Bajo (tiene fallback automático)
