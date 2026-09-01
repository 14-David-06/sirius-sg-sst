# CLAUDE.md — Sirius SG-SST

> Archivo leído automáticamente por Claude Code CLI en cada sesión. Documenta el proyecto para todos los agentes de desarrollo.

## Stack Tecnológico

- **Framework**: Next.js 16.1.6 con App Router (monorepo — sin separación backend/frontend)
- **React**: 19.2.3 con React Compiler habilitado
- **TypeScript**: 5.x (strict mode)
- **Estilos**: Tailwind CSS 4 con PostCSS, glass-morphism UI oscuro
- **Base de datos**: Airtable (3 bases: Personal, Insumos SST, SG-SST)
- **Almacenamiento**: AWS S3 (evidencias, reportes PDF, documentos)
- **AI**: OpenAI API (transcripción y asistencia)
- **Auth**: JWT HMAC-SHA256 custom (`signingToken.ts`), bcryptjs (12 rounds)
- **PDF**: jsPDF + jsPDF-AutoTable
- **Excel**: ExcelJS (exportar registros)
- **Iconos**: Lucide React
- **Arquitectura**: Clean Architecture (core/domain → core/ports → core/use-cases → infrastructure)

## Estructura del Monorepo

```
src/
├── app/
│   ├── api/                         # Backend — Route handlers (Next.js)
│   │   ├── auth/                    # Login, registro, verificación
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── verify/route.ts
│   │   ├── capacitaciones/          # Catálogo de capacitaciones
│   │   ├── entregas-epp/            # CRUD + firma + exportar entregas EPP
│   │   │   ├── route.ts
│   │   │   ├── descifrar/
│   │   │   ├── enviar-link/
│   │   │   ├── exportar/
│   │   │   ├── firmar/
│   │   │   ├── firmar-directo/
│   │   │   ├── firmar-publico/
│   │   │   ├── historial/
│   │   │   ├── regenerar-token/
│   │   │   └── token/validar/
│   │   ├── equipos-emergencia/      # Catálogo equipos emergencia
│   │   │   ├── route.ts
│   │   │   └── migrar/              # Migración de datos
│   │   ├── evaluaciones/            # Evaluaciones post-capacitación
│   │   │   ├── check-batch/
│   │   │   ├── lista-evento/
│   │   │   ├── pendientes/
│   │   │   ├── plantilla/[id]/
│   │   │   ├── responder/
│   │   │   ├── resultado-pdf/
│   │   │   └── resultado-pdf-unificado/
│   │   ├── inspecciones-areas/      # Inspecciones de áreas físicas ⭐ NUEVO
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   ├── descifrar/
│   │   │   ├── exportar/
│   │   │   └── exportar-pdf/
│   │   ├── inspecciones-botiquin/   # Inspecciones de botiquines ⭐ NUEVO
│   │   │   └── route.ts
│   │   ├── inspecciones-camilla/    # Inspecciones de camillas ⭐ NUEVO
│   │   │   └── route.ts
│   │   ├── inspecciones-epp/        # Inspecciones EPP
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   ├── descifrar/
│   │   │   └── exportar/
│   │   │       └── [id]/
│   │   ├── inspecciones-equipos/    # Inspecciones equipos emergencia
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   ├── inspecciones-extintor/   # Inspecciones de extintores ⭐ NUEVO
│   │   │   └── route.ts
│   │   ├── inspecciones-kit-derrames/ # Inspecciones kits derrames ⭐ NUEVO
│   │   │   └── route.ts
│   │   ├── insumos/                 # Inventario (EPP + movimientos)
│   │   │   ├── epp/
│   │   │   └── movimientos/
│   │   ├── personal/                # Personal + validación
│   │   │   ├── route.ts
│   │   │   └── validar/
│   │   ├── programacion-capacitaciones/ # Programación anual
│   │   ├── registros-asistencia/    # Asistencia + evaluaciones + firma
│   │   │   ├── route.ts
│   │   │   ├── evaluaciones-pdf/
│   │   │   ├── exportar/
│   │   │   ├── firmar/
│   │   │   ├── firmar-publico/
│   │   │   └── token/
│   │   └── transcribir/             # Transcripción audio → texto
│   ├── (auth)/                      # Layout autenticación
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── dashboard/                   # Frontend — Páginas protegidas
│   │   ├── page.tsx                 # Home dashboard (módulos)
│   │   ├── evaluaciones/
│   │   ├── inspecciones/            # Hub de inspecciones
│   │   ├── informes/                # Informe mensual de gestión ⭐ NUEVO
│   │   ├── inspecciones-areas/      # Inspecciones áreas ⭐ NUEVO
│   │   │   ├── page.tsx
│   │   │   ├── historial/
│   │   │   └── [id]/
│   │   ├── inspecciones-emergencia/ # Botiquín, extintor, camilla, kit ⭐ NUEVO
│   │   │   ├── _components/         # config por tipo + primitivas de UI
│   │   │   ├── page.tsx             # Hub de los 4 tipos
│   │   │   └── [tipo]/
│   │   │       ├── page.tsx         # Captura (una pantalla, 4 tipos)
│   │   │       └── historial/
│   │   ├── inspecciones-equipos/
│   │   │   ├── page.tsx
│   │   │   └── historial/
│   │   ├── inventario-epp/
│   │   │   ├── page.tsx             # Dashboard inventario
│   │   │   ├── entrega/
│   │   │   ├── entregas/
│   │   │   ├── historial/
│   │   │   ├── ingreso/
│   │   │   └── inspeccion/
│   │   │       ├── page.tsx
│   │   │       └── historial/
│   │   ├── plan-anual/
│   │   ├── pve/
│   │   └── registros-asistencia/
│   │       ├── page.tsx
│   │       ├── evaluaciones/
│   │       ├── historial/
│   │       └── nuevo/
│   ├── evaluar/capacitacion/        # Evaluación pública
│   ├── firmar/capacitacion/         # Firma pública asistencia
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Landing (Header + Hero)
│   └── globals.css                  # Tailwind 4
├── components/                      # Componentes de dominio
│   └── evaluaciones/
│       └── EvaluacionFlow.tsx
├── core/                            # 🏗 Clean Architecture — Dominio
│   ├── domain/
│   │   ├── entities/User.ts         # User, VerifyResponse, AuthResponse
│   │   ├── services/accessControl.ts
│   │   └── value-objects/
│   ├── ports/
│   │   ├── input/                   # (futuro: interfaces de entrada)
│   │   └── output/                  # PersonRepository, PasswordHasher, Logger
│   └── use-cases/
│       ├── authenticateUser.ts
│       ├── registerPassword.ts
│       └── verifyUser.ts
├── infrastructure/                  # 🔌 Implementaciones concretas
│   ├── container.ts                 # Composition Root (DI manual)
│   ├── adapters/                    # (futuro: adaptadores externos)
│   ├── config/
│   │   ├── airtable.ts             # Base Personal (config + helpers)
│   │   ├── airtableInsumos.ts      # Base Insumos SST
│   │   ├── airtableSGSST.ts        # Base SG-SST (entregas, inspecciones)
│   │   └── awsS3.ts                # S3 client + upload/signed URLs
│   ├── repositories/
│   │   └── airtablePersonalRepository.ts
│   └── services/
│       ├── BcryptPasswordHasher.ts
│       └── ConsoleLogger.ts
├── lib/
│   └── signingToken.ts             # JWT HMAC-SHA256 para firma remota
├── presentation/                   # 🎨 UI Layer
│   ├── components/
│   │   ├── layout/                 # Header, Footer, Sidebar
│   │   ├── sections/               # HeroSection, etc.
│   │   └── ui/                     # Componentes genéricos
│   ├── context/
│   │   └── SessionContext.tsx       # Estado de sesión (localStorage)
│   ├── hooks/
│   │   └── useAuth.ts              # Hook de autenticación (3 pasos)
│   └── providers/
│       └── Providers.tsx            # SessionProvider wrapper
└── shared/                         # 📦 Código compartido
    ├── constants/index.ts           # APP_NAME, ROUTES
    ├── types/index.ts               # ApiResponse, PaginatedResponse
    └── utils/index.ts               # cn(), formatFechaColombia(), etc.
```

## Convenciones

- **Idioma**: Español colombiano en UI, comentarios y mensajes
- **Path alias**: `@/*` → `./src/*`
- **API pattern**: GET/POST/PUT/DELETE en un solo `route.ts` por recurso
- **Auth**: Login 3 pasos (verificar → password/crear password → sesión)
- **Sesión**: `localStorage` con `SessionContext` + cookie JWT para API
- **Clean Architecture**: `core/` nunca importa de `infrastructure/`, solo al revés
- **Composition Root**: `infrastructure/container.ts` — único punto de DI
- **Config Airtable**: Field IDs en variables de entorno para independencia de nombres
- **S3 Storage**: Evidencias y PDFs se almacenan en S3 con URLs firmadas
- **Soft-delete**: Registros no se eliminan, se marcan inactivos
- **Zona horaria**: Siempre `America/Bogota` para fechas

## Bases de Datos Airtable

| Base | Config | Tablas principales |
|---|---|---|
| **Personal** | `airtable.ts` | Personal, Sistemas, Roles |
| **Insumos SST** | `airtableInsumos.ts` | Insumo, Categoría, Movimientos, Stock |
| **SG-SST** | `airtableSGSST.ts` | 50+ tablas (ver detalles abajo) |

### Tablas en Base SG-SST (airtableSGSST.ts - 653 líneas)

**Entregas EPP:**
- Entregas EPP (cabecera)
- Detalle Entrega EPP
- Tokens Entrega
- Historial EPP Empleado

**Inspecciones EPP:**
- Inspecciones EPP (cabecera)
- Detalle Inspección EPP

**Inspecciones de Áreas:**
- Inspecciones Áreas (cabecera)
- Detalle Inspección Áreas (criterios)
- Responsables Inspección Áreas
- Acciones Correctivas Áreas

**Inspecciones de Equipos de Emergencia:**
- Equipos Emergencia (catálogo maestro)
- Inspecciones Equipos Emergencia (cabecera)
- Detalle Inspección Equipos
- Responsables Inspección Equipos

**Inspecciones Específicas (4 tipos):**
- Inspecciones Botiquín + Detalle + Responsables + Catálogo Botiquines + Catálogo Elementos
- Inspecciones Extintor + Detalle + Responsables + Catálogo Extintores
- Inspecciones Camilla + Detalle + Responsables + Catálogo Camillas + Catálogo Elementos
- Inspecciones Kit Derrames + Detalle + Verificaciones + Responsables + Catálogo Kits + Catálogo Elementos

**Capacitaciones:**
- Capacitaciones (catálogo de temas)
- Programación Capacitaciones (plan mensual)
- Eventos Capacitación (sesiones reales)
- Asistencia Capacitaciones (detalle asistentes)

**Evaluaciones:**
- Banco de Preguntas
- Plantillas Evaluación
- Preguntas por Plantilla
- Evaluaciones Aplicadas
- Respuestas Evaluación

**Comités SST:**
- Miembros Comités SST

**Incidentes y Accidentes de Trabajo:**
- at_eventos (accidentes e incidentes)
- at_investigaciones (Res. 1401/2007)
- at_acciones (preventivas y correctivas)
- at_reportes (casi accidentes, actos y condiciones inseguras)

**Políticas Empresariales:**
- Políticas (catálogo de políticas)
- Firmas Políticas (registro de aceptación)
- Tokens Firma Política (para links públicos)

## Módulos del Sistema

### Módulos Core (Completados)

| Módulo | API | Dashboard | Estado |
|---|---|---|---|
| **Capacitaciones** | `/api/capacitaciones` | `registros-asistencia` | ✅ |
| **Registros Asistencia** | `/api/registros-asistencia` | `registros-asistencia` | ✅ |
| **Evaluaciones** | `/api/evaluaciones` | `evaluaciones` | ✅ |
| **Entregas EPP** | `/api/entregas-epp` | `inventario-epp/entrega` | ✅ |
| **Actas de entrega (EPP y Dotación)** | `/api/entregas-epp/exportar` (Excel) y `exportar-pdf` | `inventario-epp/entregas` | ✅ |
| **Inventario EPP** | `/api/insumos` | `inventario-epp` | ✅ |
| **Plan Anual** | `/api/programacion-capacitaciones` | `plan-anual` | ✅ |
| **Políticas Empresariales** | `/api/politicas` | `politicas` | ✅ |

**Actas de entrega — formato impreso (Sep 2026).** El Excel (`exportar`) y el
PDF (`exportar-pdf`) comparten diseño: A4 vertical, **un acta por trabajador
por página**, paleta sobria (azul pizarra `#1F3D5C`, franja `#DCE6EE`, bandas
`#F5F8FA`, evidencias `#4A7A96`, cierre `#7C9A72`), logo centrado en su celda,
firma descifrada dentro de la tabla y hasta 3 evidencias fotográficas.

- El filtro EPP/Dotación se hace por la **categoría del insumo**, no por el
  texto del motivo
- La galería de fotos toma el alto que quede libre en la hoja: así el acta
  nunca se parte en dos páginas. En el Excel eso se calcula contra el alto
  útil de A4 dividido por la escala real de impresión (~0,96, medida
  imprimiendo con Excel)
- ExcelJS calcula la fracción de columna con una unidad propia que no son
  píxeles: las imágenes se anclan con `nativeColOff`/`nativeRowOff` en EMU
- Los saltos de página van en la última fila de cada acta (`row.addPageBreak()`)
- `npm run probar:excel-entregas` verifica saltos, área de impresión y que
  ninguna acta se desborde

### Módulos de Inspecciones (Completados)

| Módulo | API | Dashboard | Estado | Detalles |
|---|---|---|---|---|
| **Inspecciones EPP** | `/api/inspecciones-epp` | `inventario-epp/inspeccion` | ✅ | 9 criterios EPP + firma + exportar |
| **Inspecciones Equipos** | `/api/inspecciones-equipos` | `inspecciones-equipos` | ✅ | Equipos emergencia genérico |
| **Inspecciones Áreas** | `/api/inspecciones-areas` | `inspecciones-areas` | ✅ | Categorías + criterios + acciones correctivas |

### Módulos de Inspecciones Específicas (Mar 2026 · API completada Ago 2026)

Los cuatro tipos comparten la librería `src/lib/inspecciones-emergencia/`:
`config.ts` mapea cada tipo a sus tablas y field IDs, `repository.ts` opera
sobre cualquiera de ellos, y `handlers.ts` expone un solo par GET/POST. Por eso
cada `route.ts` es un reenvío de dos líneas.

| Módulo | API | Dashboard | Estado | Características |
|---|---|---|---|---|
| **Inspecciones Botiquín** | `/api/inspecciones-botiquin` | `inspecciones-emergencia/botiquin` | ✅ | Catálogo elementos + vencimientos |
| **Inspecciones Extintor** | `/api/inspecciones-extintor` | `inspecciones-emergencia/extintor` | ✅ | 10 criterios de verificación |
| **Inspecciones Camilla** | `/api/inspecciones-camilla` | `inspecciones-emergencia/camilla` | ✅ | Elementos + estado |
| **Inspecciones Kit Derrames** | `/api/inspecciones-kit-derrames` | `inspecciones-emergencia/kit-derrames` | ✅ | Elementos + verificaciones de procedimiento |

**UI compartida (Ago 2026).** Igual que la API, una sola pantalla sirve a los
cuatro tipos: `src/app/dashboard/inspecciones-emergencia/_components/config.ts`
declara por tipo el rótulo del equipo, la forma del detalle (elementos vs.
criterios) y las etiquetas en español de los 10 criterios del extintor. Ese
archivo **no** importa `airtableSGSST.ts` — esa config lee los tokens de
Airtable desde `process.env` y no puede viajar al cliente.

El hub `/dashboard/inspecciones` tiene **una sola** tarjeta de equipos de
emergencia, que lleva a `/dashboard/inspecciones-emergencia`. Desde ahí se
llega tanto al formato general (`inspecciones-equipos`) como a los cuatro
específicos — antes había dos tarjetas para lo mismo.

- `/dashboard/inspecciones-emergencia` — hub: general + los cuatro tipos
- `/dashboard/inspecciones-emergencia/[tipo]` — captura
- `/dashboard/inspecciones-emergencia/[tipo]/historial` — periodo + PDF

Una inspección puede cubrir varios equipos: el formulario agrega bloques y no
deja repetir el mismo equipo. En la forma «elementos», los que se dejan sin
estado no se envían.

> **Tabla `Detalle Inspección Kit Derrames` recreada (2026-08-21).** La original
> (`tblzG1PUJxLluLgKZ`) había sido eliminada de la base, lo que degradó a
> `singleLineText` los campos de enlace en `Inspecciones Kit Derrames`,
> `Kits Control Derrames` y `Catálogo Elementos Kit Derrames`. La nueva es
> `tblQfHiCjQYjKvA5e` y Airtable regeneró sus enlaces inversos. Los tres campos
> de texto degradados siguen ahí, vacíos y sin uso: se pueden borrar a mano.
**Contrato de la API** (igual para los cuatro):
- `GET ?catalogo=equipos` → catálogo de botiquines/extintores/camillas/kits
- `GET ?catalogo=elementos` → catálogo de elementos (vacío en extintor)
- `GET ?desde&hasta&estado` → inspecciones del periodo
- `POST` → cabecera + detalles + responsables (+ verificaciones en kit)
- Todos exigen sesión y responden `{ success, data }`

### Módulo de Seguimiento Vehicular (Nuevo - Jun 2026)

| Módulo | API | Dashboard | Estado | Características |
|---|---|---|---|---|
| **Seguimiento Vehicular** | `/api/sgsst/vehicular` | `sgsst/vehicular` | 🚧 | Vehículos, SOAT, tecnomecánica, licencias + alertas automáticas |

**Endpoints implementados:**
- `GET /api/sgsst/vehicular` — Listar vehículos con estado consolidado
- `GET /api/sgsst/vehicular/:id_personal` — Vehículos por colaborador
- `POST /api/sgsst/vehicular/vehiculos` — Registrar vehículo
- `PUT/DELETE /api/sgsst/vehicular/vehiculos/:id` — Actualizar/desactivar vehículo
- `POST/PUT /api/sgsst/vehicular/documentos` — Gestión SOAT y tecnomecánica
- `GET /api/sgsst/vehicular/documentos/vencimientos` — Documentos por vencer
- `POST/PUT /api/sgsst/vehicular/licencias` — Gestión de licencias de conducción
- `GET /api/sgsst/vehicular/licencias/vencimientos` — Licencias por vencer
- `POST /api/sgsst/vehicular/alertas/trigger` — Cron job de alertas vía SendGrid
- `GET /api/sgsst/vehicular/alertas` — Historial de alertas enviadas

**Tablas Airtable:**
- `veh_vehiculos` — Vehículos de colaboradores (12 campos)
- `veh_documentos` — SOAT y tecnomecánica (10 campos)
- `veh_licencias` — Licencias de conducción (10 campos)
- `veh_alertas_log` — Historial de alertas (7 campos)

**Características clave:**
- Validación de placas colombianas (ABC123 para autos, ABC12D para motos)
- Cálculo automático de estado: Vigente/Por vencer/Vencido
- Sistema de alertas anti-spam (no enviar en últimas 24h)
- Integración con SendGrid para correos HTML responsivos
- Lookup a Nómina Core para resolver colaboradores
- Categorías de licencia colombianas: A1, A2, B1, B2, B3, C1, C2, C3

### Módulo de Incidentes y Accidentes de Trabajo (Nuevo - Ago 2026)

| Módulo | API | Dashboard | Estado | Características |
|---|---|---|---|---|
| **Incidentes y Accidentes** | `/api/accidentes` | `accidentes` | ✅ | Eventos, investigación (Res. 1401/2007), acciones y reportes preventivos |

**Endpoints implementados:**
- `GET/POST /api/accidentes/eventos` — Listar y registrar accidentes e incidentes
- `GET/PUT/DELETE /api/accidentes/eventos/:recordId` — Detalle con investigación y acciones
- `GET/POST /api/accidentes/investigaciones` — Investigación del evento (una por evento)
- `PUT/DELETE /api/accidentes/investigaciones/:recordId`
- `GET/POST /api/accidentes/acciones` — Acciones preventivas y correctivas
- `PUT/DELETE /api/accidentes/acciones/:recordId`
- `GET/POST /api/accidentes/reportes` — Casi accidentes, actos y condiciones inseguras
- `PUT/DELETE /api/accidentes/reportes/:recordId`
- `GET /api/accidentes/indicadores` — Estadísticas legales del periodo + filas del informe mensual

**Tablas Airtable:**
- `at_eventos` — Accidentes e incidentes con trabajador involucrado (31 campos)
- `at_investigaciones` — Investigación con causas inmediatas y básicas (18 campos)
- `at_acciones` — Acciones preventivas/correctivas con jerarquía de control (16 campos)
- `at_reportes` — Reportes preventivos (17 campos)

**Características clave:**
- Consecutivos automáticos: `AT-2026-001`, `INV-2026-001`, `ACC-2026-001`, `REP-2026-001`
- Cubre 9 de los 18 indicadores legales del informe mensual de gestión SST
- `typecast` desactivado en escrituras para que Airtable rechace valores fuera del catálogo
- Un accidente mortal se marca automáticamente como grave
- Ver `docs/modulos/accidentes/README.md`

### Módulo de Medicina Laboral (Nuevo - Ago 2026)

| Módulo | API | Dashboard | Estado | Características |
|---|---|---|---|---|
| **Medicina Laboral** | `/api/medicina-laboral` | `medicina-laboral` | ✅ | Exámenes ocupacionales, seguimientos, incapacidades, reubicaciones y enfermedades laborales |

**Endpoints implementados** (todos con `GET`/`POST` en la raíz y `GET`/`PUT`/`DELETE` en `/:recordId`):
- `/api/medicina-laboral/examenes` — Exámenes de ingreso, periódicos, egreso y reintegro
- `/api/medicina-laboral/seguimientos` — Seguimientos y controles médicos
- `/api/medicina-laboral/incapacidades` — Incapacidades, prórrogas y licencias
- `/api/medicina-laboral/reubicaciones` — Reubicaciones temporales y definitivas
- `/api/medicina-laboral/enfermedades-laborales` — Calificación de origen y PCL
- `GET /api/medicina-laboral/indicadores` — Los 9 indicadores restantes del informe mensual

**Tablas Airtable** (base SG-SST, 95 field IDs):
- `med_examenes` — Exámenes ocupacionales (18 campos)
- `med_seguimientos` — Seguimientos médicos (16 campos)
- `med_incapacidades` — Incapacidades y licencias (19 campos, con autovínculo de prórroga)
- `med_reubicaciones` — Reubicaciones laborales (19 campos)
- `med_enfermedades_laborales` — Enfermedades laborales (18 campos)

**Características clave:**
- Consecutivos automáticos: `EXM-2026-001`, `SEG-2026-001`, `INC-2026-001`, `REU-2026-001`, `EL-2026-001`
- Completa los 9 indicadores del informe mensual que faltaban tras el módulo de accidentes
- `typecast` desactivado en escrituras para que Airtable rechace valores fuera del catálogo
- Días de incapacidad calculados por rango de fechas (ambos extremos incluidos)
- Prórrogas vinculadas a la incapacidad de origen (`Incapacidad_Origen_Link`)
- UI: hub con KPIs del periodo + 5 páginas CRUD que comparten primitivas en
  `src/app/dashboard/medicina-laboral/_components/ui.tsx`
- Ver `docs/modulos/medicina-laboral/README.md`

### Informe Mensual de Gestión SST (Nuevo - Ago 2026)

| Módulo | API | Dashboard | Estado | Características |
|---|---|---|---|---|
| **Informe Mensual** | `/api/informes/mensual` | `informes` | ✅ | 18 indicadores legales + 6 secciones, en JSON y PDF |

**Endpoints:**
- `GET /api/informes/mensual?mes=&anio=` — el informe en JSON
- `GET /api/informes/mensual/pdf?mes=&anio=` — el mismo informe en PDF

Sin `mes`/`anio` usan el mes en curso (America/Bogota). El periodo es siempre
un mes calendario.

**Regla del módulo: aquí no se calcula ningún indicador que un módulo ya
calcule.** Los 18 indicadores legales vienen de `calcularIndicadores`
(accidentes) y `calcularIndicadoresMedicinaLaboral` (medicina laboral). Lo
único propio es el consolidado de las siete inspecciones y el conteo de
actividades de promoción y prevención.

```
src/lib/informes/
├── airtable.ts      Lectura paginada + filtro por periodo
├── inspecciones.ts  Consolida los 7 tipos de inspección
├── actividades.ts   Capacitaciones, inducciones, inspecciones y comités
├── consolidar.ts    Arma el informe completo
├── pdf.ts           Genera el documento
├── handlers.ts      Sesión y lectura del periodo
└── types.ts

src/lib/pdf/corporativo.ts   Encabezado y pie Sirius (compartido)
```

**Características clave:**
- Una consulta rota no tumba el informe: cada lectura de inspecciones y
  actividades pasa por `traerOpcional` y el fallo se reporta en
  `seccionesIncompletas` (amarillo en la UI, recuadro rojo en el PDF).
  Accidentes y medicina laboral sí son obligatorios
- Las inspecciones se consultan una sola vez y se reusan en las actividades:
  el informe hace ~25 lecturas a Airtable y consolida en ~1.4 s
- `textoSeguroPdf` transcribe la puntuación tipográfica y descarta emojis:
  las fuentes estándar de jsPDF no los dibujan
- PDF comprimido — sin `compress: true` pesaba 2.3 MB por el logo; ahora 51 KB
- `npm run probar:informe [mes] [anio]` lo ejecuta contra Airtable real
- Ver `docs/modulos/informes/README.md`

### Módulos en Desarrollo

| Módulo | API | Dashboard | Estado |
|---|---|---|---|
| **PVE Osteomuscular** | — | `pve` | 🔧 |
| **Gestión de Riesgos** | — | — | 📋 Planificado |
| **Documentación SST** | — | — | 📋 Planificado |

**Leyenda:**
- ✅ Completado y funcional
- 🚧 API implementada, UI en desarrollo
- 🔧 En construcción
- 📋 Planificado

## Patrones Clave del Código

### Clean Architecture — Composition Root
```typescript
// src/infrastructure/container.ts
// Único punto donde infrastructure conoce a core
export const verifyUser = createVerifyUser({ personRepository, logger });
export const authenticateUser = createAuthenticateUser({ personRepository, passwordHasher, logger });
```

### Airtable Config con Field IDs
```typescript
// src/infrastructure/config/airtable.ts
// Fields referenciados por ID (no por nombre) → inmune a renombramientos
const PF = airtableConfig.personalFields;
const filterFormula = `{${PF.NUMERO_DOCUMENTO}} = '${value}'`;
```

### Token de Firma (HMAC-SHA256)
```typescript
// src/lib/signingToken.ts
const token = generateSigningToken(payload, secret, hoursValid);
const result = verifySigningToken(token, secret); // null si inválido
```

### S3 Upload
```typescript
// src/infrastructure/config/awsS3.ts
const { url, key } = await uploadToS3(s3Key, buffer, "application/pdf");
const signedUrl = await getSignedUrlForKey(key, 3600);
```

## Comandos

```bash
npm run dev                      # Desarrollo
npm run build                    # Build producción
npm run lint                     # ESLint
npm run check:env                # Verifica variables de entorno (empresa + Airtable)
npm run test:validacion-empresa  # Prueba validación de variables de empresa en runtime
npm run audit:airtable           # Contrasta el código contra el esquema REAL de Airtable
npm run ver:tabla <q>            # Muestra los campos de una tabla (busca por nombre o ID)
npm run probar:informe           # Genera el informe mensual contra Airtable real
npm run probar:excel-entregas [tipo] [YYYY-MM]  # Excel de entregas + chequeo de paginación
npm run probar:pdf-entregas   [tipo] [YYYY-MM]  # PDF de entregas (una hoja por trabajador)
npm run gen:env-example          # Regenera .env.example desde .env.local

# Gestión de eventos y evaluaciones
npm run eventos:listar             # Lista los últimos 20 eventos con información detallada
npm run eventos:buscar <fecha>     # Busca eventos por fecha (formato: 2026-08-26)
npm run evaluacion:habilitar <recordId> [nombre]  # Habilita evaluación en un evento existente

# Type-check. Se filtra .next/ por el bug de routes.d.ts en Next.js 16.2.4
npx tsc --noEmit | grep -v "^\.next/"
```

**Antes de tocar un módulo, corre `npm run check:env`.** Un field ID ausente se
convierte en la cadena `"undefined"` al usarse como clave, y Airtable rechaza el
request completo con un error que no dice qué campo fue.

`check:env` solo verifica que las variables estén *definidas*.
**`audit:airtable` va más allá:** consulta la Metadata API y comprueba que cada
tabla y cada field ID exista de verdad en la base. Úsalo cuando sospeches que
un ID apunta a algo que ya no está. Vuelca el esquema en
`scripts/esquema-sgsst.json` para consultarlo después con `ver:tabla` sin
volver a llamar la API.

## Variables de Entorno Requeridas

Ver archivo `.env.example` para la lista completa. Resumen de variables principales:

### Datos de la Empresa (corporativo.ts) — OBLIGATORIAS
```bash
EMPRESA_NOMBRE               # Nombre corto (aparece en logo de respaldo PDF)
EMPRESA_RAZON_SOCIAL         # Razón social completa
EMPRESA_NIT                  # NIT con dígito de verificación
EMPRESA_TELEFONO             # Teléfono de contacto
EMPRESA_CORREO               # Correo electrónico corporativo
EMPRESA_DIRECCION            # Dirección física de la sede principal
```

**CRÍTICO:** Estas variables son **OBLIGATORIAS** para la generación de documentos PDF corporativos (informes mensuales, actas futuras, etc.). Si faltan, las funciones de PDF lanzarán error. Valida con `npm run check:env`. Ver documentación completa en `docs/configuracion/VARIABLES_EMPRESA.md`.

### Base Personal (airtable.ts)
```bash
AIRTABLE_API_TOKEN           # Token de acceso a Airtable
AIRTABLE_BASE_ID             # ID de la base Personal
AIRTABLE_PERSONAL_TABLE_ID   # ID tabla Personal
AIRTABLE_SISTEMAS_TABLE_ID   # ID tabla Sistemas
AIRTABLE_ROLES_TABLE_ID      # ID tabla Roles (si existe)
AIRTABLE_PF_*                # Field IDs de Personal (15+ variables)
```

### Base Insumos SST (airtableInsumos.ts)
```bash
AIRTABLE_INSUMOS_API_TOKEN   # Token para base Insumos
AIRTABLE_INSUMOS_BASE_ID     # ID de la base Insumos
AIRTABLE_INSUMO_TABLE_ID     # ID tabla Insumo
AIRTABLE_MOV_INSUMO_TABLE_ID # ID tabla Movimientos
AIRTABLE_STOCK_INSUMO_TABLE_ID # ID tabla Stock
# Field IDs: AIRTABLE_INS_*, AIRTABLE_MOV_*, AIRTABLE_STOCK_*
```

### Base SG-SST (airtableSGSST.ts)
```bash
AIRTABLE_SGSST_API_TOKEN     # Token para base SG-SST
AIRTABLE_SGSST_BASE_ID       # ID de la base SG-SST

# Table IDs (50+ tablas)
AIRTABLE_ENTREGAS_TABLE_ID   # Entregas EPP
AIRTABLE_INSP_TABLE_ID       # Inspecciones EPP
AIRTABLE_EQUIP_TABLE_ID      # Equipos Emergencia
AIRTABLE_INSPA_TABLE_ID      # Inspecciones Áreas
AIRTABLE_INSPBOT_TABLE_ID    # Inspecciones Botiquín
AIRTABLE_INSPEXT_TABLE_ID    # Inspecciones Extintor
AIRTABLE_INSPCAM_TABLE_ID    # Inspecciones Camilla
AIRTABLE_INSPKIT_TABLE_ID    # Inspecciones Kit Derrames
AIRTABLE_CAP_TABLE_ID        # Capacitaciones
AIRTABLE_PROG_TABLE_ID       # Programación Capacitaciones
AIRTABLE_EVT_TABLE_ID        # Eventos Capacitación
AIRTABLE_ASIS_TABLE_ID       # Asistencia
AIRTABLE_PRG_BANCO_TABLE_ID  # Banco Preguntas
AIRTABLE_PLNT_TABLE_ID       # Plantillas Evaluación
# + 35+ table IDs más (ver airtableSGSST.ts)

# Field IDs (300+ variables)
# Formato: AIRTABLE_[TABLA_ABREV]_[NOMBRE_CAMPO]
# Ejemplo: AIRTABLE_ENT_ID_ENTREGA, AIRTABLE_DETINSPA_CATEGORIA
# Ver airtableSGSST.ts líneas 1-653 para lista completa
```

### AWS S3
```bash
AWS_ACCESS_KEY_ID            # Clave de acceso AWS
AWS_SECRET_ACCESS_KEY        # Clave secreta AWS
AWS_REGION                   # Región (ej: us-east-1)
AWS_S3_BUCKET_NAME           # Nombre del bucket S3
```

### Autenticación y Seguridad
```bash
JWT_SECRET                   # Secreto para tokens JWT
# Opcional: NEXT_PUBLIC_* para variables del cliente
```

**IMPORTANTE:** Todas las variables de Field IDs deben estar definidas. El archivo `airtableSGSST.ts` tiene más de 300 field IDs configurados. Usar `.env.example` como plantilla.

## Estado del Proyecto (Actualizado 2026-08-25)

### Completitud General: 75%

**Funcional y en Producción:**
- Sistema de autenticación (3 pasos)
- Gestión de capacitaciones y asistencia
- Sistema de evaluaciones con banco de preguntas
- Entregas EPP con firma digital
- Inventario EPP completo
- Inspecciones EPP
- Inspecciones de áreas físicas (recientemente corregido)
- Inspecciones de equipos de emergencia
- Inspecciones de botiquines, extintores, camillas y kits de derrames
- Informe mensual de gestión SST (18 indicadores, JSON y PDF)
- Plan anual de capacitaciones
- Exportación a Excel y PDF

**En Desarrollo Activo:**
- Fase Verificar: indicadores, auditoría interna y revisión por la alta dirección

**Planificado:**
- Matriz de peligros (GTC 45) — estándar 4.1.1
- Plan de emergencias — estándares 5.1.1 y 5.1.2
- Indicadores SG-SST, auditoría interna y revisión por la alta dirección
  (fase Verificar, hoy vacía)
- Acciones correctivas, gestión documental y mejora continua
  (fase Actuar, hoy vacía)
- PVE Osteomuscular — hoy es una página informativa, no persiste nada

### Deuda Técnica Conocida

**Prioridad ALTA:**
1. Optimización de queries en exportación Excel (inspecciones-areas)
   - Actualmente carga todas las tablas sin filtros
   - Puede causar timeouts en bases grandes
   - Ver: `DIAGNOSTICO_INSPECCIONES_AREAS.md`

2. ~~Validación de Field IDs faltante~~ — **resuelto (Ago 2026)**
   - `src/infrastructure/config/validateConfig.ts` recorre las tres configs
   - `npm run check:env` reporta variables ausentes y placeholders sin
     reemplazar; sale con código 1 si algo falta
   - `npm run gen:env-example` regenera `.env.example` desde `.env.local`
     enmascarando los valores
   - `npm run audit:airtable` contrasta además contra el esquema real
   - **Estado: 0 problemas.** La auditoría del 2026-08-21 encontró 31 y todos
     se corrigieron (ver "Mejoras Recientes").

3. Logging insuficiente
   - Errores de queries secundarias se ignoran silenciosamente
   - Dificulta debugging en producción

**Prioridad MEDIA:**
4. Falta ordenamiento explícito en queries Airtable
   - Los resultados no tienen orden predecible
   - Puede confundir a usuarios

5. Tests automatizados
   - No hay suite de tests
   - Todas las pruebas son manuales

6. Documentación de API endpoints
   - No hay documentación formal de endpoints
   - Solo código fuente como referencia

7. `typescript.ignoreBuildErrors: true` en `next.config.ts`
   - Workaround del bug de Next.js 16.2.4 al generar `.next/dev/types/routes.d.ts`
     (el archivo sale malformado cuando hay muchos endpoints)
   - **Revertir cuando se actualice Next.js**, o los errores de tipos reales
     pasarán silenciosos en el build
   - Mientras tanto, verificar a mano:
     `npx tsc --noEmit | grep -v "^\.next/"`

8. Sin rate limiting ni `middleware.ts`
   - Los endpoints públicos de firma (`/api/*/firmar-publico`, `/firmar/*`)
     no tienen throttling

**Prioridad BAJA:**
9. ~~UI de inspecciones específicas~~ — **resuelto (Ago 2026)**
   - `/dashboard/inspecciones-emergencia` cubre los 4 tipos y el hub
     `/dashboard/inspecciones` ya enlaza a la sección
   - Falta el flujo de firma: las inspecciones se crean como `Completada`
     o `Borrador`; el estado `Firmada` existe en el catálogo pero ninguna
     pantalla lo produce

10. Migraciones de datos
    - Existe `/api/equipos-emergencia/migrar` pero no documentado
    - Proceso manual, no automatizado

### Mejoras Recientes

**Agosto 2026**
- ✅ Módulo de Medicina Laboral (5 tablas, 21 endpoints, hub + 5 páginas CRUD)
- ✅ Librería compartida `src/lib/inspecciones-emergencia/` y los 3 `route.ts`
  que faltaban (extintor, camilla, kit de derrames)
- ✅ Botiquín migrado a la librería compartida — ahora exige sesión
- ✅ **Informe mensual de gestión SST**: consolida accidentes, medicina
  laboral, inspecciones y actividades de P&P; los 18 indicadores legales en
  una sola tabla, en JSON y en PDF con el formato corporativo
- ✅ `src/lib/pdf/corporativo.ts`: encabezado y pie Sirius compartidos
  (`actaPdf.ts` y `perfilPdf.ts` conservan su copia; no se tocaron)
- ✅ **UI de los 4 tipos** en `/dashboard/inspecciones-emergencia`: hub, captura
  e historial con descarga de PDF, todo desde una sola pantalla parametrizada
  por tipo. Cierra el último pendiente de estos módulos
- ✅ `validateConfig()` + `npm run check:env` + `npm run gen:env-example`
- ✅ `.env.example` versionado (1015 variables, sin secretos)
- ✅ **Auditoría de la base contra el código** (`npm run audit:airtable`):
  31 desajustes encontrados y corregidos → 0
  - Tabla `Detalle Inspección Kit Derrames` recreada (había sido eliminada)
  - `Created_At`/`Updated_At` creados en `copasst_actas` y `cocolab_actas`:
    el repositorio los escribía desde siempre, pero las variables no existían
    y `cleanFields` los descartaba en silencio — los timestamps nunca se
    guardaron
  - `Kits Control Derrames` e `Info Importante Extintor` mapeados: las tablas
    existían en la base pero el código no las referenciaba
  - Nombres de variable alineados (`_UBICACION_LINK`, `_ALMACENAMIENTO`,
    `_ROTULADO`) y corregido un typo de un carácter en `AIRTABLE_PROG_OBSERVACIONES`
  - Retiradas 5 declaraciones muertas de la config: campos que no existían en
    Airtable y que ningún endpoint leía (`detalleFields.VIDA_UTIL`,
    `detalleFields.FECHA_VENCIMIENTO`, `politicasFields.ID`, y el `ESTADO`
    de `veh_documentos` y `veh_licencias`)

**Marzo 2026**
- ✅ Corrección crítica en queries FIND() de inspecciones-areas
- ✅ Endpoint de migración de equipos
- ✅ Mejoras en sistema de evaluaciones (validación de respuestas)

### Documentación del Proyecto

**IMPORTANTE:** Toda la documentación técnica está organizada en la carpeta `docs/` con la siguiente estructura:

```
docs/
├── README.md              # Índice completo de documentación
├── modulos/               # Documentación por módulo
│   ├── vehicular/         # Seguimiento vehicular
│   ├── politicas/         # Políticas empresariales
│   ├── sociodemografico/  # Perfiles sociodemográficos
│   ├── inducciones/       # Inducciones y certificados
│   └── evaluaciones/      # Sistema de evaluaciones
├── fixes/                 # Diagnósticos y correcciones
├── implementacion/        # Guías de implementación
├── analisis/              # Análisis técnicos
├── estado/                # Estado del proyecto
├── guias/                 # Guías paso a paso
├── pruebas/               # Planes de prueba
└── seguridad/             # Auditorías de seguridad
```

**Archivos de referencia en raíz:**
- `CLAUDE.md` - Este archivo (documentación principal)
- `README.md` - Documentación del proyecto
- `INFORME_ORGANIZACION_PROYECTO.md` - Organización y limpieza del proyecto
- `RESUMEN_ORGANIZACION.md` - Resumen ejecutivo de organización

**Ver índice completo:** `docs/README.md`

## Reglas para Agentes de Desarrollo

1. **No romper lo existente** — siempre verificar con `npm run build` después de cambios
2. **Clean Architecture** — respetar la separación core → infrastructure → presentation
3. **No separar el monorepo** — todo vive bajo `src/` con App Router
4. **Seguridad primero** — validar inputs, respetar acceso por rol
5. **Español colombiano** — en UI, comentarios y documentación
6. **Minimal changes** — no refactorizar código que funciona sin pedido explícito
7. **Field IDs** — usar variables de entorno para IDs de campos Airtable, nunca nombres hardcodeados
8. **Container.ts** — toda inyección de dependencias pasa por el Composition Root
9. **FIND() en Airtable** — siempre usar `FIND(...) > 0` para comparación booleana explícita
10. **Logging** — loggear errores de queries secundarias para debugging
11. **Optimización** — filtrar en Airtable, no cargar todo y filtrar en memoria
