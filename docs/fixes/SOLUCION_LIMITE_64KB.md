# Solución al Problema de Límite de 64KB en Variables de Entorno

## ✅ Problema Resuelto

**Error original:**
```
❌ Error: The total size of all Environment Variables (76.89KB) exceeds 64KB.
```

**Causa:** La variable `IND_FIRMA_RESPONSABLE_SST` contenía una firma cifrada de ~21KB que, sumada a las demás variables, excedía el límite de Next.js/Vercel.

---

## 🎯 Solución Implementada: Almacenamiento en S3

### Antes (Variables de Entorno)
```
.env.local (79.33 KB) → API → Firma → PDF
❌ Problema: Excede límite de 64KB
```

### Después (S3)
```
S3 Bucket → API → Descarga firma → Descifra → PDF
✅ Solución: .env.local ahora pesa 58.57 KB
```

---

## 📁 Archivos Creados/Modificados

### Nuevos archivos:

1. **`src/config/firmas.config.ts`**
   - Configuración centralizada de firmas
   - Define la ruta S3 y modo de operación

2. **`src/lib/firmaStorage.ts`**
   - Función `obtenerFirmaResponsableSst()` 
   - Doble estrategia: S3 primero, fallback a env
   - Manejo robusto de errores

3. **`scripts/upload-firma-s3.ts`**
   - Script de migración one-time
   - Sube firma desde env a S3
   - Validaciones completas

4. **`scripts/test-firma-s3.ts`**
   - Script de prueba
   - Verifica carga desde S3

5. **`MIGRACION_FIRMAS_S3.md`**
   - Documentación completa
   - Guía paso a paso
   - Troubleshooting

### Archivos modificados:

1. **`src/app/api/inducciones/documento-unificado/route.ts`**
   - Ahora usa `obtenerFirmaResponsableSst()`
   - Eliminada lógica de descifrado directo

2. **`src/app/api/inducciones/regenerar-documento/route.ts`**
   - Ahora usa `obtenerFirmaResponsableSst()`
   - Eliminada lógica de descifrado directo

3. **`.env.local`**
   - Variable `IND_FIRMA_RESPONSABLE_SST` eliminada
   - Nueva variable: `USE_S3_FOR_SIGNATURES=true`
   - Tamaño reducido: 79.33 KB → 58.57 KB (ahorro: 20.76 KB)

---

## 🔒 Seguridad Mejorada

### ✅ Ventajas de S3:

1. **No va al repositorio**
   - La firma solo existe en infraestructura privada
   - Imposible filtrar por accidente en commits

2. **Cifrado doble**
   - Tu cifrado AES custom (ya existente)
   - S3 ServerSideEncryption AES256 adicional

3. **Control de acceso IAM**
   - Solo usuarios con credenciales correctas
   - Auditable con CloudWatch

4. **Versionado y backups**
   - Activar versionado en bucket
   - Replicación cross-region si es necesario

### ❌ Problemas evitados:

- Variables de entorno visibles en logs
- Límite de 64KB excedido
- Riesgo de hardcodear secretos en código
- Dificultad para rotar firmas grandes

---

## 🚀 Migración Ejecutada

### Fecha: 2026-06-16

### Pasos completados:

1. ✅ Script `upload-firma-s3.ts` ejecutado exitosamente
2. ✅ Firma subida a S3: `firmas/responsable-sst.json`
3. ✅ Variable `USE_S3_FOR_SIGNATURES=true` agregada
4. ✅ Variable `IND_FIRMA_RESPONSABLE_SST` eliminada del .env.local
5. ✅ Backup creado: `.env.local.backup`
6. ✅ Tamaño reducido: 79.33 KB → 58.57 KB

### Estado: ✅ Completado

---

## 🧪 Pruebas Requeridas

### Antes de considerar finalizado:

1. **Probar regeneración de documentos:**
   ```bash
   npm run dev
   ```
   - Ir a un registro de inducción
   - Regenerar documento con firma automática
   - Verificar que el PDF contiene la firma correcta

2. **Verificar logs:**
   - Buscar: `[firmaStorage] Firma cargada desde S3`
   - No debe haber errores de acceso S3

3. **Rollback si falla:**
   ```bash
   cp .env.local.backup .env.local
   # Luego reiniciar el servidor
   ```

---

## 📊 Comparación de Soluciones

| Solución | Seguridad | Escalabilidad | Límite | Costo | Complejidad |
|---|---|---|---|---|---|
| Variables de entorno | ⚠️ Media | ❌ No | 64KB | Gratis | Baja |
| Hardcodear en código | ❌ Muy baja | ❌ No | Ilimitado | Gratis | Muy baja |
| **S3 (elegida)** | ✅ Alta | ✅ Sí | Ilimitado | ~$0.01/mes | Media |
| Secrets Manager | ✅ Muy alta | ✅ Sí | 64KB | ~$0.40/mes | Media-Alta |
| Base de datos | ⚠️ Media-Alta | ✅ Sí | Ilimitado | Variable | Alta |

**Decisión:** S3 es el mejor equilibrio entre seguridad, costo y simplicidad.

---

## 🔄 Flujo de Carga de Firma

```typescript
// API Route recibe solicitud de generar PDF
const firmaDataUrl = await obtenerFirmaResponsableSst();

// Función obtenerFirmaResponsableSst():
if (USE_S3_FOR_SIGNATURES) {
  // Estrategia 1: S3
  try {
    const object = await s3Client.send(GetObjectCommand);
    const encryptedData = await object.Body.transformToString();
    const decrypted = decryptAES(encryptedData);
    return JSON.parse(decrypted).signature;
  } catch {
    // Continuar al fallback
  }
}

// Estrategia 2: Fallback a variable de entorno
if (process.env.IND_FIRMA_RESPONSABLE_SST) {
  const decrypted = decryptAES(process.env.IND_FIRMA_RESPONSABLE_SST);
  return JSON.parse(decrypted).signature;
}

return null; // No hay firma disponible
```

---

## 📝 Mantenimiento Futuro

### Actualizar la firma:

1. Cifrar nueva firma (proceso existente)
2. Actualizar variable en `.env.local`: `IND_FIRMA_RESPONSABLE_SST=nueva-firma-cifrada`
3. Re-ejecutar: `npx tsx scripts/upload-firma-s3.ts`
4. Probar que funciona
5. (Opcional) Eliminar variable del `.env.local` nuevamente

### Agregar más firmas:

Repetir el proceso para cada firma:
- Crear constantes en `firmas.config.ts`
- Agregar funciones en `firmaStorage.ts`
- Subir a S3 con el script de upload

---

## 🐛 Troubleshooting

### Error: "Firma no encontrada en S3"

**Solución:**
1. Verificar en AWS Console que existe `firmas/responsable-sst.json`
2. Re-ejecutar: `npx tsx scripts/upload-firma-s3.ts`

### Error: "Access Denied"

**Solución:**
Verificar permisos IAM:
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::sirius-sg-sst/firmas/*"
}
```

### Error: "Variables de entorno aún exceden 64KB"

**Solución:**
1. Verificar que `IND_FIRMA_RESPONSABLE_SST` fue eliminada:
   ```bash
   grep "IND_FIRMA_RESPONSABLE_SST" .env.local
   # Debe retornar 0 resultados
   ```
2. Ver tamaño actual:
   ```bash
   wc -c .env.local | awk '{printf "%.2f KB\n", $1/1024}'
   ```

---

## ✅ Checklist de Verificación

- [x] Firma subida a S3
- [x] `USE_S3_FOR_SIGNATURES=true` configurado
- [x] Variable `IND_FIRMA_RESPONSABLE_SST` eliminada
- [x] Tamaño de `.env.local` < 64KB
- [x] Backup creado (`.env.local.backup`)
- [ ] **Prueba funcional realizada** (generar PDF con firma)
- [ ] **Verificación en staging/producción**
- [ ] **Documentación compartida con el equipo**

---

## 📞 Contacto

Si hay problemas con esta implementación:
- Restaurar backup: `cp .env.local.backup .env.local`
- Revisar logs del servidor
- Verificar credenciales AWS
- Consultar `MIGRACION_FIRMAS_S3.md` para más detalles

---

**Última actualización:** 2026-06-16  
**Estado:** ✅ Migración completada - Pendiente prueba funcional  
**Responsable:** Claude Code + Usuario
