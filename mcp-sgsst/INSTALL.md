# Guía de Instalación Rápida - MCP SGSST

## Prerrequisitos

- ✅ Node.js 18+ instalado
- ✅ Sistema SGSST corriendo (local o remoto)
- ✅ Acceso a credenciales de administrador

## Instalación en 5 pasos

### 1. Instalar dependencias

```bash
cd mcp-sgsst
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar plantilla
cp .env.example .env

# Editar con tu editor favorito
code .env  # O notepad .env en Windows
```

**Configuración mínima:**
```bash
SGSST_API_URL=http://localhost:3000
SGSST_API_TIMEOUT=30000
LOG_LEVEL=info
```

**Configuración completa (recomendada):**
```bash
SGSST_API_URL=http://localhost:3000
SGSST_API_TIMEOUT=30000
SGSST_DEFAULT_USER_EMAIL=admin@empresa.com
SGSST_DEFAULT_USER_PASSWORD=tu_password
NOMINA_CORE_API_URL=https://nomina.empresa.com/api
NOMINA_CORE_API_KEY=tu_api_key
LOG_LEVEL=info
```

### 3. Compilar el proyecto

```bash
npm run build
```

Verás una salida como:
```
> @sirius/mcp-sgsst@1.0.0 build
> tsc

✓ Compilación exitosa
```

### 4. Probar el servidor

```bash
npm run test
```

Si todo está bien, verás:
```
🧪 PRUEBAS MCP SGSST
============================================================
🔌 Prueba de Conexión
============================================================
✓ Conexión con servidor SGSST

...

✅ ¡Todas las pruebas pasaron!
```

### 5. Configurar en Claude Desktop

#### Opción A: Windows

1. Abrir el archivo de configuración:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Agregar la siguiente configuración:
   ```json
   {
     "mcpServers": {
       "sirius-sgsst": {
         "command": "node",
         "args": [
           "C:\\Users\\TU_USUARIO\\Developer\\sirius-sg-sst\\mcp-sgsst\\dist\\index.js"
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

3. **Importante:** Reemplazar `C:\\Users\\TU_USUARIO\\` con tu ruta real

#### Opción B: macOS/Linux

1. Abrir el archivo de configuración:
   ```
   ~/.config/claude/claude_desktop_config.json
   ```

2. Agregar la siguiente configuración:
   ```json
   {
     "mcpServers": {
       "sirius-sgsst": {
         "command": "node",
         "args": [
           "/Users/TU_USUARIO/Developer/sirius-sg-sst/mcp-sgsst/dist/index.js"
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

### 6. Reiniciar Claude Desktop

- Cerrar completamente Claude Desktop
- Abrir nuevamente
- Verificar que el MCP esté cargado (aparecerá un icono de herramientas)

## Verificación

En Claude Desktop, prueba con:

```
¿Puedes listar las capacitaciones disponibles en el sistema SGSST?
```

Si Claude responde con datos del sistema, ¡la instalación fue exitosa! 🎉

## Solución de Problemas

### Error: "Module not found"

```bash
# Reinstalar dependencias
rm -rf node_modules
npm install
npm run build
```

### Error: "Connection refused"

1. Verificar que el servidor SGSST esté corriendo:
   ```bash
   curl http://localhost:3000/api/capacitaciones
   ```

2. Si no responde, iniciar el servidor SGSST:
   ```bash
   cd ..
   npm run dev
   ```

### Error: "Debe autenticarse primero"

Agregar credenciales a `.env`:
```bash
SGSST_DEFAULT_USER_EMAIL=admin@empresa.com
SGSST_DEFAULT_USER_PASSWORD=tu_password
```

### El MCP no aparece en Claude Desktop

1. Verificar que la ruta en `claude_desktop_config.json` sea correcta
2. Verificar que el archivo `dist/index.js` exista
3. Revisar los logs de Claude Desktop:
   - Windows: `%APPDATA%\Claude\logs\`
   - macOS/Linux: `~/.config/claude/logs/`

### Problemas de permisos en Windows

Ejecutar PowerShell como Administrador y configurar:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Actualización

Para actualizar el MCP después de cambios:

```bash
cd mcp-sgsst
git pull  # Si está en control de versiones
npm install
npm run build
```

Luego reiniciar Claude Desktop.

## Desinstalación

1. Eliminar la entrada `sirius-sgsst` de `claude_desktop_config.json`
2. Reiniciar Claude Desktop
3. (Opcional) Eliminar el directorio `mcp-sgsst`

## Soporte

¿Problemas? Contactar a:
- Email: soporte@siriusregenerative.com
- Documentación completa: Ver [README.md](README.md)
