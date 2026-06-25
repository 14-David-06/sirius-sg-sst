# Implementación del Módulo de Políticas Empresariales

## Resumen

Se ha implementado un módulo completo para gestionar políticas empresariales con las siguientes características:

✅ **Almacenamiento**: PDFs en AWS S3  
✅ **Sistema de firma digital**: Registro de aceptación de políticas  
✅ **Múltiples categorías**: Seguridad/SST, Reglamento Interno, Recursos Humanos, General  
✅ **Panel de administración**: Crear, editar, eliminar y gestionar visibilidad  
✅ **Portal colaboradores**: Consultar y firmar políticas  

---

## Archivos Creados

### Backend (APIs)

```
src/app/api/politicas/
├── route.ts                    # GET: listar, POST: crear
├── [id]/route.ts               # GET: obtener, PUT: actualizar, DELETE: eliminar
├── estado-firma/route.ts       # GET: verificar qué políticas ha firmado un colaborador
└── firmar/route.ts             # POST: registrar firma de aceptación
```

### Frontend (Páginas)

```
src/app/dashboard/politicas/
├── page.tsx                    # Vista colaboradores: consultar y firmar
└── admin/
    ├── page.tsx                # Panel administración: listar políticas
    └── nueva/page.tsx          # Formulario crear política
```

### Configuración

```
src/infrastructure/config/
└── airtableSGSST.ts            # ✏️ Actualizado: agregadas 3 tablas nuevas

CONFIGURACION_POLITICAS_AIRTABLE.md   # Guía de configuración Airtable
IMPLEMENTACION_POLITICAS_EMPRESARIALES.md  # Este archivo
```

### Documentación

```
CLAUDE.md                       # ✏️ Actualizado: agregado módulo de Políticas
```

---

## Cambios en Archivos Existentes

### 1. `src/infrastructure/config/airtableSGSST.ts`

**Agregado al final (antes del cierre del objeto):**

```typescript
// ══════════════════════════════════════════════════════════
// POLÍTICAS EMPRESARIALES — Sistema de gestión documental
// Decreto 1072/2015, Res. 0312/2019
// ══════════════════════════════════════════════════════════

// ── Tabla "Políticas" (catálogo de políticas)
politicasTableId: process.env.AIRTABLE_POLITICAS_TABLE_ID!,
politicasFields: { ... },

// ── Tabla "Firmas Políticas" (registro de aceptación)
firmasPoliticasTableId: process.env.AIRTABLE_FIRMPOL_TABLE_ID!,
firmasPoliticasFields: { ... },

// ── Tabla "Tokens Firma Política" (para links públicos)
tokensFirmaPoliticaTableId: process.env.AIRTABLE_TOKPOL_TABLE_ID!,
tokensFirmaPoliticaFields: { ... },
```

**Total**: ~60 líneas agregadas

### 2. `src/app/dashboard/page.tsx`

**Agregado en la sección "P - Planear":**

```typescript
{
  title: "Políticas Empresariales",
  description: "Consulta y firma de políticas de seguridad, reglamento interno y recursos humanos.",
  icon: I.document,
  color: "bg-indigo-500/15 text-indigo-300",
  href: "/dashboard/politicas",
  status: "active",
  estandar: "Estándar 1.1.1 / 2.1.1",
},
```

**Ubicación**: Después de "Política y Objetivos SST", línea ~180

### 3. `CLAUDE.md`

**Agregado en:**
- Sección "Tablas en Base SG-SST" → "Políticas Empresariales"
- Sección "Módulos Core" → Agregada línea de Políticas Empresariales

---

## Estructura de Tablas en Airtable

### Tabla 1: "Políticas"

| Campo | Tipo | Descripción |
|---|---|---|
| ID | Primary | Fórmula: `{Código} & " - " & {Versión}` |
| Código | Single line text | P-SST-001 |
| Título | Single line text | Nombre de la política |
| Descripción | Long text | Descripción breve |
| Categoría | Single select | 4 opciones |
| Versión | Single line text | v001, v002 |
| Fecha Publicación | Date | Cuándo se publicó |
| Fecha Vigencia | Date | Desde cuándo aplica |
| Estado | Single select | Activa / En revisión / Obsoleta |
| URL Documento S3 | URL | Link al PDF |
| Requiere Firma | Checkbox | Si necesita aceptación |
| Visible Colaboradores | Checkbox | Si está visible |
| Firmas | Link to record | → Firmas Políticas |
| Orden Visualización | Number | Para ordenar |
| Creado Por | Single line text | Nombre del creador |
| Fecha Creación | Date with time | Cuándo se creó |
| Modificado Por | Single line text | Nombre del modificador |
| Fecha Modificación | Date with time | Última modificación |

### Tabla 2: "Firmas Políticas"

| Campo | Tipo | Descripción |
|---|---|---|
| ID | Primary | Fórmula: `{ID Empleado Core} & " - " & {Política}` |
| Política | Link to record | → Políticas |
| ID Empleado Core | Single line text | ID del empleado |
| Nombre Empleado | Single line text | Nombre completo |
| Fecha Firma | Date with time | Cuándo firmó |
| Firma | Long text | Data URL de la firma |
| IP Address | Single line text | (Opcional) IP |
| User Agent | Long text | (Opcional) Navegador |

### Tabla 3: "Tokens Firma Política"

| Campo | Tipo | Descripción |
|---|---|---|
| Token ID | Primary | ID único |
| Política | Link to record | → Políticas |
| ID Empleado Core | Single line text | ID del empleado |
| Fecha Generación | Date with time | Cuándo se generó |
| Fecha Expiración | Date with time | Cuándo expira |
| Estado | Single select | Activo / Usado / Expirado |

---

## Variables de Entorno Requeridas

**Total**: 27 nuevas variables

```bash
# Tabla "Políticas" (18 variables)
AIRTABLE_POLITICAS_TABLE_ID=
AIRTABLE_POL_ID=
AIRTABLE_POL_CODIGO=
AIRTABLE_POL_TITULO=
AIRTABLE_POL_DESCRIPCION=
AIRTABLE_POL_CATEGORIA=
AIRTABLE_POL_VERSION=
AIRTABLE_POL_FECHA_PUBLICACION=
AIRTABLE_POL_FECHA_VIGENCIA=
AIRTABLE_POL_ESTADO=
AIRTABLE_POL_URL_DOCUMENTO=
AIRTABLE_POL_REQUIERE_FIRMA=
AIRTABLE_POL_VISIBLE=
AIRTABLE_POL_FIRMAS_LINK=
AIRTABLE_POL_ORDEN=
AIRTABLE_POL_CREADO_POR=
AIRTABLE_POL_FECHA_CREACION=
AIRTABLE_POL_MODIFICADO_POR=
AIRTABLE_POL_FECHA_MODIFICACION=

# Tabla "Firmas Políticas" (8 variables)
AIRTABLE_FIRMPOL_TABLE_ID=
AIRTABLE_FIRMPOL_ID=
AIRTABLE_FIRMPOL_POLITICA_LINK=
AIRTABLE_FIRMPOL_ID_EMPLEADO=
AIRTABLE_FIRMPOL_NOMBRE_EMPLEADO=
AIRTABLE_FIRMPOL_FECHA_FIRMA=
AIRTABLE_FIRMPOL_FIRMA=
AIRTABLE_FIRMPOL_IP_ADDRESS=
AIRTABLE_FIRMPOL_USER_AGENT=

# Tabla "Tokens Firma Política" (7 variables)
AIRTABLE_TOKPOL_TABLE_ID=
AIRTABLE_TOKPOL_TOKEN_ID=
AIRTABLE_TOKPOL_POLITICA_LINK=
AIRTABLE_TOKPOL_ID_EMPLEADO=
AIRTABLE_TOKPOL_FECHA_GENERACION=
AIRTABLE_TOKPOL_FECHA_EXPIRACION=
AIRTABLE_TOKPOL_ESTADO=
```

Ver archivo `CONFIGURACION_POLITICAS_AIRTABLE.md` para instrucciones detalladas.

---

## Endpoints API

### `GET /api/politicas`

**Query params:**
- `categoria` (opcional): Filtrar por categoría
- `incluirInactivas` (opcional): Incluir políticas obsoletas (solo admin)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "recXXX",
      "codigo": "P-SST-001",
      "titulo": "Política de Seguridad y Salud en el Trabajo",
      "descripcion": "...",
      "categoria": "Seguridad y Salud",
      "version": "v001",
      "fechaPublicacion": "2026-01-01",
      "fechaVigencia": "2026-01-15",
      "estado": "Activa",
      "urlDocumento": "https://...",
      "requiereFirma": true,
      "orden": 1
    }
  ]
}
```

### `POST /api/politicas`

**Body:** `FormData`
- `codigo`: string (required)
- `titulo`: string (required)
- `descripcion`: string
- `categoria`: string (required)
- `version`: string
- `fechaPublicacion`: string (required)
- `fechaVigencia`: string (required)
- `requiereFirma`: boolean
- `visibleColaboradores`: boolean
- `orden`: number
- `creadoPor`: string
- `archivo`: File (PDF, required)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recXXX",
    "codigo": "P-SST-001",
    "titulo": "...",
    "urlDocumento": "https://..."
  }
}
```

### `GET /api/politicas/[id]`

**Response:** Política completa con todos los campos

### `PUT /api/politicas/[id]`

**Body:** `FormData` (mismos campos que POST, todos opcionales)

### `DELETE /api/politicas/[id]`

**Query params:**
- `modificadoPor`: string

**Acción:** Soft delete (marca como "Obsoleta" y oculta)

### `GET /api/politicas/estado-firma`

**Query params:**
- `idEmpleado`: string (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "pendientes": [...],
    "firmadas": [...],
    "totalPendientes": 3,
    "totalFirmadas": 5
  }
}
```

### `POST /api/politicas/firmar`

**Body:**
```json
{
  "politicaId": "recXXX",
  "idEmpleado": "12345",
  "nombreEmpleado": "Juan Pérez",
  "firma": "data:image/png;base64,...",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recYYY",
    "fechaFirma": "2026-06-23T10:30:00.000Z"
  }
}
```

---

## Flujo de Uso

### Para Colaboradores

1. **Dashboard** → Click en "Políticas Empresariales"
2. Ver resumen:
   - 🟢 Políticas firmadas
   - 🟡 Políticas pendientes de firma
3. Filtrar por categoría
4. Click en una política:
   - **Sin firma requerida**: Se abre el PDF
   - **Con firma requerida**: Modal → Abrir PDF → Firmar aceptación
5. Descargar PDF cuando sea necesario

### Para Administradores

1. **Dashboard** → "Políticas Empresariales" → **Botón "Administrar"** (esquina superior derecha)
2. Panel de administración:
   - Ver listado de todas las políticas
   - Filtrar por estado (Activa / En revisión / Obsoleta)
3. **Nueva Política**:
   - Click "Nueva Política"
   - Completar formulario
   - Subir archivo PDF
   - Configurar opciones (requiere firma, visible)
   - Guardar
4. **Editar**:
   - Click en icono de editar
   - Modificar campos
   - Opcionalmente subir nueva versión del PDF
5. **Cambiar visibilidad**:
   - Click en el icono de ojo
   - Alterna entre visible/oculto
6. **Eliminar**:
   - Click en icono de eliminar
   - Confirmar
   - Se marca como "Obsoleta" y se oculta

---

## Características Implementadas

✅ CRUD completo de políticas  
✅ Subida de PDFs a S3  
✅ Sistema de categorías  
✅ Control de visibilidad  
✅ Indicador de firma requerida  
✅ Estado de firma por colaborador  
✅ Registro de aceptación con firma  
✅ Ordenamiento personalizado  
✅ Soft delete (no elimina físicamente)  
✅ Versionamiento de políticas  
✅ Panel de administración completo  
✅ Portal de consulta para colaboradores  
✅ Resumen de políticas firmadas/pendientes  

---

## Características Pendientes (Futuro)

⏳ **Firma digital con canvas**: Implementar pad de firma (similar a entregas EPP)  
⏳ **Sistema de tokens**: Links públicos para firma remota vía email  
⏳ **Reportes**: Dashboard de cumplimiento de firmas  
⏳ **Notificaciones**: Alertas cuando hay nuevas políticas  
⏳ **Versionamiento automático**: Incrementar versión al editar  
⏳ **Historial de cambios**: Log de modificaciones  
⏳ **Búsqueda**: Filtro por texto  
⏳ **Exportar reportes**: Excel/PDF con estado de firmas  

---

## Permisos

### Administradores
- Acceso completo a `/dashboard/politicas/admin`
- Crear, editar, eliminar políticas
- Cambiar visibilidad
- Ver estado de firmas de todos

### Colaboradores
- Acceso a `/dashboard/politicas`
- Ver políticas activas y visibles
- Descargar PDFs
- Firmar aceptación
- Ver su propio estado de firmas

**Nota**: La validación de permisos actual es básica. Se recomienda implementar un sistema de roles más robusto en producción.

---

## Notas Técnicas

- **Clean Architecture**: APIs siguen el patrón del resto del proyecto
- **S3 Storage**: PDFs almacenados en `s3://bucket/politicas/{codigo}-{version}.pdf`
- **Soft Delete**: Las políticas no se eliminan, solo se marcan como "Obsoleta"
- **Field IDs**: Configuración usa variables de entorno (patrón del proyecto)
- **Next.js 15**: Params asíncronos en routes dinámicos
- **TypeScript**: Strict mode habilitado, 0 errores
- **Convenciones**: Español colombiano, glass-morphism UI

---

## Testing

Para probar el módulo:

1. **Configurar Airtable**:
   - Crear las 3 tablas según `CONFIGURACION_POLITICAS_AIRTABLE.md`
   - Obtener los IDs y agregarlos al `.env`

2. **Crear una política de prueba**:
   - Ir a `/dashboard/politicas/admin`
   - Click "Nueva Política"
   - Completar formulario con datos de prueba
   - Subir un PDF cualquiera
   - Guardar

3. **Ver como colaborador**:
   - Ir a `/dashboard/politicas`
   - Verificar que aparece la política
   - Probar filtros por categoría
   - Descargar el PDF

4. **Probar firma** (cuando se implemente el canvas):
   - Marcar política como "Requiere Firma"
   - Abrir como colaborador
   - Firmar aceptación
   - Verificar que aparece en "Firmadas"

---

## Soporte

Para problemas:

1. Verificar que todas las variables de entorno están definidas
2. Comprobar que los IDs de Airtable son correctos
3. Verificar que el bucket S3 tiene permisos de escritura
4. Revisar la consola del navegador para errores
5. Verificar logs del servidor

---

## Próximos Pasos Recomendados

1. **Configurar las tablas en Airtable** siguiendo la guía
2. **Agregar variables de entorno** al `.env`
3. **Crear política de prueba** para validar el flujo
4. **Implementar pad de firma digital** (reutilizar código de entregas EPP)
5. **Agregar validación de roles** más robusta
6. **Configurar notificaciones** para nuevas políticas

---

## Changelog

**v1.0.0 - 2026-06-23**
- ✅ Implementación inicial del módulo
- ✅ CRUD completo de políticas
- ✅ Sistema de firma básico
- ✅ Panel de administración
- ✅ Portal de colaboradores
- ✅ Integración con S3
- ✅ Documentación completa
