# Cambios en Preguntas de Evaluación de Inducción

**Fecha:** 2026-06-10  
**Archivo modificado:** `src/app/api/inducciones/evaluacion/route.ts`

## Resumen

Se modificaron 3 preguntas declarativas (no califican, puntaje = 0) de la evaluación de inducción para hacerlas más generales y aplicables a diferentes contextos laborales.

---

## Pregunta 10 (pp10)

### ❌ Versión Anterior
**Texto:** "Identifique los Elementos de Protección Personal (EPP) presentados en la inducción (pregunta declarativa):"

**Opciones:** 17 EPP específicos (Casco de seguridad, Gafas de seguridad, Monogafas, Careta facial, etc.)

**Problema:** Muy específica, requiere listar EPP exactos mencionados en la inducción

### ✅ Versión Nueva (FINAL)
**Texto:** "¿Cuáles de las siguientes afirmaciones sobre el uso de EPP son correctas? (pregunta declarativa):"

**Opciones:** 7 afirmaciones (4 correctas ✓, 3 incorrectas ✗)
- ✗ Debo usar el EPP solo si lo considero necesario
- ✓ Es obligatorio usar el EPP asignado según el riesgo de mi labor
- ✗ Puedo prestar mi EPP a compañeros si me lo solicitan
- ✓ Debo inspeccionar el estado del EPP antes de usarlo
- ✓ Si el EPP está dañado, debo reportarlo inmediatamente
- ✗ El EPP es responsabilidad exclusiva de la empresa
- ✓ Debo mantener el EPP limpio y guardado correctamente

**Ventaja:** Requiere análisis crítico, no solo marcar todo. Evalúa comprensión real del uso responsable de EPP

---

## Pregunta 11 (pp11)

### ❌ Versión Anterior
**Texto:** "Clases de riesgos identificadas en SST (pregunta declarativa):"

**Opciones:** 6 tipos de riesgos específicos (Riesgo físico, Riesgo químico, Riesgo biológico, etc.)

**Problema:** Lista técnica de clasificación de riesgos, muy específica

### ✅ Versión Nueva (FINAL)
**Texto:** "¿Cuáles son responsabilidades del trabajador en materia de SST? (pregunta declarativa):"

**Opciones:** 7 afirmaciones (5 correctas ✓, 2 incorrectas ✗)
- ✓ Informar condiciones inseguras que identifique
- ✗ Esperar a que SST solucione todos los problemas
- ✓ Participar en las capacitaciones programadas
- ✓ Usar correctamente los EPP y herramientas
- ✗ Cumplir las normas de seguridad solo cuando hay supervisión
- ✓ Cuidar mi salud y la de mis compañeros
- ✓ Reportar accidentes e incidentes laborales

**Ventaja:** Evalúa comprensión de responsabilidades activas vs pasivas del trabajador en SST

---

## Pregunta 22 (pp22)

### ❌ Versión Anterior
**Texto:** "Identifique peligros presentes en actividades laborales (pregunta declarativa):"

**Opciones:** 14 peligros específicos (Pisos húmedos, Cables expuestos, Ruido excesivo, etc.)

**Problema:** Lista muy específica de peligros, puede variar según el contexto

### ✅ Versión Nueva (FINAL)
**Texto:** "¿Cuáles de las siguientes acciones son correctas ante una situación de riesgo? (pregunta declarativa):"

**Opciones:** 8 afirmaciones (4 correctas ✓, 4 incorrectas ✗)
- ✗ Improvisar soluciones rápidas para ganar tiempo
- ✓ Reportar la situación a mi supervisor o al área de SST
- ✗ Seguir trabajando si el riesgo parece menor
- ✓ Alertar a mis compañeros sobre el peligro
- ✓ Tomar medidas preventivas si está en mi capacidad
- ✗ Ignorar el riesgo si no me afecta directamente
- ✗ Esperar instrucciones antes de actuar en emergencias
- ✓ Priorizar siempre la seguridad sobre la productividad

**Ventaja:** Evalúa juicio crítico ante situaciones de riesgo, diferenciando acciones correctas de incorrectas

---

## Características Mantenidas

- ✅ Todas siguen siendo preguntas declarativas (`puntajeAsignado: 0`)
- ✅ Todas siguen siendo obligatorias
- ✅ Todas siguen siendo de tipo "Selección Múltiple"
- ✅ Todas las opciones deben seleccionarse para respuesta correcta (separadas por `|`)
- ✅ Mantienen sus IDs originales (pp10, pp11, pp22)
- ✅ Mantienen su orden en la evaluación (10, 11, 22)

---

## Impacto

- **Compatibilidad:** Los cambios no afectan la lógica de evaluación (siguen siendo declarativas)
- **Generalización:** Las preguntas ahora son más universales y menos dependientes de contenido específico de la inducción
- **Educación:** Enfoque en comprensión real vs memorización de listas
- **Pensamiento crítico:** Requieren que el usuario analice cada opción en lugar de marcar todo
- **Distribución balanceada:** Cada pregunta tiene ~50% opciones correctas y ~50% incorrectas
- **Mantenimiento:** Menos necesidad de actualizar preguntas cuando cambia el contenido de la inducción

## Mejora Clave vs Primera Versión

**Problema detectado:** La primera versión reformulada tenía TODAS las opciones como correctas, lo que hacía obvio que había que seleccionar todo sin pensar.

**Solución aplicada:** Se incluyeron afirmaciones incorrectas estratégicamente diseñadas para:
- Identificar malas prácticas comunes
- Evaluar comprensión real de responsabilidades
- Diferenciar entre actitudes proactivas vs pasivas
- Detectar comprensión de prioridades (seguridad > productividad)

---

## Próximos Pasos Recomendados

1. **Revisar contenido de la inducción** para asegurar que cubre los temas de las nuevas preguntas
2. **Actualizar material de inducción** si es necesario para alinear con las nuevas preguntas
3. **Probar evaluación** con usuarios reales para validar claridad de las nuevas preguntas
4. **Considerar actualizar otras preguntas declarativas** (13, 15, 23, 24) siguiendo este mismo enfoque

---

**Nota:** Las preguntas mantienen su carácter declarativo (no calificable) según el diseño original de la evaluación.
