# 🧪 Guía Rápida de Testing - Flujo de Evaluación

**Última actualización:** 2026-06-10

---

## 🚀 Inicio Rápido

### 1. Levantar el servidor
```bash
npm run dev
```

### 2. Navegar a la inducción
```
http://localhost:3000/dashboard/inducciones
```

### 3. Seleccionar un colaborador y generar token
- Clic en "Ver detalles" de un registro de inducción
- Clic en "Generar Token de Firma"
- Se abre una nueva ventana con la URL de firma

---

## 🎯 Testing del Flujo Completo

### Pantalla 1: Información
- ✅ Verificar que se muestra: nombre, documento, cargo, tipo, fecha
- ✅ Clic en "Iniciar [Tipo de Inducción]"

### Pantalla 2: Contenido
- ✅ Verificar que se muestra el tipo de inducción
- ✅ Scroll hasta el final del contenido
- ✅ Clic en "Continuar a la Evaluación"

### Pantalla 3: Evaluación ⭐ NUEVA
#### Opción A: Testing Manual
1. Responder las 25 preguntas manualmente
2. Verificar preguntas 10, 11, 22 (nuevas versiones)
3. Clic en "Finalizar Evaluación"

#### Opción B: Testing Rápido (Recomendado) 🚀
1. **Ver los botones de testing** (amarillo y verde)
2. **Clic en [TEST] Aprobar y Continuar**
3. ✅ Se auto-completa y envía
4. ✅ Muestra "¡Evaluación Aprobada! 100%"
5. ✅ Espera 2 segundos
6. ✅ Avanza automáticamente a firma

#### Opción C: Testing Mixto
1. Clic en **[TEST] Auto-completar**
2. Navegar entre preguntas con Siguiente/Anterior
3. Verificar distribución de respuestas:
   - P10: 4 de 7 seleccionadas ✅
   - P11: 5 de 7 seleccionadas ✅
   - P22: 4 de 8 seleccionadas ✅
4. Clic manual en "Finalizar Evaluación"

### Pantalla 4: Firma
- ✅ Dibujar firma en el canvas
- ✅ Clic en "Confirmar Firma"
- ✅ Se envía la firma

### Pantalla 5: Constancia
- ✅ Completar campos del formulario:
  - Fecha de realización
  - Lugar de realización
  - Hora inicio / fin
  - Responsable SST
  - Temas tratados (textarea)
- ✅ Marcar checkbox de aceptación
- ✅ Clic en "Confirmar y Enviar Constancia"

### Pantalla 6: Éxito
- ✅ Mensaje de confirmación
- ✅ Opción de descargar certificado/constancia

---

## 🔍 Verificaciones Específicas

### Preguntas Nuevas (10, 11, 22)

#### Pregunta 10: Uso de EPP
**Texto:** "¿Cuáles de las siguientes afirmaciones sobre el uso de EPP son correctas?"

**Verificar auto-completado:**
- ✅ Es obligatorio usar el EPP asignado según el riesgo de mi labor
- ✅ Debo inspeccionar el estado del EPP antes de usarlo
- ✅ Si el EPP está dañado, debo reportarlo inmediatamente
- ✅ Debo mantener el EPP limpio y guardado correctamente
- ❌ Debo usar el EPP solo si lo considero necesario
- ❌ Puedo prestar mi EPP a compañeros si me lo solicitan
- ❌ El EPP es responsabilidad exclusiva de la empresa

**Total:** 4 de 7 ✅

#### Pregunta 11: Responsabilidades SST
**Texto:** "¿Cuáles son responsabilidades del trabajador en materia de SST?"

**Verificar auto-completado:**
- ✅ Informar condiciones inseguras que identifique
- ✅ Participar en las capacitaciones programadas
- ✅ Usar correctamente los EPP y herramientas
- ✅ Cuidar mi salud y la de mis compañeros
- ✅ Reportar accidentes e incidentes laborales
- ❌ Esperar a que SST solucione todos los problemas
- ❌ Cumplir las normas de seguridad solo cuando hay supervisión

**Total:** 5 de 7 ✅

#### Pregunta 22: Situaciones de Riesgo
**Texto:** "¿Cuáles de las siguientes acciones son correctas ante una situación de riesgo?"

**Verificar auto-completado:**
- ✅ Reportar la situación a mi supervisor o al área de SST
- ✅ Alertar a mis compañeros sobre el peligro
- ✅ Tomar medidas preventivas si está en mi capacidad
- ✅ Priorizar siempre la seguridad sobre la productividad
- ❌ Improvisar soluciones rápidas para ganar tiempo
- ❌ Seguir trabajando si el riesgo parece menor
- ❌ Ignorar el riesgo si no me afecta directamente
- ❌ Esperar instrucciones antes de actuar en emergencias

**Total:** 4 de 8 ✅

---

## 🐛 Problemas Conocidos y Soluciones

### ❌ Error: "idEmpleadoCore undefined"
**Solución:** Ya corregido en commit `063c856`
- El endpoint `/api/inducciones/token/[token]` ahora devuelve `idEmpleadoCore`

### ❌ Botones de test no aparecen
**Causa:** El servidor está en modo producción
**Verificar:** `process.env.NODE_ENV === "development"`
**Solución:** Ejecutar `npm run dev` (no `npm run build && npm start`)

### ❌ Error: "Datos incompletos" al enviar evaluación
**Causa:** Falta `plantillaId` o `idEmpleadoCore`
**Verificar en consola:**
```javascript
console.log('plantillaId:', plantilla?.id);
console.log('idEmpleadoCore:', idEmpleadoCore);
```

---

## 📊 Resultados Esperados

### Evaluación Aprobada
- **Puntaje:** Variable según respuestas (con botón test = 100%)
- **Mensaje:** "¡Evaluación Aprobada!"
- **Color:** Verde
- **Acción:** Avanza a firma después de 2 segundos

### Evaluación Reprobada
- **Puntaje:** Menor al mínimo requerido
- **Mensaje:** "Evaluación No Aprobada"
- **Color:** Rojo
- **Acción:** Muestra mensaje de error, debe repetir

---

## ⚡ Atajos de Teclado (para navegación)

En las preguntas:
- **Tab:** Mover entre opciones
- **Espacio:** Seleccionar/deseleccionar opción actual
- **Enter:** (en última pregunta) Enviar evaluación

En el canvas de firma:
- **Mouse/Touch:** Dibujar
- **Botón Borrar:** Limpiar canvas

---

## 📸 Screenshots Recomendados

Para documentar el testing, tomar capturas de:
1. ✅ Botones de test visibles (amarillo/verde)
2. ✅ Pregunta 10 con 4/7 seleccionadas
3. ✅ Pregunta 11 con 5/7 seleccionadas
4. ✅ Pregunta 22 con 4/8 seleccionadas
5. ✅ Pantalla "Evaluación Aprobada 100%"
6. ✅ Pantalla de firma
7. ✅ Formulario de constancia
8. ✅ Pantalla de éxito final

---

## 🔄 Testing de Regresión

Verificar que NO se rompió:
- ✅ Login y autenticación
- ✅ Dashboard de inducciones
- ✅ Generación de tokens
- ✅ Otras evaluaciones (no inducciones)
- ✅ Exportación de reportes
- ✅ Otros módulos del sistema

---

## 📝 Checklist de Testing

```
[ ] Servidor levantado con npm run dev
[ ] Navegado a dashboard de inducciones
[ ] Seleccionado colaborador
[ ] Generado token de firma
[ ] Abierta URL de firma en navegador
[ ] Verificada pantalla de información
[ ] Iniciada inducción
[ ] Visto contenido completo
[ ] Botones de test visibles en evaluación
[ ] Clic en [TEST] Aprobar y Continuar
[ ] Evaluación aprobada al 100%
[ ] Avance automático a firma
[ ] Dibujada y confirmada firma
[ ] Completado formulario de constancia
[ ] Enviada constancia
[ ] Mensaje de éxito mostrado
[ ] Token marcado como "Usado"
```

---

## 🚦 Estados del Token

| Estado | Descripción | Acción Permitida |
|--------|-------------|------------------|
| Activo | Recién generado | ✅ Puede firmar |
| Usado | Ya se firmó | ❌ Rechaza firma |
| Expirado | Pasó fecha límite | ❌ Rechaza firma |

---

## 🎓 Tips de Testing

1. **Usar token de prueba:** El token del log puede reutilizarse mientras esté "Activo"
2. **Limpiar cookies:** Si hay problemas de sesión, limpiar cookies del navegador
3. **Consola del navegador:** Revisar errores de JavaScript
4. **Network tab:** Verificar requests/responses del API
5. **React DevTools:** Inspeccionar estado de componentes

---

**¡Happy Testing!** 🎉
