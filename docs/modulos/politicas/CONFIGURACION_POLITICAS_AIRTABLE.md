# Configuración de Tablas de Políticas Empresariales en Airtable

## Tablas Requeridas en Base SG-SST

### 1. Tabla "Políticas"

Almacena el catálogo de políticas empresariales.

**Campos requeridos:**

| Nombre del Campo | Tipo | Descripción |
|---|---|---|
| ID | Primary Field (Fórmula) | `{Código} & " - " & {Versión}` |
| Código | Single line text | Ej: P-SST-001 |
| Título | Single line text | Nombre de la política |
| Descripción | Long text | Descripción breve |
| Categoría | Single select | Opciones: Seguridad y Salud, Reglamento Interno, Recursos Humanos, General |
| Versión | Single line text | Ej: v001, v002 |
| Fecha Publicación | Date | Fecha de publicación |
| Fecha Vigencia | Date | Desde cuándo aplica |
| Estado | Single select | Opciones: Activa, En revisión, Obsoleta |
| URL Documento S3 | URL | Link al PDF en S3 |
| Requiere Firma | Checkbox | Si requiere aceptación |
| Visible Colaboradores | Checkbox | Si está visible |
| Firmas | Link to another record | → Firmas Políticas |
| Orden Visualización | Number | Para ordenar (menor = primero) |
| Creado Por | Single line text | Nombre del creador |
| Fecha Creación | Date with time | Fecha/hora de creación |
| Modificado Por | Single line text | Nombre del modificador |
| Fecha Modificación | Date with time | Fecha/hora última modificación |

---

### 2. Tabla "Firmas Políticas"

Registra las aceptaciones/firmas de políticas por colaborador.

**Campos requeridos:**

| Nombre del Campo | Tipo | Descripción |
|---|---|---|
| ID | Primary Field (Fórmula) | `{ID Empleado Core} & " - " & {Política}` |
| Política | Link to another record | → Políticas |
| ID Empleado Core | Single line text | ID del empleado (de tabla Personal) |
| Nombre Empleado | Single line text | Nombre completo |
| Fecha Firma | Date with time | Cuándo firmó |
| Firma | Long text | Data URL de la firma (imagen) |
| IP Address | Single line text | (Opcional) IP del firmante |
| User Agent | Long text | (Opcional) Navegador usado |

---

### 3. Tabla "Tokens Firma Política"

Gestiona tokens para firmas remotas (similar a entregas EPP).

**Campos requeridos:**

| Nombre del Campo | Tipo | Descripción |
|---|---|---|
| Token ID | Primary Field | ID único del token |
| Política | Link to another record | → Políticas |
| ID Empleado Core | Single line text | ID del empleado |
| Fecha Generación | Date with time | Cuándo se generó |
| Fecha Expiración | Date with time | Cuándo expira |
| Estado | Single select | Opciones: Activo, Usado, Expirado |

---

## Variables de Entorno Necesarias

Agregar al archivo `.env`:

```bash
# ══════════════════════════════════════════════════════════
# POLÍTICAS EMPRESARIALES
# ══════════════════════════════════════════════════════════

# Tabla "Políticas"
AIRTABLE_POLITICAS_TABLE_ID=tblXXXXXXXXXXXXXX
AIRTABLE_POL_ID=fldXXXXXXXXXXXXXX
AIRTABLE_POL_CODIGO=fldXXXXXXXXXXXXXX
AIRTABLE_POL_TITULO=fldXXXXXXXXXXXXXX
AIRTABLE_POL_DESCRIPCION=fldXXXXXXXXXXXXXX
AIRTABLE_POL_CATEGORIA=fldXXXXXXXXXXXXXX
AIRTABLE_POL_VERSION=fldXXXXXXXXXXXXXX
AIRTABLE_POL_FECHA_PUBLICACION=fldXXXXXXXXXXXXXX
AIRTABLE_POL_FECHA_VIGENCIA=fldXXXXXXXXXXXXXX
AIRTABLE_POL_ESTADO=fldXXXXXXXXXXXXXX
AIRTABLE_POL_URL_DOCUMENTO=fldXXXXXXXXXXXXXX
AIRTABLE_POL_REQUIERE_FIRMA=fldXXXXXXXXXXXXXX
AIRTABLE_POL_VISIBLE=fldXXXXXXXXXXXXXX
AIRTABLE_POL_FIRMAS_LINK=fldXXXXXXXXXXXXXX
AIRTABLE_POL_ORDEN=fldXXXXXXXXXXXXXX
AIRTABLE_POL_CREADO_POR=fldXXXXXXXXXXXXXX
AIRTABLE_POL_FECHA_CREACION=fldXXXXXXXXXXXXXX
AIRTABLE_POL_MODIFICADO_POR=fldXXXXXXXXXXXXXX
AIRTABLE_POL_FECHA_MODIFICACION=fldXXXXXXXXXXXXXX

# Tabla "Firmas Políticas"
AIRTABLE_FIRMPOL_TABLE_ID=tblXXXXXXXXXXXXXX
AIRTABLE_FIRMPOL_ID=fldXXXXXXXXXXXXXX
AIRTABLE_FIRMPOL_POLITICA_LINK=fldXXXXXXXXXXXXXX
AIRTABLE_FIRMPOL_ID_EMPLEADO=fldXXXXXXXXXXXXXX
AIRTABLE_FIRMPOL_NOMBRE_EMPLEADO=fldXXXXXXXXXXXXXX
AIRTABLE_FIRMPOL_FECHA_FIRMA=fldXXXXXXXXXXXXXX
AIRTABLE_FIRMPOL_FIRMA=fldXXXXXXXXXXXXXX
AIRTABLE_FIRMPOL_IP_ADDRESS=fldXXXXXXXXXXXXXX
AIRTABLE_FIRMPOL_USER_AGENT=fldXXXXXXXXXXXXXX

# Tabla "Tokens Firma Política"
AIRTABLE_TOKPOL_TABLE_ID=tblXXXXXXXXXXXXXX
AIRTABLE_TOKPOL_TOKEN_ID=fldXXXXXXXXXXXXXX
AIRTABLE_TOKPOL_POLITICA_LINK=fldXXXXXXXXXXXXXX
AIRTABLE_TOKPOL_ID_EMPLEADO=fldXXXXXXXXXXXXXX
AIRTABLE_TOKPOL_FECHA_GENERACION=fldXXXXXXXXXXXXXX
AIRTABLE_TOKPOL_FECHA_EXPIRACION=fldXXXXXXXXXXXXXX
AIRTABLE_TOKPOL_ESTADO=fldXXXXXXXXXXXXXX
```

---

## Pasos de Configuración

### 1. Crear las Tablas en Airtable

1. Abre tu base "SG-SST" en Airtable
2. Crea las 3 tablas según las especificaciones arriba
3. Configura los campos con los tipos correctos
4. Establece las relaciones entre tablas (Link to another record)

### 2. Obtener los IDs

Para cada tabla y campo:

1. Click derecho en el nombre de la tabla/campo
2. "Copy field ID" o "Copy table ID"
3. Pegar en el archivo `.env`

### 3. Configurar Opciones de Single Select

**Categoría** (en tabla Políticas):
- Seguridad y Salud
- Reglamento Interno
- Recursos Humanos
- General

**Estado** (en tabla Políticas):
- Activa
- En revisión
- Obsoleta

**Estado** (en tabla Tokens):
- Activo
- Usado
- Expirado

---

## Estructura de Archivos S3

Los documentos PDF se almacenan en:

```
s3://[bucket]/politicas/
  ├── p-sst-001-v001.pdf
  ├── p-sst-001-v002.pdf
  ├── p-rrhh-001-v001.pdf
  └── ...
```

**Patrón**: `{codigo-kebab-case}-{version}.pdf`

---

## Flujo de Uso

### Para Administradores:

1. **Dashboard → Políticas → Administrar** (botón en esquina)
2. **Nueva Política**:
   - Completar formulario
   - Subir PDF
   - Elegir si requiere firma
   - Establecer visibilidad
3. **Gestionar Políticas**:
   - Ver/Editar/Eliminar (soft delete)
   - Cambiar visibilidad con un click
   - Ver estado de firmas

### Para Colaboradores:

1. **Dashboard → Políticas Empresariales**
2. Ver resumen de políticas firmadas/pendientes
3. Filtrar por categoría
4. Políticas que no requieren firma: Click "Ver Política"
5. Políticas que requieren firma: Click "Leer y Firmar"
   - Se abre el PDF
   - Sistema registra la aceptación con firma digital

---

## Permisos Requeridos

Solo usuarios con rol **"Administrador"** pueden:
- Acceder a `/dashboard/politicas/admin`
- Crear nuevas políticas
- Editar políticas existentes
- Cambiar visibilidad
- Eliminar (marcar como obsoletas)

Todos los colaboradores pueden:
- Ver políticas activas y visibles
- Descargar PDFs
- Firmar aceptación (si se requiere)
- Ver su estado de firmas

---

## Próximos Pasos (Opcional)

- [ ] Implementar firma digital con canvas (similar a entregas EPP)
- [ ] Sistema de tokens para firma remota vía email
- [ ] Reportes de cumplimiento de firma por colaborador
- [ ] Notificaciones automáticas cuando hay nuevas políticas
- [ ] Versionamiento automático de políticas
- [ ] Dashboard de estadísticas de aceptación

---

## Notas Técnicas

- Las políticas **no se eliminan físicamente**, solo se marcan como "Obsoleta"
- El campo `Visible Colaboradores` controla si aparece en el dashboard público
- El campo `Requiere Firma` activa el flujo de aceptación
- Los PDFs se almacenan en S3 con URLs firmadas (expiran en 1 hora por defecto)
- Sistema compatible con el patrón existente de entregas EPP (firma digital)

---

## Soporte

Para problemas de configuración, verificar:
1. Todas las variables de entorno están definidas
2. Los IDs de tabla y campo son correctos
3. Las opciones de Single Select están exactamente como se especifica
4. El bucket S3 tiene permisos de escritura
5. El token de Airtable tiene permisos en la base SG-SST
