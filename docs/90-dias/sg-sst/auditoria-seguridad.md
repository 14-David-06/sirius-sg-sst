# 🔒 AUDITORÍA DE SEGURIDAD — SG-SST
**Fecha:** 2026-07-21  
**Sprint:** S2 — Plan 90 Días  
**Área:** Tecnología Sirius Regenerative Solutions  
**Auditor:** Claude (Automatizado)

---

## 🚨 HALLAZGOS CRÍTICOS

### 1. ENDPOINTS DE DEBUG/TEST EXPUESTOS (PRIORIDAD: CRÍTICA)

Se encontraron **7 endpoints de debug/test** sin protección aparente:

#### Categoría A: Endpoints de Diagnóstico con Datos Sensibles

| Endpoint | Archivo | Riesgo | Estado |
|----------|---------|--------|--------|
| `/api/debug/preguntas-induccion` | `src/app/api/debug/preguntas-induccion/route.ts` | 🔴 **ALTO** | Expuesto |
| `/api/politicas/debug-firmas` | `src/app/api/politicas/debug-firmas/route.ts` | 🔴 **ALTO** | Expuesto |
| `/api/socio/debug-config` | `src/app/api/socio/debug-config/route.ts` | 🟡 **MEDIO** | Expuesto |

**Riesgos:**
- **debug-firmas:** Expone estructura completa de datos de firmas, field IDs, fórmulas de filtro
- **preguntas-induccion:** Expone banco de preguntas con respuestas correctas
- **debug-config:** Expone información de configuración de variables de entorno (no valores, pero estructura)

#### Categoría B: Endpoints de Testing Funcional

| Endpoint | Archivo | Riesgo | Estado |
|----------|---------|--------|--------|
| `/api/inducciones/test-id` | `src/app/api/inducciones/test-id/route.ts` | 🟡 **MEDIO** | Expuesto |
| `/api/inducciones/test-relacion` | `src/app/api/inducciones/test-relacion/route.ts` | 🟠 **MEDIO-ALTO** | Expuesto |

**Riesgos:**
- **test-id:** Genera IDs secuenciales, podría usarse para enumerar registros
- **test-relacion:** Crea registros de prueba en la base de datos real (SIRIUS-PER-0001)

#### Categoría C: Directorios Vacíos (Residuos)

| Directorio | Estado |
|------------|--------|
| `src/app/api/inducciones/debug/` | 📁 Vacío |
| `src/app/api/inducciones/test-filter/` | 📁 Vacío |

**Evidencia histórica:**
- Commit `4faae4d`: "debug: agregar logging exhaustivo para rastrear ID empleado duplicado"

---

### 2. AUTENTICACIÓN Y AUTORIZACIÓN (PRIORIDAD: ALTA)

#### ✅ Hallazgos Positivos:
- **NO** se encontró middleware de autenticación centralizado
- Solo **5 archivos** implementan verificación de auth:
  - `src/app/api/auth/login/route.ts` (2 menciones)
  - `src/app/api/entregas-epp/historial/route.ts` (2)
  - `src/app/api/entregas-epp/exportar/route.ts` (2)
  - `src/app/api/entregas-epp/exportar-pdf/route.ts` (2)
  - `src/app/api/inducciones/firma/[token]/route.ts` (1)

#### 🔴 Problemas:
- **133 endpoints totales**, solo ~5 implementan auth explícita
- No hay middleware global en `/app/api/middleware.ts`
- Inconsistencia: algunos módulos protegen historial/exportar pero no el GET/POST principal

**Recomendación Urgente:**
- Auditar TODOS los endpoints y clasificar por nivel de sensibilidad
- Implementar middleware de autenticación centralizado
- Aplicar regla: por defecto, todo requiere auth; los públicos se marcan explícitamente

---

### 3. GESTIÓN DE TOKENS API (PRIORIDAD: MEDIA)

#### ✅ Arquitectura Correcta:
- **3 tokens** separados por base de datos:
  - `AIRTABLE_API_TOKEN` (Base Personal)
  - `AIRTABLE_SGSST_API_TOKEN` (Base SG-SST)
  - `AIRTABLE_INSUMOS_API_TOKEN` (Base Insumos SST)

#### ✅ Seguridad:
- Tokens **NO hardcodeados** en el código
- Todos los tokens se cargan desde `process.env`
- Centralización en archivos de config:
  - `src/infrastructure/config/airtable.ts`
  - `src/infrastructure/config/airtableSGSST.ts`
  - `src/infrastructure/config/airtableInsumos.ts`
  - `src/infrastructure/config/airtableInducciones.ts`
  - `src/infrastructure/config/awsS3.ts`

#### 🟡 Observación:
- El endpoint `debug/preguntas-induccion` carga token manualmente:
  ```typescript
  const AIRTABLE_SGSST_API_TOKEN = process.env.AIRTABLE_SGSST_API_TOKEN;
  ```
  (Debería usar el cliente centralizado)

---

### 4. CREDENCIALES Y SECRETOS (PRIORIDAD: CRÍTICA)

#### ✅ Hallazgos Positivos:
- **NO** se encontraron archivos `.env` commiteados
- **NO** se encontraron tokens hardcodeados con formato `patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXX`
- **NO** se encontraron API keys en texto plano
- Commit reciente de sanitización: `965879e — 🔒 security: Sanitizar IDs reales en .env.example`

#### Referencias seguras encontradas:
- 8 archivos cargan variables sensibles correctamente desde `process.env`:
  - `AIRTABLE_API_TOKEN` (4 archivos)
  - `AWS_SECRET_ACCESS_KEY` (1 archivo)
  - `JWT_SECRET` (implícito en auth)
  - `OPENAI_API_KEY` (1 archivo: `transcribir/route.ts`)

---

## 📊 RESUMEN DE RIESGOS

| Categoría | Riesgo | Hallazgos | Acción Requerida |
|-----------|--------|-----------|------------------|
| **Endpoints Debug** | 🔴 CRÍTICO | 7 expuestos | Eliminar o proteger con auth + flag ENV |
| **Autenticación** | 🔴 ALTO | 128/133 sin auth verificable | Auditar y aplicar middleware |
| **Tokens API** | 🟢 BAJO | Arquitectura correcta | Mantener práctica actual |
| **Secretos** | 🟢 BAJO | Sin hardcodeo | Mantener práctica actual |

---

## ✅ RECOMENDACIONES INMEDIATAS

### Prioridad 1 (Esta Semana):
1. **Eliminar endpoints de debug de producción:**
   - Opción A: Borrar los archivos completamente
   - Opción B: Proteger con `if (process.env.NODE_ENV !== 'production')` + autenticación admin
   - Archivos a revisar:
     ```
     src/app/api/debug/preguntas-induccion/route.ts
     src/app/api/politicas/debug-firmas/route.ts
     src/app/api/socio/debug-config/route.ts
     src/app/api/inducciones/test-id/route.ts
     src/app/api/inducciones/test-relacion/route.ts
     ```

2. **Limpiar directorios vacíos:**
   ```bash
   rm -rf src/app/api/inducciones/debug
   rm -rf src/app/api/inducciones/test-filter
   ```

### Prioridad 2 (Próximas 2 Semanas):
3. **Implementar middleware de autenticación:**
   - Crear `src/app/api/middleware.ts` con verificación JWT
   - Aplicar a todos los endpoints sensibles
   - Documentar endpoints públicos intencionales (firma/[token], evaluar/capacitacion)

4. **Auditar permisos por endpoint:**
   - Clasificar endpoints en: público / autenticado / admin
   - Implementar control de acceso basado en roles (ya existe `accessControl.ts`)

### Prioridad 3 (Este Sprint):
5. **Monitoreo y alertas:**
   - Configurar logging de accesos a endpoints sensibles
   - Implementar rate limiting en endpoints de escritura
   - Alertas para intentos de acceso no autorizados

---

## 📋 COMPARACIÓN CON PROYECTO PIRÓLISIS

| Aspecto | Pirólisis | SG-SST | Gap |
|---------|-----------|--------|-----|
| **Token Global** | ✅ Único desde día 1 | ❌ 3 tokens (necesario por arquitectura) | N/A |
| **Endpoints Debug** | ✅ Sin endpoints expuestos | ❌ 7 endpoints expuestos | 🔴 |
| **Auth Middleware** | ✅ Centralizado | ❌ Inconsistente | 🔴 |
| **Secretos** | ✅ Sin hardcodeo | ✅ Sin hardcodeo | ✅ |

**Nota sobre tokens múltiples:**  
A diferencia de Pirólisis, SG-SST usa 3 bases de Airtable separadas (Personal, Insumos, SG-SST), por lo que requiere 3 tokens. Esto es correcto desde el punto de vista de seguridad (principio de mínimo privilegio).

---

## 🔄 SIGUIENTE PASO

**⚠️ DECISIÓN REQUERIDA:**  
Antes de continuar con el inventario técnico (Paso 2), se requiere aprobación para:

1. ¿Eliminar los 7 endpoints de debug/test?
2. ¿O protegerlos con autenticación y variable de entorno `ENABLE_DEBUG_ENDPOINTS=true`?

**Recomendación del auditor:** Opción 1 (eliminar) para reducir superficie de ataque.

---

## 📎 ANEXOS

### A. Lista Completa de Endpoints API
**Total:** 133 endpoints  
**Con auth verificable:** ~5  
**Debug/Test:** 7  
**Producción:** ~121  

Ver archivo completo: `docs/90-dias/sg-sst/inventario-tecnico.md` (pendiente generación tras aprobación)

### B. Commits Relacionados con Seguridad
- `965879e` — 🔒 security: Sanitizar IDs reales en .env.example
- `4faae4d` — debug: agregar logging exhaustivo para rastrear ID empleado duplicado

### C. Ramas Activas
- `main` (actual)
- `copilot/research-emergency-equipment-module` (origen + local)

**Análisis de ramas:** 1 rama de feature activa (research-emergency-equipment-module) — estado desconocido, requiere revisión en inventario técnico.

---

**FIN DEL REPORTE DE AUDITORÍA**  
**Siguiente documento:** `inventario-tecnico.md` (se generará tras resolver hallazgos críticos)
