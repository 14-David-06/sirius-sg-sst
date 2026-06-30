# ✅ Pasos Finales para Completar el Módulo de Políticas

## Estado Actual

✅ **Archivos PDF subidos a S3** (11/11)
- Carpeta: `politicas/`
- Bucket: `sirius-sg-sst`
- Región: `us-east-1`
- URLs: https://sirius-sg-sst.s3.us-east-1.amazonaws.com/politicas/pt-sst-XXX.pdf

❌ **Tabla de Políticas en Airtable** - NO EXISTE
- Necesitas crear la tabla y configurar su ID en `.env.local`

✅ **Frontend actualizado** - Diseño glassmorphism completo

---

## 📋 Paso 1: Crear Tabla en Airtable

### 1.1. Ir a tu Base SG-SST en Airtable

Abre: https://airtable.com/ → Base "SG-SST"

### 1.2. Crear Nueva Tabla

Click en **"+"** para agregar una tabla nueva

**Nombre**: `Políticas`

### 1.3. Configurar Campos

Crea estos campos en orden:

| # | Nombre del Campo | Tipo | Opciones |
|---|------------------|------|----------|
| 1 | **ID** | Autonumber | - |
| 2 | **Código** | Single line text | - |
| 3 | **Título** | Single line text | - |
| 4 | **Descripción** | Long text | - |
| 5 | **Categoría** | Single select | Opciones: `Seguridad y Salud`, `Reglamento Interno`, `Recursos Humanos`, `General` |
| 6 | **Versión** | Single line text | - |
| 7 | **Fecha Publicación** | Date | Formato: Local (Colombia) |
| 8 | **Fecha Vigencia** | Date | Formato: Local (Colombia) |
| 9 | **Estado** | Single select | Opciones: `Activa`, `En revisión`, `Obsoleta` |
| 10 | **URL Documento S3** | URL | - |
| 11 | **Requiere Firma** | Checkbox | - |
| 12 | **Visible Colaboradores** | Checkbox | - |
| 13 | **Orden Visualización** | Number | Precision: Integer |
| 14 | **Creado Por** | Single line text | - |
| 15 | **Fecha Creación** | Date | Include time |
| 16 | **Modificado Por** | Single line text | - |
| 17 | **Fecha Modificación** | Date | Include time |
| 18 | **Firmas** | Link to another record | Link a tabla: `Firmas Políticas` |

---

## 📋 Paso 2: Obtener el Table ID

### 2.1. Abrir la tabla "Políticas" en Airtable

### 2.2. Copiar el Table ID desde la URL

La URL se ve así:
```
https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/viwZZZZZZZZZZZZZZ
                     ^^^^^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^ 
                     Base ID           Table ID
```

El **Table ID** es el que empieza con `tbl` (ej: `tblYYYYYYYYYYYYYY`)

### 2.3. Agregar el Table ID a `.env.local`

Abre el archivo `.env.local` y agrega estas líneas **después de las otras variables de Airtable**:

```bash
# Tabla Políticas
AIRTABLE_POLITICAS_TABLE_ID=tblXXXXXXXXXXXXXX  ← Reemplazar con tu Table ID real
```

### 2.4. Obtener Field IDs

Necesitas los IDs de cada campo. Para obtenerlos:

**Opción A: Usar la API de Airtable**
1. Ve a https://airtable.com/api
2. Selecciona tu base "SG-SST"
3. Busca la tabla "Políticas"
4. Los Field IDs están en la sección "Fields"

**Opción B: Usar este script**

Crea un archivo temporal `get-field-ids.ts`:

```typescript
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const baseId = process.env.AIRTABLE_SGSST_BASE_ID;
const tableId = "TU_TABLE_ID_AQUI"; // ← Reemplazar
const apiToken = process.env.AIRTABLE_SGSST_API_TOKEN;

fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
  headers: { Authorization: `Bearer ${apiToken}` }
})
  .then(r => r.json())
  .then(data => {
    const table = data.tables.find((t: any) => t.id === tableId);
    console.log("Fields:");
    table.fields.forEach((f: any) => {
      console.log(`${f.name}: ${f.id}`);
    });
  });
```

Ejecuta: `npx tsx get-field-ids.ts`

### 2.5. Agregar Field IDs a `.env.local`

Agrega estas variables con los IDs reales de tus campos:

```bash
# Field IDs de Políticas
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
AIRTABLE_POL_ORDEN=fldXXXXXXXXXXXXXX
AIRTABLE_POL_CREADO_POR=fldXXXXXXXXXXXXXX
AIRTABLE_POL_FECHA_CREACION=fldXXXXXXXXXXXXXX
AIRTABLE_POL_MODIFICADO_POR=fldXXXXXXXXXXXXXX
AIRTABLE_POL_FECHA_MODIFICACION=fldXXXXXXXXXXXXXX
AIRTABLE_POL_FIRMAS_LINK=fldXXXXXXXXXXXXXX
```

---

## 📋 Paso 3: Importar Datos

Una vez configurados los IDs, tienes 2 opciones:

### Opción A: Ejecutar el Script Automatizado

```bash
npx tsx scripts/create-politicas-records.ts
```

Este script creará los 11 registros automáticamente.

### Opción B: Importar CSV

1. Usa el archivo `politicas.csv` que ya está en la raíz del proyecto
2. En Airtable, click en "..." → "Import data" → "CSV file"
3. Sube `politicas.csv`
4. Mapea las columnas a los campos correctos

---

## 📋 Paso 4: Verificar en la Aplicación

1. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre en el navegador:
   ```
   http://localhost:3000/dashboard/politicas
   ```

3. Deberías ver:
   - ✅ 4 tarjetas de estadísticas
   - ✅ Filtros por categoría
   - ✅ 11 políticas listadas
   - ✅ Botones para ver y descargar cada PDF

---

## 🎯 Resumen

✅ **Completado:**
- Archivos PDF en S3
- Frontend con diseño glassmorphism
- Scripts de carga

⏳ **Pendiente (TU debes hacer):**
1. Crear tabla "Políticas" en Airtable
2. Copiar Table ID y Field IDs
3. Agregar IDs a `.env.local`
4. Ejecutar script o importar CSV
5. Verificar en la aplicación

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:

1. **Error 404 en Airtable**: La tabla no existe o el Table ID es incorrecto
2. **Error en campos**: Los Field IDs no coinciden con los campos reales
3. **PDFs no se ven**: Verifica que las URLs de S3 sean públicas

---

## 📝 Notas Importantes

- **NO borres** la carpeta `politicas/` de S3
- **NO cambies** los nombres de archivos en S3 (deben ser `pt-sst-001.pdf`, etc.)
- **SI cambias** el nombre de un campo en Airtable, actualiza el Field ID en `.env.local`
- Las URLs de S3 son públicas y no requieren autenticación

---

¡Sigue estos pasos y tendrás el módulo de políticas 100% funcional! 🚀
