# Conector MCP de Sirius SG-SST

Deja que Claude consulte y registre en SG-SST a nombre de quien se conecta, con
su nivel de acceso y nada más. Es el mismo diseño del conector de Sirius CRM.

## Dos formas de conectarse, las mismas herramientas

| | Remoto (equipo) | Local (desarrollo) |
|---|---|---|
| Dónde | `https://sirius-sg-sst.vercel.app/api/mcp` | proceso `node mcp/servidor.mjs` |
| Quién lo usa | cualquiera con usuario de SG-SST, desde claude.ai, Claude Desktop o el celular | quien desarrolla, contra `localhost` |
| Cómo entra | OAuth: documento y contraseña en la pantalla `/autorizar` | documento y contraseña del `.env.local` |
| Código | `src/app/api/mcp/route.ts` | `mcp/servidor.mjs` |

Las herramientas se definen una sola vez en `mcp/modulos/*.mjs` y las sirve
`mcp/servidor-comun.mjs` a los dos transportes.

### Conectarlo en claude.ai

1. claude.ai → Configuración → Conectores → **Agregar conector personalizado**.
2. URL: `https://sirius-sg-sst.vercel.app/api/mcp`. Nada más: Claude se registra solo.
3. Se abre la pantalla de SG-SST: número de documento, contraseña y, si se
   quiere, la casilla «Permitir que también registre». Sin marcarla, el
   conector solo consulta y las herramientas que registran ni aparecen.

Queda disponible en la app del celular y en Claude Desktop con la misma cuenta.

### Conectarlo en local (Claude Code)

En `.env.local` de la raíz:

```bash
SGSST_MCP_URL=http://localhost:3000      # o la URL de producción
SGSST_MCP_DOCUMENTO=1234567890
SGSST_MCP_PASSWORD=...
SGSST_MCP_SOLO_LECTURA=1                 # opcional
```

```bash
claude mcp add sirius-sgsst --scope user -- node C:/ruta/a/sirius-sg-sst/mcp/servidor.mjs
```

## Cómo funciona

```
claude.ai ──Bearer (OAuth)──▶ /api/mcp ──relee a la persona en Airtable──▶ JWT de sesión
                                  │
                                  └──▶ herramientas ──HTTP + JWT──▶ /api/* (las mismas rutas del dashboard)
```

- **OAuth sin base de datos** (`src/lib/mcp/oauth.ts`). El `client_id`, el
  código y los tokens son JWT firmados con claves derivadas (HKDF) de
  `JWT_SECRET`, una por uso. Código: 60 s. Acceso: 1 h. Refresco: 30 días,
  rotado. PKCE S256 obligatorio. Registro dinámico (RFC 7591), metadatos
  (RFC 8414 y 9728) y recurso atado al token (RFC 8707).
- **La identidad se relee en cada llamada.** El token solo lleva el número de
  documento. `/api/mcp` vuelve a leer a la persona (`resolverUsuarioActivo`):
  tiene que existir, estar activa y tener acceso a la app SG-SST. Con eso firma
  un JWT de sesión igual al del login, con el nivel de hoy.
- **El techo es la API.** Las herramientas no tocan Airtable: llaman las mismas
  rutas que el dashboard, que pasan por `src/proxy.ts` (sesión obligatoria) y
  por sus propias validaciones.
- **Sin estado.** Cada petición arma el servidor y lo cierra; respuestas JSON,
  no SSE. Así funciona en las lambdas de Vercel.

### Cortar el acceso

- Quitar el conector en Claude.
- Inactivar a la persona o quitarle el acceso a SG-SST en Sirius Nómina Core:
  la siguiente llamada ya falla. **Cambiar la contraseña no basta**: el token
  sigue vivo hasta que vence (1 h) y el de refresco hasta 30 días.
- Rotar `JWT_SECRET` invalida todos los tokens y todas las sesiones del dashboard.

## Herramientas

`npm run mcp:diagnostico` las lista. Hoy son 31: 24 de consulta y 7 que registran.

| Módulo | Consulta | Registra (solo con permiso) |
|---|---|---|
| General | `sgsst_quien_soy`, `sgsst_buscar_trabajador`, `sgsst_informe_mensual` | — |
| Accidentes | listar accidentes, detalle, reportes, acciones, indicadores | registrar/actualizar accidente, registrar/actualizar reporte, registrar/actualizar acción |
| Medicina laboral | listar registros, indicadores | — |
| Inspecciones | listar, detalle (EPP, áreas, equipos), catálogo de equipos de emergencia | — |
| EPP | inventario, entregas | registrar entrega |
| Capacitaciones | plan anual, realizadas, asistencia, resultados de evaluaciones | — |
| Organización | políticas y firmas, actas y compromisos de comités, miembros, inducciones | — |

Reglas que siguen todas:

- **No adivinan.** Trabajadores, EPP y registros se nombran en español
  corriente (nombre, documento, `SIRIUS-PER-0016`, `AT-2026-001`); si hay más
  de un candidato, la herramienta los lista y pide precisar.
- **No exponen lo que no hace falta**: ni firmas, ni tokens de firma, ni
  cédulas en listados, ni el detalle de quejas de acoso del COCOLAB.
- **Las reglas de negocio quedan en la API.** La única que se adelanta es el
  stock al registrar una entrega de EPP, que el dashboard también verifica.

### Lo que todavía no registra, y por qué

- **Inspecciones de botiquín, extintor, camilla y kit.** La API escribe
  valores que no existen en los selects de Airtable (estado `Firmada`,
  `estadoElemento: Faltante`, criterios `Cumple/No cumple` del extintor, tipos
  de responsable). Camilla y kit fallan siempre. Hay que alinear el módulo
  antes de exponerlo.
- **Asistencia a capacitaciones.** El flujo carga a todo el personal y la
  asistencia la confirma la firma de cada quien; un reintento duplica el evento.
- **Medicina laboral.** Son datos de salud; se dejó en consulta a propósito.

## Pruebas

```bash
npm run mcp:diagnostico               # registra las herramientas, sin red
npm run mcp:diagnostico -- --red      # además entra con las credenciales del .env.local
npm run mcp:probar-oauth              # flujo OAuth completo contra localhost:3000
node mcp/probar-oauth.mjs https://sirius-sg-sst.vercel.app
npm run check:mcp                     # catálogos copiados vs. los de la app
```

`probar-oauth` firma el código de autorización con `JWT_SECRET` del
`.env.local`, así que contra producción solo sirve si es el mismo secreto.

## Notas de despliegue

- `maxDuration = 60` en `/api/mcp`: el informe mensual tarda varios segundos.
- Si se activa Deployment Protection en Vercel, el dominio de producción tiene
  que quedar fuera: `/api/mcp` se llama a sí mismo por HTTP.
- Límite de intentos en `/autorizar`: 8 por documento y 30 por IP cada 10
  minutos. Sin `UPSTASH_REDIS_REST_URL`/`_TOKEN` el contador vive en memoria
  de cada instancia.
