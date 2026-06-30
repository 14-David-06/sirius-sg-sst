# Progreso del Módulo Sociodemográfico

**Última actualización:** 2026-06-11  
**Progreso general:** 45%

## ✅ Completado

### Infraestructura (100%)
- [x] 4 tablas creadas en Airtable
  - socio_campanas (11 campos)
  - socio_tokens (6 campos)
  - socio_respuestas (37 campos)
  - socio_informes (4 campos)
- [x] 68+ Field IDs extraídos
- [x] Variables de entorno configuradas en `.env.local`
- [x] Paquetes instalados: `airtable`, `uuid`
- [x] Build de Next.js sin errores

### Domain Layer (100%)
- [x] `Campana.ts` — Entidad + DTOs (CrearCampanaDTO, CerrarCampanaDTO)
- [x] `Token.ts` — Entidad + DTOs (GenerarTokensDTO, TokenGenerado, TokenConPersonal)
- [x] `Respuesta.ts` — Entidad + 15 tipos enumerados + GuardarRespuestaDTO
- [x] `Informe.ts` — Entidad + DTOs + EstadisticasCampana + PiramidePoblacional
- [x] `ICampanaRepository` — Interface con 6 métodos
- [x] `ITokenRepository` — Interface con 6 métodos
- [x] `IRespuestaRepository` — Interface con 6 métodos
- [x] `IInformeRepository` — Interface con 3 métodos

### Infrastructure Layer (40%)
- [x] `config.ts` — Configuración centralizada de Airtable
- [x] `AirtableCampanaRepository` — CRUD completo + estadísticas
- [x] `AirtableTokenRepository` — Generación, validación, listado
- [ ] `AirtableRespuestaRepository` — Pendiente
- [ ] `AirtableInformeRepository` — Pendiente

### Presentation Layer - API (25%)
- [x] `POST /api/socio/campanas` — Crear campaña
- [x] `GET /api/socio/campanas` — Listar todas las campañas con estadísticas
- [x] `POST /api/socio/campanas/:id/tokens` — Generar tokens para colaboradores
- [x] `GET /api/socio/campanas/:id/tokens` — Listar tokens de una campaña
- [ ] `POST /api/socio/campanas/:id/cerrar` — Cerrar campaña
- [ ] `GET /api/socio/campanas/:id/estadisticas` — Obtener estadísticas
- [ ] `POST /api/socio/respuestas/:token` — Guardar respuesta de encuesta
- [ ] `POST /api/socio/campanas/:id/informe` — Generar informe PDF

### Presentation Layer - UI (5%)
- [x] `/dashboard/sociodemografico` — Página principal con estado
- [ ] `/dashboard/sociodemografico/campanas` — Gestión de campañas
- [ ] `/dashboard/sociodemografico/campanas/nueva` — Crear campaña
- [ ] `/dashboard/sociodemografico/campanas/:id` — Vista detalle
- [ ] `/encuesta/socio/:token` — Formulario público (7 secciones)

## ⏳ Pendiente

### Alta prioridad
1. **AirtableRespuestaRepository** — Para guardar y consultar respuestas
2. **Endpoint POST /api/socio/respuestas/:token** — Para guardar encuestas
3. **Formulario público** — 7 secciones con validaciones condicionales
4. **Panel de administración** — Listar campañas, ver estado, generar tokens

### Media prioridad
5. **Estadísticas y pirámide poblacional** — Tabulación automática
6. **Generación de PDF** — Informe corporativo con gráficos
7. **Envío de links por email** — Notificar a colaboradores

### Baja prioridad
8. **Dashboard con gráficos** — Visualización de estadísticas
9. **Exportación a Excel** — Datos tabulados
10. **Historial de campañas** — Comparación entre períodos

## 🧪 Endpoints probables

Los siguientes endpoints ya están implementados y pueden probarse:

```bash
# 1. Crear campaña
curl -X POST http://localhost:3000/api/socio/campanas \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Perfil Sociodemográfico Jun-2026",
    "periodo": "Semestre_1",
    "año": 2026,
    "fechaInicio": "2026-06-01",
    "creadoPor": "Admin SST"
  }'

# 2. Listar campañas
curl http://localhost:3000/api/socio/campanas

# 3. Generar tokens (reemplazar {id})
curl -X POST http://localhost:3000/api/socio/campanas/{id}/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "personalIds": ["recXXXXXXXXXXXXXX", "recYYYYYYYYYYYYYY"]
  }'

# 4. Listar tokens (reemplazar {id})
curl http://localhost:3000/api/socio/campanas/{id}/tokens
```

## 📝 Notas técnicas

- Todos los repositorios usan Airtable SDK oficial
- Tokens son UUID v4 generados con el paquete `uuid`
- Las respuestas son **inmutables** — no hay endpoints de edición
- Validación con Zod en todos los endpoints
- Clean Architecture: Domain → Infrastructure → Presentation
- Zona horaria: `America/Bogota` en todos los timestamps

## 🔗 Archivos clave

```
src/modules/sociodemografico/
├── domain/
│   ├── entities/
│   │   ├── Campana.ts
│   │   ├── Token.ts
│   │   ├── Respuesta.ts
│   │   └── Informe.ts
│   └── repositories/
│       ├── ICampanaRepository.ts
│       ├── ITokenRepository.ts
│       ├── IRespuestaRepository.ts
│       └── IInformeRepository.ts
├── infrastructure/
│   └── airtable/
│       ├── config.ts
│       ├── AirtableCampanaRepository.ts
│       └── AirtableTokenRepository.ts
└── presentation/
    └── api/
        └── socio/
            └── campanas/
                ├── route.ts
                └── [id]/tokens/route.ts
```

## 🎯 Siguiente iteración

**Objetivo:** Completar el ciclo completo de creación de campaña → generación de tokens → respuesta de encuesta.

**Tareas:**
1. Implementar `AirtableRespuestaRepository`
2. Crear endpoint `POST /api/socio/respuestas/:token`
3. Crear formulario público básico (sin estilos avanzados)
4. Probar flujo end-to-end

**Tiempo estimado:** 3-4 horas
