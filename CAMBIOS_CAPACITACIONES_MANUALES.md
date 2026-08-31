# Resumen de Cambios: Capacitaciones Manuales en Actas COPASST

**Fecha**: 31 de agosto de 2026  
**Módulo**: COPASST - Actas de Reunión  
**Tipo**: Nueva Funcionalidad

## Descripción del Cambio

Se ha implementado la funcionalidad para agregar capacitaciones manualmente en las actas de COPASST, permitiendo registrar capacitaciones que no están previamente cargadas en el módulo de Programación de Capacitaciones.

## Motivación

Anteriormente, solo era posible seleccionar capacitaciones que ya estuvieran registradas en el módulo de "Programación de Capacitaciones". Esta limitación impedía documentar capacitaciones ad-hoc, capacitaciones externas, o eventos educativos que no fueron pre-programados.

## Solución Implementada

### 1. Nuevo Campo en Airtable
- **Tabla**: `copasst_actas`
- **Nombre del campo**: `Capacitaciones Manuales`
- **Tipo**: Long Text (almacena JSON)
- **Variable de entorno**: `COPASST_ACTAS_CAPACITACIONES_MANUALES_FIELD`

### 2. Nuevo Componente de UI
En el formulario de nueva acta, después de la sección "Capacitaciones ejecutadas del mes", ahora aparece:

**"Capacitaciones adicionales (manual)"**

Permite agregar capacitaciones con:
- Tema de la capacitación (texto + dictado por voz)
- Fecha de ejecución (opcional)
- Observaciones (texto + dictado por voz)

### 3. Integración con PDF
Las capacitaciones manuales se muestran en el PDF del acta junto con las capacitaciones vinculadas, en una sola tabla consolidada.

## Archivos Modificados

### Backend (5 archivos)

1. **`src/infrastructure/config/airtableSGSST.ts`**
   - Agregado: `CAPACITACIONES_MANUALES` al objeto `copasstActasFields`

2. **`src/lib/comites/types.ts`**
   - Agregado: Interfaz `CapacitacionManual`
   - Modificado: `ActaCopasst` ahora incluye `capacitacionesManuales: CapacitacionManual[]`

3. **`src/lib/comites/actasRepository.ts`**
   - Modificado: `mapCabeceraToDomain()` - Parsea JSON de capacitaciones manuales
   - Modificado: `cabeceraFieldsFromDomain()` - Stringifica capacitaciones manuales
   - Modificado: `CrearActaPayload` - Agregado campo `capacitacionesManuales`
   - Modificado: `crearActa()` - Guarda capacitaciones manuales como JSON
   - Modificado: `actualizarActa()` - Actualiza capacitaciones manuales

4. **`src/lib/comites/actaPdf.ts`**
   - Modificado: Sección 6 - Combina capacitaciones vinculadas y manuales en una sola tabla

### Frontend (1 archivo)

5. **`src/app/dashboard/comites/[comite]/nueva/page.tsx`**
   - Agregado: Interfaz `CapacitacionManualForm`
   - Agregado: Estado `capsManuales`
   - Agregado: Componente `Repeater` para capacitaciones manuales
   - Modificado: Payload de submit incluye `capacitacionesManuales`

## Pasos de Configuración

### 1. Crear el campo en Airtable
```
Base: SG-SST
Tabla: copasst_actas
Campo: Capacitaciones Manuales
Tipo: Long text
```

### 2. Agregar variable de entorno
```bash
# .env.local
COPASST_ACTAS_CAPACITACIONES_MANUALES_FIELD=fld... # Obtener de Airtable
```

### 3. Validar configuración
```bash
npm run check:env
```

### 4. Reiniciar servidor
```bash
npm run dev
```

## Cómo Usar la Nueva Funcionalidad

1. Ir a `/dashboard/comites/copasst`
2. Click en "Nueva acta"
3. Desplazarse a la sección "Capacitaciones adicionales (manual)"
4. Click en "Agregar"
5. Llenar los campos:
   - **Tema**: Obligatorio
   - **Fecha**: Opcional
   - **Observaciones**: Opcional
6. Se pueden agregar múltiples capacitaciones
7. Al guardar, las capacitaciones manuales se almacenan en el acta

## Características Técnicas

### Almacenamiento
- Las capacitaciones manuales se guardan como JSON en un campo de texto largo
- Formato: `[{tema, fechaEjecucion, asistentes, observaciones}, ...]`
- El parsing incluye try/catch con fallback a array vacío

### Validación
- Solo se requiere el campo `tema`
- Capacitaciones con tema vacío se filtran automáticamente
- Otros campos son opcionales

### Independencia de Módulos
- **NO afecta** la tabla de Programación de Capacitaciones
- **NO afecta** ningún otro módulo del sistema
- **NO afecta** las estadísticas de capacitaciones
- Solo existe en el contexto del acta de COPASST

### Compatibilidad
- ✅ Compatible con actas anteriores (array vacío por defecto)
- ✅ Compatible con actas sin el campo (fallback seguro)
- ✅ El PDF funciona con o sin capacitaciones manuales

## Beneficios

1. **Flexibilidad**: Documentar capacitaciones no programadas
2. **Sin Dependencias**: No requiere pre-registro en otro módulo
3. **Trazabilidad**: Las capacitaciones quedan en el acta firmada
4. **PDF Unificado**: Todas las capacitaciones en un solo documento
5. **Retrocompatibilidad**: Funciona con actas existentes

## Impacto en el Sistema

- **Bajo impacto**: Solo afecta el módulo de actas COPASST
- **Sin breaking changes**: Compatible con versiones anteriores
- **Rendimiento**: Mínimo (un campo JSON adicional)
- **Escalabilidad**: Ilimitadas capacitaciones por acta

## Testing Recomendado

- [ ] Crear acta con capacitaciones vinculadas solamente
- [ ] Crear acta con capacitaciones manuales solamente
- [ ] Crear acta con ambos tipos de capacitaciones
- [ ] Verificar PDF con capacitaciones combinadas
- [ ] Editar acta existente y agregar capacitaciones manuales
- [ ] Validar que actas antiguas funcionen correctamente

## Documentación

- **Guía completa**: `docs/modulos/copasst/CAPACITACIONES_MANUALES.md`
- **Troubleshooting**: Ver sección en la guía completa
- **Variables de entorno**: Actualizar `.env.example` si es necesario

## Próximos Pasos

1. Crear el campo en Airtable
2. Configurar variable de entorno
3. Validar con `npm run check:env`
4. Probar la funcionalidad en desarrollo
5. Actualizar `.env.example` (opcional)
6. Desplegar a producción

## Notas Adicionales

- El campo `id` en `CapacitacionManualForm` es solo para React keys (no se guarda)
- Las capacitaciones manuales no tienen `recordId` de Airtable
- El dictado por voz funciona para tema y observaciones
- Se puede eliminar una capacitación manual antes de guardar el acta
- Una vez guardada el acta, las capacitaciones manuales quedan persistidas

## Contacto

Para dudas o problemas con esta funcionalidad, referirse a:
- Documentación completa: `docs/modulos/copasst/CAPACITACIONES_MANUALES.md`
- CLAUDE.md para arquitectura general del proyecto
