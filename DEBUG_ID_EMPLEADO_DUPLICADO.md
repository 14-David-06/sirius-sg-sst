# 🐛 Debug: ID Empleado Duplicado en URLs de Firma

**Problema:** Al generar links de firma en inducciones, el `idEmpleadoCore` siempre queda con el primer ID (`SIRIUS-PER-0001`)

**Fecha:** 2026-07-02

## 📝 Cambios Aplicados

He agregado **logging exhaustivo** en los puntos críticos del flujo:

### 1. Creación de Inducción
**Archivo:** `src/infrastructure/repositories/airtableInduccionesRepository.ts`

Logs agregados:
- DTO recibido completo
- ID Empleado Core del DTO
- Payload que se envía a Airtable
- Registro creado por Airtable
- Registro mapeado final con idEmpleadoCore

### 2. Obtención de Registro por ID Inducción
**Archivo:** `src/infrastructure/repositories/airtableInduccionesRepository.ts`

Logs agregados:
- ID de inducción buscado
- Cantidad de registros encontrados
- idEmpleadoCore del registro mapeado

### 3. Generación de Token
**Archivo:** `src/app/api/inducciones/token/route.ts`

Logs agregados:
- idInduccion recibido
- idEmpleadoCore recibido (o "NO PROPORCIONADO")
- idEmpleadoCore obtenido del registro
- Parámetros finales para generar token
- Hash del token generado

## 🔍 Cómo Debuggear

### Paso 1: Crear Nueva Inducción

1. **Iniciar servidor en dev:**
```bash
npm run dev
```

2. **Ir a:** `http://localhost:3000/dashboard/inducciones/nueva`

3. **Seleccionar empleado diferente** (NO el primer empleado de la lista)

4. **Completar formulario y crear inducción**

5. **Revisar consola del servidor** — buscar estos logs:

```
[crearRegistro] Iniciando creación de nueva inducción...
[crearRegistro] DTO recibido: {
  "idEmpleadoCore": "SIRIUS-PER-00XX",  <-- Verificar que sea el correcto
  ...
}
[crearRegistro] ID Empleado Core: SIRIUS-PER-00XX
[crearRegistro] Payload a enviar a Airtable: {
  "fields": {
    "[FIELD_ID]": "IND-000X",
    "[FIELD_ID]": "SIRIUS-PER-00XX",  <-- Verificar que coincida
    ...
  }
}
[crearRegistro] Registro creado en Airtable: {
  "id": "recXXX",
  "fields": {
    "ID_Empleado_CORE": "SIRIUS-PER-00XX",  <-- Verificar aquí
    ...
  }
}
[crearRegistro] Registro mapeado final - idEmpleadoCore: SIRIUS-PER-00XX
```

**✅ Si aquí el ID es correcto, el problema NO está en la creación.**

### Paso 2: Generar Link de Firma

1. **Ir al historial del colaborador:**
   `http://localhost:3000/dashboard/inducciones/colaborador/[ID]`

2. **Click en "Generar Link de Firma"**

3. **Revisar consola del servidor** — buscar estos logs:

```
[POST /api/inducciones/token] idInduccion: IND-000X
[POST /api/inducciones/token] idEmpleadoCore recibido: NO PROPORCIONADO
[POST /api/inducciones/token] Obteniendo idEmpleadoCore desde registro...
[obtenerRegistroPorIdInduccion] Buscando inducción: IND-000X
[obtenerRegistroPorIdInduccion] Registros encontrados: 1
[obtenerRegistroPorIdInduccion] Registro mapeado - idEmpleadoCore: SIRIUS-PER-00XX  <-- ⚠️ VERIFICAR AQUÍ
[POST /api/inducciones/token] idEmpleadoCore obtenido del registro: SIRIUS-PER-00XX
[POST /api/inducciones/token] Generando token para: { 
  idInduccion: 'IND-000X', 
  empleadoId: 'SIRIUS-PER-00XX'  <-- ⚠️ VERIFICAR AQUÍ
}
[generarTokenFirma] ID: IND-000X, Estado actual: En_Proceso
[generarTokenFirma] URL generada correctamente: https://...
```

**❌ Si en "Registro mapeado - idEmpleadoCore" aparece `SIRIUS-PER-0001` pero debería ser otro:**

El problema está en **cómo se está guardando o leyendo el campo en Airtable**.

## 🎯 Posibles Causas

### Causa 1: Campo ID_EMPLEADO_CORE Incorrecto en Airtable

El Field ID configurado en `.env` puede no ser el correcto.

**Verificar:**
1. Ir a Airtable → Base SG-SST → Tabla `ind_registros`
2. Click en el campo `ID_Empleado_CORE`
3. Copiar el Field ID (ejemplo: `fldXXXXXXXXXXXXXX`)
4. Comparar con `.env`:
```bash
AIRTABLE_IND_REG_ID_EMPLEADO_CORE=fldXXXXXXXXXXXXXX
```

**Si no coinciden:** Actualizar `.env` y reiniciar servidor.

### Causa 2: Filtro de Búsqueda Incorrecto

El método `obtenerRegistroPorIdInduccion` puede estar devolviendo siempre el primer registro.

**Verificar en logs:**
```
[obtenerRegistroPorIdInduccion] Buscando inducción: IND-000X
[obtenerRegistroPorIdInduccion] Registros encontrados: 1  <-- Debe ser 1, no más
```

**Si es > 1:** El filtro no está funcionando correctamente.

**Solución temporal (para debugging):**
```typescript
// En airtableInduccionesRepository.ts línea 88
filterByFormula: `{ID_Induccion} = '${idInduccion}'`,

// Cambiar temporalmente a:
filterByFormula: `FIND('${idInduccion}', {ID_Induccion}) > 0`,
```

### Causa 3: Mapper Tomando Campo Incorrecto

El mapper puede estar leyendo un campo diferente al esperado.

**Verificar en logs:**
```
[crearRegistro] Registro creado en Airtable: {
  "fields": {
    "ID_Empleado_CORE": "SIRIUS-PER-00XX",  <-- Nombre del campo en Airtable
    ...
  }
}
```

**Si el campo tiene otro nombre en Airtable (ej: `"ID Empleado CORE"` con espacios):**

Actualizar el mapper en `airtableInduccionesRepository.ts` línea 614:
```typescript
idEmpleadoCore: f["ID_Empleado_CORE"] || f["ID Empleado CORE"] || f[RF.ID_EMPLEADO_CORE],
```

### Causa 4: Cache del Navegador

El frontend puede estar usando datos en cache.

**Solución:**
1. Abrir DevTools (F12)
2. Network tab → Disable cache
3. Hard refresh (Ctrl + Shift + R)
4. Generar link de nuevo

## 📊 Checklist de Verificación

- [ ] Logs de creación muestran `idEmpleadoCore` correcto
- [ ] Registro guardado en Airtable tiene `ID_Empleado_CORE` correcto
- [ ] Logs de obtención muestran `idEmpleadoCore` correcto
- [ ] Logs de generación de token muestran `empleadoId` correcto
- [ ] Field ID en `.env` coincide con Airtable
- [ ] Filtro devuelve solo 1 registro
- [ ] Nombre del campo en Airtable coincide con el mapper
- [ ] Cache del navegador deshabilitado

## 🔧 Soluciones Rápidas

### Si el problema persiste después de verificar todo:

**Solución 1: Pasar idEmpleadoCore explícitamente desde el frontend**

Modificar `src/app/dashboard/inducciones/colaborador/[empId]/page.tsx` línea 82:

```typescript
// ANTES:
body: JSON.stringify({ idInduccion: registro.idInduccion }),

// DESPUÉS:
body: JSON.stringify({ 
  idInduccion: registro.idInduccion,
  idEmpleadoCore: registro.idEmpleadoCore  // <-- Agregar esto
}),
```

**Esto evita tener que buscar el registro y usa el ID directamente desde el frontend.**

### Solución 2: Verificar en Airtable directamente

1. Ir a Airtable → Base SG-SST → Tabla `ind_registros`
2. Buscar el registro con `ID_Induccion = IND-000X`
3. Verificar manualmente el valor de `ID_Empleado_CORE`
4. Si es incorrecto, actualizar manualmente
5. Generar link de firma de nuevo

## 📞 Siguiente Paso

1. **Crear una inducción de prueba** con un empleado específico
2. **Copiar los logs completos** de la consola del servidor
3. **Compartir los logs** para análisis detallado

Los logs dirán exactamente dónde se está perdiendo o cambiando el `idEmpleadoCore`.

---

**Logging agregado en commit:** (próximo commit)
