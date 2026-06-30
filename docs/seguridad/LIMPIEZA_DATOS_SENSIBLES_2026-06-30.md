# Limpieza de Datos Sensibles - 2026-06-30

## 🔒 Acciones Tomadas

### 1. Documentación Limpiada

**Archivo:** `docs/modulos/vehicular/FIX_DATOS_VACIOS.md`

**Removido:**
- ❌ Field IDs de Airtable (valores tipo `fldXXXXXXXXXXXXX`)
- ❌ Configuración explícita con valores sensibles

**Reemplazado con:**
- ✅ Referencias a scripts de descubrimiento
- ✅ Instrucciones para obtener Field IDs de forma segura
- ✅ Documentación general sin exponer configuración

### 2. Scripts Mejorados

**Archivo:** `scripts/diagnostico-vehicular.js`

**Cambio:**
```javascript
// ANTES: Mostraba primeros 20 caracteres de tokens/IDs
log(`✓ ${name}: ${value.substring(0, 20)}...`, 'green');

// DESPUÉS: Solo confirma que están definidas
log(`✓ ${name}: [definida]`, 'green');
```

**Beneficio:** El output del script ya no expone fragmentos de tokens o IDs.

### 3. Documentación de Seguridad Agregada

**Archivo:** `scripts/README.md`

**Agregado:**
- ⚠️ Advertencia de seguridad al inicio
- 📝 Lista de tipos de datos sensibles que pueden aparecer
- ✅ Instrucciones para limpiar outputs antes de compartir

**Archivos marcados como sensibles:**
- `diagnostico-vehicular.js`
- `descubrir-fields-vehicular.js`

### 4. .gitignore Actualizado

**Archivo:** `.gitignore`

**Agregado:**
```gitignore
# script outputs (pueden contener datos sensibles)
scripts/output/
scripts/*.log
scripts/*-output.txt
scripts/*-diagnostico.txt
*-field-ids.json
```

**Previene:** Commits accidentales de outputs de scripts con datos sensibles.

## 📋 Tipos de Datos Considerados Sensibles

### Nivel Alto (NUNCA compartir)
- 🔴 Tokens de API (Airtable, AWS, SendGrid, OpenAI)
- 🔴 Secrets y claves de cifrado
- 🔴 Contraseñas o hashes de contraseñas
- 🔴 Números de documento/cédula completos

### Nivel Medio (Compartir con precaución)
- 🟡 Field IDs de Airtable (si se combinan con Base IDs, permiten acceso directo)
- 🟡 Base IDs y Table IDs de Airtable
- 🟡 Nombres completos de colaboradores
- 🟡 Números de placa de vehículos
- 🟡 Emails corporativos

### Nivel Bajo (OK para documentación interna)
- 🟢 Nombres de campos (sin IDs)
- 🟢 Estructuras de datos generales
- 🟢 Estadísticas agregadas sin identificadores

## 🛡️ Mejores Prácticas

### Al Documentar Problemas

**❌ MAL:**
```markdown
El campo AIRTABLE_VEH_VEH_ID=fldEdoBVkU6kaARie está mal configurado
```

**✅ BIEN:**
```markdown
El campo AIRTABLE_VEH_VEH_ID tiene el mismo valor que ID_PERSONAL_CORE.
Ejecuta `node scripts/descubrir-fields-vehicular.js` para obtener los IDs correctos.
```

### Al Compartir Output de Scripts

**❌ MAL:**
```bash
# Copiar y pegar todo el output directamente
node scripts/diagnostico-vehicular.js > issue.txt
```

**✅ BIEN:**
```bash
# Ejecutar localmente, revisar output, y solo compartir:
# - Tipo de error encontrado
# - Estadísticas generales (conteos, porcentajes)
# - Mensajes de error (sin tokens/IDs)
```

### Al Crear Scripts Nuevos

**✅ CHECKLIST:**
- [ ] ¿El script usa `process.env` en lugar de valores hardcodeados?
- [ ] ¿El output oculta tokens/IDs (substring o [redacted])?
- [ ] ¿Está documentado en `scripts/README.md` con advertencia de seguridad?
- [ ] ¿Los outputs van a carpeta ignorada por git?

## 🔍 Auditoría Futura

### Verificar Periódicamente

```bash
# Buscar posibles tokens hardcodeados
grep -r "pat[A-Za-z0-9]\{20,\}" src/ docs/ scripts/

# Buscar Base IDs hardcodeados
grep -r "app[A-Za-z0-9]\{14,\}" src/ docs/ scripts/

# Buscar Field IDs hardcodeados en docs
grep -r "fld[A-Za-z0-9]\{14,\}" docs/

# Revisar commits recientes por datos sensibles
git log --all -p --full-diff | grep -E "pat[A-Za-z0-9]{20,}|app[A-Za-z0-9]{14,}"
```

### Herramientas Recomendadas

- **git-secrets** - Pre-commit hook para detectar secrets
- **truffleHog** - Escanear historial de Git
- **gitleaks** - Detectar secrets en commits

## 📚 Referencias

- [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Airtable Security Best Practices](https://support.airtable.com/docs/airtable-security-guide)

---

**Fecha:** 2026-06-30  
**Revisado por:** Claude Code  
**Próxima revisión:** Cada vez que se agreguen nuevos scripts o documentación
