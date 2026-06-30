# Módulo de Seguimiento Vehicular — Estado de Implementación

**Fecha:** 2026-06-26  
**Módulo:** SG-SST Seguimiento Vehicular  
**Prefijo tablas:** `veh_`

## ✅ Completado (6/19 tareas)

### Configuración Base
- [x] Variables de entorno (`.env.example`) — 4 tablas, 50+ field IDs
- [x] Configuración Airtable (`airtableSGSST.ts`) — 4 tablas integradas
  - `veh_vehiculos` (vehículos de colaboradores)
  - `veh_documentos` (SOAT y tecnomecánica)
  - `veh_licencias` (licencias de conducción)
  - `veh_alertas_log` (historial de alertas)

### Endpoints Implementados
- [x] `GET /api/sgsst/vehicular` — Listar todos los vehículos con estado consolidado
  - Calcula estado: Vigente/Por vencer/Vencido
  - Lookup a Nómina Core para resolver nombres
  - Filtros: estado consolidado, tipo de vehículo, activo
  - Ordenamiento automático por criticidad

- [x] `GET /api/sgsst/vehicular/:id_personal` — Vehículos por colaborador
  - Consulta completa de vehículos, documentos y licencia
  - Validación de formato `SIRIUS-PER-XXXX`

- [x] `POST /api/sgsst/vehicular/vehiculos` — Registrar vehículo
  - Validación de placa colombiana (ABC123 para autos, ABC12D para motos)
  - Verificación de colaborador en Nómina Core
  - Validación de placa duplicada
  - Tipos: Motocicleta, Automóvil, Camioneta, Camión, Bicicleta, Otro

- [x] `PUT /api/sgsst/vehicular/vehiculos/:id` — Actualizar vehículo
- [x] `DELETE /api/sgsst/vehicular/vehiculos/:id` — Desactivar (soft delete)

## 🚧 Pendiente (13/19 tareas)

### Endpoints Críticos Faltantes

#### 1. Gestión de Documentos (SOAT/Tecnomecánica)
**Archivo:** `src/app/api/sgsst/vehicular/documentos/route.ts`

```typescript
// POST — Registrar SOAT o Tecnomecánica
// PUT — Actualizar documento existente
// Campos: tipo (SOAT|Tecnomecánica), numeroDocumento, entidadEmisora,
//         fechaExpedicion, fechaVencimiento, urlDocumento (S3)
// Validación: fechaVencimiento >= fechaExpedicion
```

#### 2. Vencimientos de Documentos
**Archivo:** `src/app/api/sgsst/vehicular/documentos/vencimientos/route.ts`

```typescript
// GET — Listar documentos próximos a vencer (≤30 días) o vencidos
// Query params: tipo (SOAT|Tecnomecánica), dias (default: 30)
// Retorna: lista ordenada por fecha de vencimiento ASC
```

#### 3. Gestión de Licencias
**Archivo:** `src/app/api/sgsst/vehicular/licencias/route.ts`

```typescript
// POST — Registrar licencia de conducción
// PUT — Actualizar licencia existente
// Categorías colombianas: A1, A2, B1, B2, B3, C1, C2, C3
// Campos: numeroLicencia, categoria, fechaExpedicion, fechaVencimiento,
//         organismoTransito, urlLicencia (S3)
```

#### 4. Vencimientos de Licencias
**Archivo:** `src/app/api/sgsst/vehicular/licencias/vencimientos/route.ts`

```typescript
// GET — Listar licencias próximas a vencer (≤30 días) o vencidas
// Query params: categoria, dias (default: 30)
```

#### 5. Sistema de Alertas (CRÍTICO)
**Archivo:** `src/app/api/sgsst/vehicular/alertas/trigger/route.ts`

```typescript
// POST — Cron job para revisar vencimientos y enviar alertas
// Proceso:
// 1. Consultar documentos/licencias con vencimiento ≤30 días
// 2. Verificar si ya se envió alerta en últimas 24h (evitar spam)
// 3. Enviar correo vía SendGrid con template HTML
// 4. Registrar en veh_alertas_log
// Variables de entorno requeridas:
//   - SENDGRID_API_KEY
//   - SENDGRID_FROM_EMAIL
//   - SENDGRID_RESPONSABLE_SST_EMAIL
```

**Template de correo sugerido:**
```html
<h2>⚠️ Alerta de Vencimiento — SG-SST Seguimiento Vehicular</h2>
<p>El siguiente documento está próximo a vencer:</p>
<ul>
  <li><strong>Colaborador:</strong> {{nombreColaborador}}</li>
  <li><strong>Documento:</strong> {{tipoDocumento}} — {{numeroDocumento}}</li>
  <li><strong>Vehículo:</strong> {{placa}} ({{tipoVehiculo}})</li>
  <li><strong>Fecha de vencimiento:</strong> {{fechaVencimiento}}</li>
  <li><strong>Días restantes:</strong> {{diasRestantes}} días</li>
</ul>
<p><a href="https://sgsst.siriusregenerative.com/dashboard/sgsst/vehicular">Ver panel vehicular</a></p>
```

#### 6. Historial de Alertas
**Archivo:** `src/app/api/sgsst/vehicular/alertas/route.ts`

```typescript
// GET — Consultar historial de alertas enviadas
// Query params: entidadTipo (documento|licencia), fechaDesde, fechaHasta
// Incluye: éxito/fallo de envío, destinatario, fecha
```

### UI Pendiente (Tareas 13-17)

#### 7. Panel Principal
**Archivo:** `src/app/dashboard/sgsst/vehicular/page.tsx`

**Componentes requeridos:**
- Tabla de vehículos con semáforo visual (🟢 Vigente, 🟡 Por vencer, 🔴 Vencido)
- Filtros: estado consolidado, tipo de vehículo, área, colaborador
- Botón "Registrar Vehículo" → Modal
- Acciones por fila: Ver detalle, Editar, Desactivar

**Indicadores en header:**
- Total vehículos activos
- Documentos por vencer (≤30 días)
- Documentos vencidos
- Licencias por vencer

#### 8. Formulario de Registro de Vehículo
**Componente:** `src/app/dashboard/sgsst/vehicular/components/FormularioVehiculo.tsx`

**Campos:**
- Autocompletado de colaborador (buscar por nombre o cédula)
- Placa (validación en tiempo real)
- Tipo de vehículo (select)
- Propietario: nombre, tipo (select), documento (condicional)
- Observaciones (textarea)

**Validaciones client-side:**
- Formato de placa según tipo de vehículo
- Colaborador existente

#### 9. Formularios de Documentos y Licencias
**Componente:** `src/app/dashboard/sgsst/vehicular/components/FormularioDocumentos.tsx`

**Para SOAT/Tecnomecánica:**
- Tipo de documento (radio: SOAT | Tecnomecánica)
- Número de documento
- Entidad emisora
- Fecha de expedición (date picker)
- Fecha de vencimiento (date picker)
- Cargar documento PDF/imagen (opcional → S3)
- Preview de estado calculado en tiempo real

**Para Licencias:**
- Número de licencia
- Categoría (select: A1, A2, B1, B2, B3, C1, C2, C3)
- Fechas de expedición y vencimiento
- Organismo de tránsito
- Cargar imagen de licencia (opcional → S3)

#### 10. Exportación de Reportes
**Archivo:** `src/app/api/sgsst/vehicular/exportar/route.ts`

```typescript
// GET — Exportar listado de vencimientos
// Query params: formato (excel|pdf), filtros (estado, tipo, area)
// Excel: usar ExcelJS (ya integrado en el proyecto)
// PDF: usar jsPDF + autoTable (ya integrado)
```

### Integración con Dashboard Principal (Tarea 17)

**Archivo:** `src/app/dashboard/page.tsx`

Agregar en fase H (Hacer):

```typescript
{
  title: "Seguimiento Vehicular",
  description: "Vehículos, SOAT, tecnomecánica y licencias de conducción de colaboradores.",
  icon: I.truck, // Agregar icono de camión/vehículo
  color: "bg-indigo-500/15 text-indigo-300",
  href: "/dashboard/sgsst/vehicular",
  status: "active",
  estandar: "Decreto 1072/2015 — Seguridad vial",
},
```

### Documentación (Tarea 18)

**Archivo:** `CLAUDE.md`

Actualizar sección de Módulos del Sistema:

```markdown
| **Seguimiento Vehicular** | `/api/sgsst/vehicular` | `sgsst/vehicular` | ✅ |
```

Agregar sección en estructura de tablas:

```markdown
**Seguimiento Vehicular:**
- veh_vehiculos (vehículos de colaboradores)
- veh_documentos (SOAT y tecnomecánica)
- veh_licencias (licencias de conducción)
- veh_alertas_log (historial de alertas)
```

### Pruebas de Integración (Tarea 19)

**Checklist de validación:**
- [ ] Los endpoints retornan 200 OK con datos válidos
- [ ] Validación de placa funciona correctamente (ABC123 vs ABC12D)
- [ ] Lookup a Nómina Core resuelve nombres correctamente
- [ ] Cálculo de estado (Vigente/Por vencer/Vencido) es preciso
- [ ] Soft delete mantiene integridad referencial
- [ ] Alertas se envían correctamente vía SendGrid
- [ ] No hay regresiones en módulos existentes (ind_, soc_, epp_)
- [ ] Variables de entorno están documentadas en .env.example
- [ ] Tipos de TypeScript son correctos (no hay errores de compilación)

## 📝 Notas Técnicas

### Validación de Placas Colombianas
- **Automóviles/Camionetas/Camiones:** `ABC123` (3 letras + 3 números)
- **Motocicletas:** `ABC12D` (3 letras + 2 números + 1 letra)
- **Otros (Bicicletas, etc.):** Formato alfanumérico 4-8 caracteres

### Cálculo de Estado de Documentos
```typescript
// Vencido: diasRestantes < 0
// Por vencer: 0 <= diasRestantes <= 30
// Vigente: diasRestantes > 30
```

### Estado Consolidado del Vehículo
- **Crítico (🔴):** Al menos un documento/licencia vencido
- **Alerta (🟡):** Al menos un documento/licencia por vencer
- **OK (🟢):** Todos los documentos/licencias vigentes

### Integración con Nómina Core
- **No modificar** la base Personal (`appQYSeZ5F8D3acu5`)
- Solo lectura vía FK simbólica `ID_Personal_Core` (formato `SIRIUS-PER-XXXX`)
- Campos consumidos: Nombre completo, Área, Correo

### Sistema de Alertas
- **Frecuencia recomendada:** Cron diario a las 8:00 AM
- **Umbral de alerta:** 30 días antes del vencimiento
- **Anti-spam:** No enviar misma alerta en últimas 24 horas
- **Destinatarios:** Responsable SST + correo del colaborador (opcional)

## 🎯 Próximos Pasos Recomendados

1. **Completar endpoints de documentos** (tareas 7-8) — CRÍTICO
2. **Completar endpoints de licencias** (tareas 9-10)
3. **Implementar sistema de alertas** (tarea 11) — CRÍTICO
4. **Crear UI del panel principal** (tarea 13)
5. **Implementar formularios** (tareas 14-15)
6. **Integrar con dashboard** (tarea 17)
7. **Ejecutar pruebas de integración** (tarea 19)

## 🚀 Comandos de Desarrollo

```bash
# Compilar TypeScript
npx tsc --noEmit

# Desarrollo local
npm run dev

# Probar endpoint de listar vehículos
curl http://localhost:3000/api/sgsst/vehicular

# Probar registro de vehículo
curl -X POST http://localhost:3000/api/sgsst/vehicular/vehiculos \
  -H "Content-Type: application/json" \
  -d '{
    "idPersonalCore": "SIRIUS-PER-001",
    "placa": "ABC123",
    "tipoVehiculo": "Automóvil",
    "propietarioNombre": "Juan Pérez",
    "propietarioTipo": "Colaborador"
  }'
```

## 📊 Progreso General

- **Configuración:** 100% ✅
- **Endpoints Backend:** 46% (6/13) 🚧
- **UI Frontend:** 0% (0/5) ⏳
- **Documentación:** 50% (variables + config completas) 🚧
- **Testing:** 0% ⏳

**Completitud total del módulo:** ~32% (6/19 tareas)

---

**Responsable:** Claude Code  
**Última actualización:** 2026-06-26 (Tarea 7 en progreso)
