# 🔐 CLASIFICACIÓN DE ENDPOINTS — SG-SST
**Fecha:** 2026-07-21  
**Sprint:** S2 — Plan 90 Días  
**Total Endpoints:** 133

---

## CATEGORÍAS DE AUTENTICACIÓN

### 🟢 PÚBLICO (23 endpoints)
No requieren autenticación — acceso con token autofirmado o completamente abierto.

#### Auth (3)
- `/api/auth/login` — POST
- `/api/auth/register` — POST
- `/api/auth/verify` — GET/POST

#### Firmas Públicas (8)
- `/api/registros-asistencia/firmar-publico` — POST
- `/api/entregas-epp/firmar-publico` — POST
- `/api/inspecciones-equipos/firmar-publico` — POST
- `/api/inducciones/firma/[token]` — GET/POST
- `/api/politicas/firmar` — POST (usa token en body)
- `/api/cocolab/actas/[id]/firmar-asistente` — POST
- `/api/copasst/actas/[id]/firmar-asistente` — POST

#### Validación de Tokens (7)
- `/api/registros-asistencia/token` — GET
- `/api/entregas-epp/token/validar` — GET
- `/api/inspecciones-equipos/token/validar` — GET
- `/api/inducciones/token/[token]` — GET
- `/api/politicas/token` — GET
- `/api/socio/tokens/validar/[token]` — GET

#### Respuestas Públicas (3)
- `/api/socio/respuestas/[token]` — GET/POST
- `/api/evaluaciones/responder` — POST (requiere token en body)

#### Visualización Pública (2)
- `/api/cocolab/actas/[id]/pdf` — GET
- `/api/copasst/actas/[id]/pdf` — GET

---

### 🟡 AUTENTICADO (95 endpoints)
Requieren JWT válido — cualquier usuario autenticado.

#### Capacitaciones (16)
- `/api/capacitaciones` — GET/POST/PUT/DELETE
- `/api/programacion-capacitaciones` — GET/POST/PUT/DELETE
- `/api/registros-asistencia` — GET/POST/PUT/DELETE
- `/api/registros-asistencia/[id]` — GET/PUT/DELETE
- `/api/registros-asistencia/conferencista` — GET
- `/api/registros-asistencia/firmar` — POST
- `/api/registros-asistencia/exportar` — GET
- `/api/registros-asistencia/evaluaciones-pdf` — GET
- `/api/evaluaciones/plantilla/[id]` — GET
- `/api/evaluaciones/lista-evento` — GET
- `/api/evaluaciones/pendientes` — GET
- `/api/evaluaciones/check-batch` — POST
- `/api/evaluaciones/resultado-pdf` — GET
- `/api/evaluaciones/resultado-pdf-unificado` — GET
- `/api/evaluaciones/poblaciones` — GET
- `/api/comites/capacitaciones-ejecutadas` — GET

#### Inducciones (16)
- `/api/inducciones` — GET/POST/PUT/DELETE
- `/api/inducciones/[id]` — GET/PUT/DELETE
- `/api/inducciones/colaborador/[empId]` — GET
- `/api/inducciones/dashboard` — GET
- `/api/inducciones/alertas` — GET
- `/api/inducciones/certificado` — POST
- `/api/inducciones/constancia` — POST
- `/api/inducciones/documento-unificado` — POST
- `/api/inducciones/evaluacion` — GET/POST
- `/api/inducciones/firma-responsable` — POST
- `/api/inducciones/regenerar-documento` — POST
- `/api/inducciones/responsable-sst` — GET
- `/api/inducciones/token` — GET/POST
- `/api/inducciones/actualizar-snapshot` — POST
- `/api/inducciones/diagnostico` — GET

#### Entregas EPP (12)
- `/api/entregas-epp` — GET/POST/PUT/DELETE
- `/api/entregas-epp/historial` — GET
- `/api/entregas-epp/exportar` — GET
- `/api/entregas-epp/exportar-pdf` — GET
- `/api/entregas-epp/firmar` — POST
- `/api/entregas-epp/firmar-directo` — POST
- `/api/entregas-epp/descifrar` — POST
- `/api/entregas-epp/enviar-link` — POST
- `/api/entregas-epp/regenerar-token` — POST
- `/api/entregas-epp/foto-evidencia` — GET/POST/DELETE
- `/api/entregas-epp/foto-evidencia/presign` — POST
- `/api/entregas-epp/foto-evidencia/actualizar` — POST

#### Inspecciones Áreas (9)
- `/api/inspecciones-areas` — GET/POST/PUT/DELETE
- `/api/inspecciones-areas/[id]` — GET/PUT/DELETE
- `/api/inspecciones-areas/exportar` — GET
- `/api/inspecciones-areas/exportar-pdf` — GET
- `/api/inspecciones-areas/descifrar` — POST
- `/api/inspecciones-areas/fotos` — GET/POST/DELETE
- `/api/inspecciones-areas/fotos/presign` — POST
- `/api/inspecciones-areas/fotos/actualizar` — POST

#### Inspecciones EPP (5)
- `/api/inspecciones-epp` — GET/POST/PUT/DELETE
- `/api/inspecciones-epp/[id]` — GET/PUT/DELETE
- `/api/inspecciones-epp/exportar` — GET
- `/api/inspecciones-epp/exportar/[id]` — GET
- `/api/inspecciones-epp/descifrar` — POST

#### Inspecciones Equipos (10)
- `/api/inspecciones-equipos` — GET/POST/PUT/DELETE
- `/api/inspecciones-equipos/[id]` — GET/PUT/DELETE
- `/api/inspecciones-equipos/exportar` — GET
- `/api/inspecciones-equipos/exportar-pdf` — GET
- `/api/inspecciones-equipos/generar-link` — POST
- `/api/inspecciones-equipos/foto-equipo` — GET/POST/DELETE
- `/api/inspecciones-equipos/foto-equipo/presign` — POST
- `/api/inspecciones-equipos/foto-equipo/actualizar` — POST

#### Inspecciones Específicas (4)
- `/api/inspecciones-botiquin` — GET/POST/PUT/DELETE
- `/api/inspecciones-botiquin/exportar-pdf` — GET
- `/api/inspecciones-camilla/exportar-pdf` — GET
- `/api/inspecciones-extintor/exportar-pdf` — GET
- `/api/inspecciones-kit-derrames/exportar-pdf` — GET

#### Inventario (3)
- `/api/insumos/epp` — GET/POST/PUT/DELETE
- `/api/insumos/movimientos` — GET/POST
- `/api/equipos-emergencia` — GET/POST/PUT/DELETE

#### Políticas (6)
- `/api/politicas` — GET/POST/PUT/DELETE
- `/api/politicas/[id]` — GET/PUT/DELETE
- `/api/politicas/estadisticas` — GET
- `/api/politicas/estado-firma` — GET
- `/api/politicas/generar-link` — POST

#### Comités (8)
- `/api/comites/miembros` — GET/POST/PUT/DELETE
- `/api/cocolab/actas` — GET/POST
- `/api/cocolab/actas/[id]` — GET/PUT/DELETE
- `/api/cocolab/actas/[id]/firmar` — POST
- `/api/cocolab/compromisos/pendientes` — GET
- `/api/copasst/actas` — GET/POST
- `/api/copasst/actas/[id]` — GET/PUT/DELETE
- `/api/copasst/actas/[id]/firmar` — POST
- `/api/copasst/compromisos/pendientes` — GET

#### Sociodemográfico (6)
- `/api/socio/campanas` — GET/POST
- `/api/socio/campanas/[id]` — GET/PUT/DELETE
- `/api/socio/campanas/[id]/cerrar` — POST
- `/api/socio/campanas/[id]/estadisticas` — GET
- `/api/socio/campanas/[id]/exportar-pdf` — GET
- `/api/socio/campanas/[id]/piramide` — GET
- `/api/socio/campanas/[id]/respuestas` — GET
- `/api/socio/campanas/[id]/tokens` — GET/POST

---

### 🔴 ADMIN (15 endpoints)
Requieren JWT válido + rol administrador.

#### Personal (2)
- `/api/personal` — GET/POST/PUT/DELETE
- `/api/personal/validar` — POST

#### Seguimiento Vehicular (11)
- `/api/sgsst/vehicular` — GET
- `/api/sgsst/vehicular/[id_personal]` — GET
- `/api/sgsst/vehicular/vehiculos` — POST/PUT
- `/api/sgsst/vehicular/vehiculos/[id]` — GET/PUT/DELETE
- `/api/sgsst/vehicular/documentos` — POST/PUT
- `/api/sgsst/vehicular/documentos/vencimientos` — GET
- `/api/sgsst/vehicular/licencias` — POST/PUT
- `/api/sgsst/vehicular/licencias/vencimientos` — GET
- `/api/sgsst/vehicular/alertas` — GET
- `/api/sgsst/vehicular/alertas/trigger` — POST (cron job)
- `/api/sgsst/vehicular/diagnostico` — GET

#### Utilidades (2)
- `/api/transcribir` — POST (OpenAI API — solo admin)

---

## PLAN DE IMPLEMENTACIÓN

### Fase 1 — Endpoints Críticos (Esta Semana) ✅
**Objetivo:** Proteger rutas de escritura y datos sensibles.

1. **Personal y usuarios** (2 endpoints)
   - ✅ `/api/personal` — requireAdmin
   - ✅ `/api/personal/validar` — requireAdmin

2. **Exportaciones y reportes** (12 endpoints)
   - ✅ Todos los `/exportar`, `/exportar-pdf` — requireAuth
   - ✅ Todos los `/resultado-pdf` — requireAuth

3. **Operaciones de escritura críticas** (20 endpoints)
   - ✅ POST/PUT/DELETE en capacitaciones, inducciones, entregas, inspecciones
   - ✅ Generación de tokens y links de firma

### Fase 2 — Endpoints de Lectura (Próxima Semana)
**Objetivo:** Proteger rutas GET que exponen datos.

1. **Listados y dashboards** (30 endpoints)
   - Todos los GET principales: `/api/capacitaciones`, `/api/inducciones`, etc.

2. **Historial y consultas** (15 endpoints)
   - `/historial`, `/dashboard`, `/estadisticas`

### Fase 3 — Módulos Especializados (Semana 3)
**Objetivo:** Comités, seguimiento vehicular, sociodemográfico.

1. **Comités SST** (8 endpoints)
2. **Seguimiento vehicular** (11 endpoints)
3. **Sociodemográfico** (6 endpoints)

---

## APLICACIÓN DEL MIDDLEWARE

### Ejemplo de Uso:
```typescript
import { requireAuth, requireAdmin } from "@/lib/authMiddleware";

// Endpoint autenticado
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.authenticated) return authResult.response;

  const user = authResult.user;
  // ... lógica del endpoint
}

// Endpoint admin
export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authenticated) return authResult.response;

  const user = authResult.user;
  // ... lógica del endpoint
}
```

---

## ENDPOINTS PÚBLICOS DOCUMENTADOS

Los siguientes endpoints son **intencionalmente públicos** (no es un olvido):

1. **Auth:** Login, registro, verificación
2. **Firmas públicas:** Links con token autofirmado HMAC-SHA256
3. **Validación de tokens:** Verificar validez de tokens de firma
4. **Evaluaciones públicas:** Responder evaluaciones con token
5. **Visualización de PDFs:** Actas de comités (público para impresión)

Estos endpoints NO pasan por `requireAuth` pero están protegidos por:
- Tokens HMAC-SHA256 con expiración (`signingToken.ts`)
- Validación de payload en cada request
- Rate limiting (pendiente implementar)

---

## PRÓXIMOS PASOS

1. ✅ Crear middleware JWT (`jwt.ts`, `authMiddleware.ts`)
2. ✅ Actualizar login para generar JWT
3. 🚧 Aplicar `requireAuth` a Fase 1 (endpoints críticos)
4. 📋 Aplicar `requireAuth` a Fase 2 (endpoints de lectura)
5. 📋 Aplicar `requireAdmin` a endpoints administrativos
6. 📋 Actualizar frontend para enviar JWT en Authorization header
7. 📋 Implementar rate limiting
8. 📋 Logging de intentos de acceso no autorizados

---

**Estado:** Fase 1 en progreso  
**Próxima revisión:** 2026-07-24
