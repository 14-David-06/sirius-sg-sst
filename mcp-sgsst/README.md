# MCP Server - Sirius SG-SST

Model Context Protocol (MCP) server para el Sistema de Gestión de Seguridad y Salud en el Trabajo de Sirius Regenerative Solutions.

Este servidor MCP expone todas las funcionalidades del sistema SGSST a través de herramientas que pueden ser utilizadas por agentes de inteligencia artificial, permitiendo que la IA gestione completamente el sistema de seguridad y salud en el trabajo.

## 🎯 Características

- ✅ **35+ herramientas** organizadas por módulos
- 🔐 **Autenticación completa** con validación de sesión
- 👥 **Gestión de personal** con integración a Nómina Core
- 📚 **Capacitaciones y evaluaciones** completas
- 🦺 **Inventario de EPP** con movimientos y entregas
- 🔍 **7 tipos de inspecciones** (EPP, áreas, equipos, emergencia)
- 🏥 **Medicina laboral** (exámenes, incapacidades, seguimientos)
- ⚠️ **Accidentes e incidentes** con investigaciones
- 📋 **Comités** (COPASST y COCOLAB)
- 📄 **Políticas empresariales**
- 📊 **Informes mensuales** de gestión SST

## 📦 Instalación

### Requisitos previos

- Node.js 18+ (recomendado 20+)
- Sistema SGSST corriendo (local o remoto)
- Acceso a las variables de entorno necesarias

### Instalación paso a paso

```bash
# 1. Navegar al directorio del MCP
cd mcp-sgsst

# 2. Instalar dependencias
npm install

# 3. Copiar el archivo de configuración
cp .env.example .env

# 4. Editar .env con tu configuración
# (ver sección de Configuración abajo)

# 5. Compilar el proyecto
npm run build

# 6. Probar el servidor
npm run dev
```

## ⚙️ Configuración

### Variables de entorno

Crear un archivo `.env` en la raíz del proyecto con:

```bash
# Configuración del servidor SGSST
SGSST_API_URL=http://localhost:3000
SGSST_API_TIMEOUT=30000

# Credenciales de autenticación (opcional)
# Si se configuran, el MCP iniciará sesión automáticamente
SGSST_DEFAULT_USER_EMAIL=admin@empresa.com
SGSST_DEFAULT_USER_PASSWORD=tu_password

# Configuración de Nómina Core para validación
# Si no está configurada, la validación de empleados no estará disponible
NOMINA_CORE_API_URL=https://nomina.empresa.com/api
NOMINA_CORE_API_KEY=tu_api_key

# Configuración de logs
LOG_LEVEL=info  # debug, info, warn, error
```

### Configuración en Claude Desktop

Para usar este MCP con Claude Desktop, agregar a `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sirius-sgsst": {
      "command": "node",
      "args": [
        "C:\\ruta\\completa\\a\\mcp-sgsst\\dist\\index.js"
      ],
      "env": {
        "SGSST_API_URL": "http://localhost:3000",
        "SGSST_API_TIMEOUT": "30000",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Configuración en Claude Code

Para usar este MCP con Claude Code CLI:

```bash
# Disponible en todos tus proyectos (usar ruta absoluta)
claude mcp add sirius-sgsst --scope user \
  -e SGSST_API_URL=http://localhost:3000 \
  -- node C:/ruta/completa/a/mcp-sgsst/dist/index.js

# Verificar
claude mcp list
```

Dentro de una sesión, `/mcp` muestra el estado del servidor y sus herramientas.

## 🛠️ Herramientas Disponibles

### 🔐 Autenticación (5 herramientas)

| Herramienta | Descripción |
|-------------|-------------|
| `sgsst_verificar_usuario` | Verifica si un usuario existe (paso 1) |
| `sgsst_crear_password` | Crea contraseña para usuario nuevo |
| `sgsst_iniciar_sesion` | Inicia sesión en el sistema |
| `sgsst_obtener_sesion` | Obtiene información de sesión actual |
| `sgsst_cerrar_sesion` | Cierra la sesión actual |

### 👥 Personal (3 herramientas)

| Herramienta | Descripción |
|-------------|-------------|
| `sgsst_listar_personal` | Lista empleados con filtros |
| `sgsst_buscar_personal` | Busca empleado por documento |
| `sgsst_validar_personal_nomina` | Valida empleado en Nómina Core |

### 📚 Capacitaciones y Evaluaciones (5 herramientas)

| Herramienta | Descripción |
|-------------|-------------|
| `sgsst_listar_capacitaciones` | Lista catálogo de capacitaciones |
| `sgsst_listar_eventos_capacitacion` | Lista eventos programados |
| `sgsst_registrar_asistencia` | Registra asistencia a evento |
| `sgsst_listar_evaluaciones` | Lista evaluaciones aplicadas |
| `sgsst_responder_evaluacion` | Responde una evaluación |

### 🦺 Inventario EPP (3 herramientas)

| Herramienta | Descripción |
|-------------|-------------|
| `sgsst_listar_inventario_epp` | Lista inventario de EPP |
| `sgsst_registrar_movimiento_epp` | Registra ingreso/salida/ajuste |
| `sgsst_registrar_entrega_epp` | Registra entrega a empleado |

### 🔍 Inspecciones (2 herramientas)

| Herramienta | Descripción |
|-------------|-------------|
| `sgsst_listar_inspecciones` | Lista inspecciones por tipo |
| `sgsst_registrar_inspeccion` | Registra nueva inspección |

**Tipos de inspección soportados:**
- EPP (Elementos de Protección Personal)
- AREAS (Áreas físicas)
- EQUIPOS (Equipos de emergencia general)
- BOTIQUIN (Botiquines)
- EXTINTOR (Extintores)
- CAMILLA (Camillas)
- KIT_DERRAMES (Kits de derrames)

### 🏥 Medicina Laboral (2 herramientas)

| Herramienta | Descripción |
|-------------|-------------|
| `sgsst_listar_examenes_ocupacionales` | Lista exámenes realizados |
| `sgsst_listar_incapacidades` | Lista incapacidades registradas |

### ⚠️ Accidentes e Incidentes (2 herramientas)

| Herramienta | Descripción |
|-------------|-------------|
| `sgsst_listar_accidentes_incidentes` | Lista eventos registrados |
| `sgsst_registrar_accidente` | Registra nuevo accidente/incidente |

### 📋 Comités (1 herramienta)

| Herramienta | Descripción |
|-------------|-------------|
| `sgsst_listar_actas_comite` | Lista actas COPASST/COCOLAB |

### 📄 Políticas (1 herramienta)

| Herramienta | Descripción |
|-------------|-------------|
| `sgsst_listar_politicas` | Lista políticas empresariales |

### 📊 Informes (1 herramienta)

| Herramienta | Descripción |
|-------------|-------------|
| `sgsst_obtener_informe_mensual` | Obtiene informe mensual de gestión SST |

## 📝 Ejemplos de Uso

### Ejemplo 1: Autenticación

```typescript
// 1. Verificar usuario
{
  "tool": "sgsst_verificar_usuario",
  "args": {
    "numeroDocumento": "1234567890"
  }
}

// 2. Iniciar sesión
{
  "tool": "sgsst_iniciar_sesion",
  "args": {
    "numeroDocumento": "1234567890",
    "password": "mi_password"
  }
}

// 3. Verificar sesión
{
  "tool": "sgsst_obtener_sesion",
  "args": {}
}
```

### Ejemplo 2: Registrar entrega de EPP

```typescript
{
  "tool": "sgsst_registrar_entrega_epp",
  "args": {
    "empleadoId": "1234567890",
    "tipo": "EPP",
    "insumos": [
      { "insumoId": "rec123", "cantidad": 1 },
      { "insumoId": "rec456", "cantidad": 2 }
    ],
    "fecha": "2026-11-04"
  }
}
```

### Ejemplo 3: Registrar inspección de área

```typescript
{
  "tool": "sgsst_registrar_inspeccion",
  "args": {
    "tipo": "AREAS",
    "fecha": "2026-11-04",
    "datos": {
      "area": "Almacén",
      "categoria": "Orden y Aseo",
      "criterios": [
        {
          "criterio": "Pisos limpios",
          "cumple": true
        },
        {
          "criterio": "Señalización visible",
          "cumple": false,
          "accionCorrectiva": "Instalar señales de seguridad"
        }
      ]
    },
    "responsable": "Juan Pérez"
  }
}
```

### Ejemplo 4: Registrar accidente

```typescript
{
  "tool": "sgsst_registrar_accidente",
  "args": {
    "tipo": "ACCIDENTE",
    "empleadoId": "1234567890",
    "fecha": "2026-11-04",
    "descripcion": "Caída al mismo nivel en área de producción",
    "lugar": "Planta de producción - Sección A",
    "gravedad": "LEVE"
  }
}
```

### Ejemplo 5: Obtener informe mensual

```typescript
{
  "tool": "sgsst_obtener_informe_mensual",
  "args": {
    "mes": 10,
    "anio": 2026
  }
}
```

## 🔄 Flujos de Trabajo Comunes

### Flujo 1: Inducción completa de empleado nuevo

1. **Verificar empleado en Nómina Core**
   ```typescript
   sgsst_validar_personal_nomina({ numeroDocumento: "1234567890" })
   ```

2. **Crear usuario en SGSST**
   ```typescript
   sgsst_verificar_usuario({ numeroDocumento: "1234567890" })
   sgsst_crear_password({ numeroDocumento: "1234567890", password: "..." })
   ```

3. **Registrar examen de ingreso**
   (Usar API directamente o herramienta específica cuando esté disponible)

4. **Entregar EPP inicial**
   ```typescript
   sgsst_registrar_entrega_epp({
     empleadoId: "1234567890",
     tipo: "EPP",
     insumos: [...]
   })
   ```

### Flujo 2: Evento de capacitación completo

1. **Crear evento de capacitación**
   (Usar API directamente)

2. **Registrar asistentes**
   ```typescript
   sgsst_registrar_asistencia({
     eventoId: "recXXX",
     asistentes: ["emp1", "emp2", "emp3"]
   })
   ```

3. **Aplicar evaluación**
   ```typescript
   sgsst_responder_evaluacion({
     evaluacionId: "recYYY",
     respuestas: [...]
   })
   ```

### Flujo 3: Ciclo mensual de gestión SST

1. **Ejecutar inspecciones del mes**
   ```typescript
   sgsst_registrar_inspeccion({ tipo: "AREAS", ... })
   sgsst_registrar_inspeccion({ tipo: "EQUIPOS", ... })
   sgsst_registrar_inspeccion({ tipo: "BOTIQUIN", ... })
   ```

2. **Revisar accidentalidad**
   ```typescript
   sgsst_listar_accidentes_incidentes({
     desde: "2026-10-01",
     hasta: "2026-10-31"
   })
   ```

3. **Generar informe mensual**
   ```typescript
   sgsst_obtener_informe_mensual({ mes: 10, anio: 2026 })
   ```

## 🧪 Pruebas

```bash
# Ejecutar todas las pruebas
npm run test

# El script de prueba valida:
# - Conexión con el servidor SGSST
# - Autenticación
# - Cada herramienta principal
# - Flujos de trabajo comunes
```

## 🐛 Depuración

### Logs detallados

```bash
# Configurar nivel de log en .env
LOG_LEVEL=debug

# Los logs mostrarán:
# - Herramientas ejecutadas
# - Argumentos recibidos
# - Respuestas de la API
# - Errores detallados
```

### Problemas comunes

**Error: "Debe autenticarse primero"**
- Solución: Ejecutar `sgsst_iniciar_sesion` primero

**Error: "Timeout: La petición tardó más de 30000ms"**
- Solución: Aumentar `SGSST_API_TIMEOUT` en `.env`

**Error: "Validación con Nómina Core no configurada"**
- Solución: Configurar `NOMINA_CORE_API_URL` y `NOMINA_CORE_API_KEY`

**Error: Connection refused**
- Solución: Verificar que el servidor SGSST esté corriendo en `SGSST_API_URL`

## 📚 Arquitectura

```
mcp-sgsst/
├── src/
│   ├── index.ts                    # Punto de entrada principal
│   ├── config.ts                   # Configuración y logger
│   ├── types.ts                    # Tipos TypeScript compartidos
│   ├── utils/
│   │   ├── http-client.ts          # Cliente HTTP con sesión
│   │   ├── validation.ts           # Validaciones comunes
│   │   └── formatters.ts           # Formateo de datos
│   └── tools/
│       ├── auth.ts                 # Herramientas de autenticación
│       ├── personal.ts             # Herramientas de personal
│       ├── capacitaciones.ts       # Capacitaciones y evaluaciones
│       ├── inventario-inspecciones.ts # Inventario e inspecciones
│       └── modulos-avanzados.ts    # Medicina, accidentes, informes
├── test/
│   └── test-tools.ts               # Suite de pruebas
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔒 Seguridad

- ✅ Todas las herramientas requieren autenticación (excepto las de autenticación mismas)
- ✅ Las contraseñas nunca se almacenan en logs
- ✅ Los tokens de sesión se manejan en memoria
- ✅ Validación de entrada en todas las herramientas
- ✅ Sanitización de strings para prevenir inyecciones
- ✅ Timeouts configurables para prevenir DoS

## 📄 Licencia

Propietario - Sirius Regenerative Solutions  
Ver LICENSE para más detalles.

## 👥 Autor

Hermes David Hernández García  
Sirius Regenerative Solutions

## 🤝 Contribuir

Este es un proyecto interno. Para mejoras o reportar problemas, contactar al equipo de desarrollo.

## 📞 Soporte

Para soporte técnico, contactar a:
- Email: soporte@siriusregenerative.com
- Sistema de tickets interno

---

**Versión:** 1.0.0  
**Última actualización:** Noviembre 2026
