# Estado del Módulo Sociodemográfico - 2026-06-11

## ✅ Completado

### 1. Página del Módulo
- ✅ `src/app/dashboard/sociodemografico/page.tsx` — Página principal creada
- ✅ Build de Next.js exitoso sin errores TypeScript
- ✅ UI informativa con estado de desarrollo
- ✅ Vista previa de funcionalidades planificadas
- ✅ Barras de progreso de implementación

### 2. Scripts y Herramientas
- ✅ `scripts/create-socio-tables.ts` — Script de creación automática de tablas (con limitaciones de API)
- ✅ `scripts/extract-socio-field-ids.ts` — Script funcional para extraer Field IDs
- ✅ `scripts/delete-socio-tables.ts` — Script para limpieza de tablas

### 3. Documentación
- ✅ `MODULO_SOCIODEMOGRAFICO_MANUAL.md` — Guía completa para creación manual de tablas
- ✅ `ESTADO_MODULO_SOCIODEMOGRAFICO.md` — Este archivo de estado

### 4. Tabla socio_campanas
- ✅ Tabla creada en Airtable (ID: `tblRv50xxFUTET8D9`)
- ✅ 8 campos creados:
  - Nombre
  - Periodo (Single select: Semestre_1, Semestre_2)
  - Año
  - Estado (Single select: Activa, Cerrada)
  - Fecha_Inicio
  - Fecha_Cierre
  - Creado_Por
  - ID_Campana (Formula)
- ✅ Field IDs extraídos y documentados

### 5. Integración al Dashboard
- ✅ Módulo agregado al Dashboard Principal (`src/app/dashboard/page.tsx`)
- ✅ Ubicado en Fase P (PLANEAR) del ciclo PHVA
- ✅ Ícono `userGroup` agregado
- ✅ Estado: `active` (módulo accesible)
- ✅ Ruta funcional: `/dashboard/sociodemografico`
- ✅ Estándar: 1.2.1 (Caracterización de población trabajadora)

---

## 🚧 Pendiente

### PASO 2 — Tablas Airtable (75% completado)

#### Crear manualmente 3 tablas:
1. **socio_tokens** (5 campos)
   - Token
   - Campana (Link → socio_campanas)
   - Personal (Link → Personal tblJNdYasZrhBniJj)
   - Usado
   - Fecha_Uso

2. **socio_respuestas** (48 campos) ⚠️ TABLA GRANDE
   - 3 campos de referencia (Token, Campana, Personal)
   - 45 campos de datos de la encuesta (7 secciones)

3. **socio_informes** (4 campos)
   - Campana
   - URL_PDF
   - Generado_Por
   - Total_Respuestas

**Guía:** Ver `MODULO_SOCIODEMOGRAFICO_MANUAL.md` para especificaciones completas.

### PASO 3 — Variables de Entorno (25% completado)

#### Variables ya agregadas (socio_campanas):
```env
AIRTABLE_SOCIO_BASE_ID=appBU8J9xGIFJSOVc
AIRTABLE_SOCIO_CAMPANAS_TABLE_ID=tblRv50xxFUTET8D9
AIRTABLE_SOCIO_CAMPANAS_NOMBRE=fldyGEfUbC8nqMem0
AIRTABLE_SOCIO_CAMPANAS_PERIODO=fldMt9SPar6zR60rc
AIRTABLE_SOCIO_CAMPANAS_AÑO=fld8wGP81wxRtoqNS
AIRTABLE_SOCIO_CAMPANAS_ESTADO=fldHtYPisS0ohpUmT
AIRTABLE_SOCIO_CAMPANAS_FECHA_INICIO=fldgZwOCgva7Powmf
AIRTABLE_SOCIO_CAMPANAS_FECHA_CIERRE=fldWL8PKI0vfOGxQW
AIRTABLE_SOCIO_CAMPANAS_CREADO_POR=fld5q1oCAcOK3nKqP
AIRTABLE_SOCIO_CAMPANAS_ID_CAMPANA=fld14kp71F3sFV4lu
```

#### Pendiente:
- ~55 variables más de socio_tokens, socio_respuestas, socio_informes

**Acción:** Después de crear las 3 tablas, ejecutar:
```bash
npx tsx scripts/extract-socio-field-ids.ts
```

### PASO 4 — Arquitectura y Capas (0%)

Estructura a crear:
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
  ├── application/
  │   └── use-cases/
  │       ├── CrearCampana.ts
  │       ├── GenerarTokens.ts
  │       ├── ObtenerFormulario.ts
  │       ├── GuardarRespuesta.ts
  │       ├── ObtenerEstadisticas.ts
  │       └── GenerarInformePDF.ts
  ├── infrastructure/
  │   └── airtable/
  │       ├── AirtableCampanaRepository.ts
  │       ├── AirtableTokenRepository.ts
  │       ├── AirtableRespuestaRepository.ts
  │       └── AirtableInformeRepository.ts
  └── presentation/
      ├── api/
      │   ├── campanas/route.ts
      │   ├── campanas/[id]/cerrar/route.ts
      │   ├── campanas/[id]/tokens/route.ts
      │   ├── campanas/[id]/estadisticas/route.ts
      │   ├── campanas/[id]/piramide/route.ts
      │   ├── campanas/[id]/informe/route.ts
      │   └── respuestas/[token]/route.ts
      └── pages/
          └── encuesta/socio/[token]/page.tsx
```

### PASO 5 — Endpoints API (0%)

8 endpoints a implementar:
1. `POST /api/socio/campanas` — Crear campaña
2. `POST /api/socio/campanas/:id/tokens` — Generar tokens
3. `GET /encuesta/socio/:token` — Página pública
4. `POST /api/socio/respuestas/:token` — Guardar respuestas
5. `GET /api/socio/campanas/:id/estadisticas` — Tabulación
6. `GET /api/socio/campanas/:id/piramide` — Pirámide poblacional
7. `POST /api/socio/campanas/:id/informe` — Generar PDF
8. `GET /api/socio/informes/:id/descargar` — Descargar PDF

### PASO 6 — Informe PDF Corporativo (0%)

Generación server-side con:
- Portada con logo Sirius
- Nota legal (Ley 1581/2012)
- Tablas de frecuencias
- Gráficos (barras/torta)
- Pirámide poblacional
- Indicadores SST

### PASO 7 — UI: Página Pública de Encuesta (0%)

Características:
- Responsive (móvil first)
- Barra de progreso (7 secciones)
- Preguntas condicionales (show/hide)
- Validación legal (2 checkboxes)
- Paleta: Verde Alegría #00B602, Azul Barranca #0154AC

### PASO 8 — UI: Panel de Administración (0%)

Vistas:
- Lista de campañas
- Estado de tokens (Respondido ✅ / Pendiente ⏳)
- Estadísticas y pirámide
- Generación de informe PDF

---

## 📋 Próximos Pasos Inmediatos

### Opción A: Manual + Script (⏱️ ~30 minutos)
1. Crear 3 tablas en Airtable según `MODULO_SOCIODEMOGRAFICO_MANUAL.md`
2. Ejecutar `npx tsx scripts/extract-socio-field-ids.ts`
3. Copiar output al final de `.env.local`
4. Continuar con implementación de Domain/Application/Infrastructure

### Opción B: Automatizada (⏱️ tiempo indefinido)
1. Resolver problema de API Metadata de Airtable con linked records
2. Ejecutar script completo de creación
3. Continuar con implementación

---

## 🎯 Estimación de Tiempo Restante

| Fase | Tiempo Estimado | Complejidad |
|---|---|---|
| Creación de tablas | 30 min | Baja |
| Extracción de Field IDs | 5 min | Baja |
| Domain Layer | 1 hora | Media |
| Application Layer | 2 horas | Media |
| Infrastructure Layer | 2 horas | Alta |
| Endpoints API | 3 horas | Alta |
| Página Pública Encuesta | 3 horas | Alta |
| Panel Administración | 2 horas | Media |
| Generación PDF | 2 horas | Alta |
| Testing y ajustes | 2 horas | Media |
| **TOTAL** | **~17.5 horas** | |

---

## 📝 Notas Técnicas

### Limitaciones encontradas en API Airtable:
- Campos `formula` no se pueden crear en `POST /tables`, deben agregarse después
- Campos `multipleRecordLinks` requieren sintaxis exacta: `linkedTableId`, `isReversed`, `prefersSingleRecordLink`
- Campos `checkbox` requieren `options: { icon, color }`
- Campos `number` requieren `options: { precision }`

### Decisiones de diseño:
- Respuestas son **inmutables** — sin endpoints de edición
- Validación obligatoria de `acepta_politica_datos` y `firma_veracidad`
- Tokens UUID v4 únicos por colaborador por campaña
- Almacenamiento de PDF en Cloudflare R2 (no Vercel Blob)
- Zona horaria fija: `America/Bogota`

---

## 🔗 Referencias

- Prompt original: `prompt_modulo_sociodemografico_sgsst.md`
- Guía manual: `MODULO_SOCIODEMOGRAFICO_MANUAL.md`
- Arquitectura del proyecto: `CLAUDE.md`
- Ley 1581 de 2012: Habeas Data Colombia
- Resolución 0312 de 2019: Estándares Mínimos SG-SST

---

**Última actualización:** 2026-06-11  
**Estado general:** 25% completado  
**Siguiente acción:** Crear tablas socio_tokens, socio_respuestas, socio_informes
