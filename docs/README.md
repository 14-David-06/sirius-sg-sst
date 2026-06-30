# Documentación — Sirius SG-SST

Índice de toda la documentación técnica del proyecto, organizada por categoría.

---

## 📁 Estructura

```
docs/
├── analisis/        Análisis técnicos de módulos y requerimientos
├── estado/          Estado del proyecto y changelogs
├── fixes/           Diagnósticos y correcciones de bugs
├── guias/           Guías paso a paso para configuración manual
├── implementacion/  Guías de implementación de nuevas funcionalidades
├── modulos/         🆕 Documentación específica por módulo del sistema
│   ├── vehicular/           Seguimiento vehicular (SOAT, tecnomecánica, licencias)
│   ├── politicas/           Políticas empresariales y firmas
│   ├── sociodemografico/    Perfiles sociodemográficos de colaboradores
│   ├── inducciones/         Inducciones con certificados y evaluaciones
│   └── evaluaciones/        Sistema de evaluaciones post-capacitación
├── pruebas/         Planes y datos de prueba
├── scripts-utilidad/ Scripts de testing y utilidad
└── seguridad/       Auditorías y controles de seguridad
```

---

## 🔍 Análisis

| Archivo | Descripción |
|---------|-------------|
| [ANALISIS_ASISTENCIA_COMITES.md](analisis/ANALISIS_ASISTENCIA_COMITES.md) | Análisis del sistema de asistencia a comités con firmas digitales individuales (COPASST/COCOLAB) |
| [ANALISIS_INSPECCIONES_AREAS.md](analisis/ANALISIS_INSPECCIONES_AREAS.md) | Tablas faltantes y requisitos estructurales para inspecciones de áreas físicas |
| [ANALISIS_REGISTRO_ASISTENCIA_Y_ENTREVISTA_CAPACITACIONES.md](analisis/ANALISIS_REGISTRO_ASISTENCIA_Y_ENTREVISTA_CAPACITACIONES.md) | Análisis del módulo de asistencia a capacitaciones y entrevista de requerimientos |

---

## 📊 Estado del Proyecto

| Archivo | Descripción |
|---------|-------------|
| [ESTADO_PROYECTO_2026-03-24.md](estado/ESTADO_PROYECTO_2026-03-24.md) | Snapshot completo del proyecto al 24-Mar-2026 (75% completitud, stack, módulos, deuda técnica) |
| [CHANGELOG_DOCUMENTACION.md](estado/CHANGELOG_DOCUMENTACION.md) | Resumen de actualizaciones a `CLAUDE.md` y `README.md` |
| [RESUMEN_ACTUALIZACION_DOCS.md](estado/RESUMEN_ACTUALIZACION_DOCS.md) | Resumen ejecutivo de la expansión de documentación (+738% README) |

---

## 🐛 Fixes y Diagnósticos

| Archivo | Módulo | Fecha |
|---------|--------|-------|
| [FIX_S3_CORS_ENTREGA_EPP.md](fixes/FIX_S3_CORS_ENTREGA_EPP.md) | Entrega EPP — fotos de evidencia | 2026-05-07 |
| [DIAGNOSTICO_INSPECCIONES_AREAS.md](fixes/DIAGNOSTICO_INSPECCIONES_AREAS.md) | Inspecciones Áreas — reportes vacíos por FIND() incorrecto | 2026-03 |
| [DIAGNOSTICO_EVALUACIONES.md](fixes/DIAGNOSTICO_EVALUACIONES.md) | Evaluaciones — meses mezclados, validación y respuestas invertidas | 2026-03 |
| [FIX_VALIDACION_RESPUESTAS.md](fixes/FIX_VALIDACION_RESPUESTAS.md) | Evaluaciones — normalización de tildes y espacios | 2026-03 |
| [RESUMEN_FIX_EVALUACIONES.md](fixes/RESUMEN_FIX_EVALUACIONES.md) | Evaluaciones — resumen ejecutivo de todas las correcciones | 2026-03 |
| [FIX_INSPECCIONES_EQUIPOS_EMERGENCIA.md](fixes/FIX_INSPECCIONES_EQUIPOS_EMERGENCIA.md) | Inspecciones Equipos — exportación PDF para 4 tipos de inspección | 2026-03 |

---

## 🛠 Implementación

| Archivo | Descripción |
|---------|-------------|
| [IMPLEMENTACION_INSPECCIONES_AREAS.md](implementacion/IMPLEMENTACION_INSPECCIONES_AREAS.md) | Guía completa: tablas Airtable, variables de entorno y flujo de inspecciones de áreas |
| [IMPLEMENTACION_FIRMA_ASISTENTES.md](implementacion/IMPLEMENTACION_FIRMA_ASISTENTES.md) | Captura de firmas individuales en actas de comités (dos flujos de firma) |

---

## 🧪 Pruebas

| Archivo | Descripción |
|---------|-------------|
| [PRUEBAS_INSPECCIONES_AREAS.md](pruebas/PRUEBAS_INSPECCIONES_AREAS.md) | Plan de pruebas y script automatizado para 5 aspectos del módulo de inspecciones |
| [PRUEBAS_VALIDACION.md](pruebas/PRUEBAS_VALIDACION.md) | Datos de prueba para validación de respuestas con tildes, espacios y casos extremos |

---

## 📋 Guías

| Archivo | Descripción |
|---------|-------------|
| [GUIA_CREAR_TABLA_ASISTENCIA_COMITES.md](guias/GUIA_CREAR_TABLA_ASISTENCIA_COMITES.md) | Paso a paso para crear la tabla `asistencia_comites` en Airtable con 9 campos |

---

## 🔒 Seguridad

| Archivo | Descripción |
|---------|-------------|
| [AUDITORIA_SEGURIDAD.md](seguridad/AUDITORIA_SEGURIDAD.md) | Auditoría OWASP Top 10, controles criptográficos y estado de cumplimiento |

---

## 📦 Módulos del Sistema

### Módulo Vehicular
| Archivo | Descripción |
|---------|-------------|
| [MODULO_VEHICULAR_IMPLEMENTACION.md](modulos/vehicular/MODULO_VEHICULAR_IMPLEMENTACION.md) | Implementación completa del módulo de seguimiento vehicular |
| [RESUMEN_MODULO_VEHICULAR.md](modulos/vehicular/RESUMEN_MODULO_VEHICULAR.md) | Resumen ejecutivo de funcionalidades y arquitectura |
| [CONFIGURACION_INICIAL_VEHICULAR.md](modulos/vehicular/CONFIGURACION_INICIAL_VEHICULAR.md) | Guía de configuración de Airtable (53 variables de entorno) |
| [.env.vehicular.template](modulos/vehicular/.env.vehicular.template) | Template de variables de entorno para el módulo |

### Módulo Políticas Empresariales
| Archivo | Descripción |
|---------|-------------|
| [IMPLEMENTACION_POLITICAS_EMPRESARIALES.md](modulos/politicas/IMPLEMENTACION_POLITICAS_EMPRESARIALES.md) | Implementación de sistema de políticas con firmas digitales |
| [RESUMEN_MODULO_POLITICAS_COMPLETADO.md](modulos/politicas/RESUMEN_MODULO_POLITICAS_COMPLETADO.md) | Resumen del módulo completado |
| [PASOS_FINALES_POLITICAS.md](modulos/politicas/PASOS_FINALES_POLITICAS.md) | Últimos pasos de configuración |
| [CONFIGURACION_POLITICAS_AIRTABLE.md](modulos/politicas/CONFIGURACION_POLITICAS_AIRTABLE.md) | Configuración de tablas en Airtable |
| [politicas.csv](modulos/politicas/politicas.csv) | Catálogo de políticas base |

### Módulo Sociodemográfico
| Archivo | Descripción |
|---------|-------------|
| [RESUMEN_FINAL_SOCIODEMOGRAFICO.md](modulos/sociodemografico/RESUMEN_FINAL_SOCIODEMOGRAFICO.md) | Resumen completo del módulo |
| [ESTADO_MODULO_SOCIODEMOGRAFICO.md](modulos/sociodemografico/ESTADO_MODULO_SOCIODEMOGRAFICO.md) | Estado actual de implementación |
| [MODULO_SOCIODEMOGRAFICO_MANUAL.md](modulos/sociodemografico/MODULO_SOCIODEMOGRAFICO_MANUAL.md) | Manual de uso |
| [PERFIL_SOCIODEMOGRAFICO_PDF.md](modulos/sociodemografico/PERFIL_SOCIODEMOGRAFICO_PDF.md) | Generación de reportes PDF |
| [PROGRESO_*.md](modulos/sociodemografico/) | Archivos de progreso de sesiones |

### Módulo Inducciones
| Archivo | Descripción |
|---------|-------------|
| [FIX_INDUCCIONES_FECHAS_RESPONSABLE.md](modulos/inducciones/FIX_INDUCCIONES_FECHAS_RESPONSABLE.md) | Corrección de fechas y responsables |
| [MIGRACION_FIRMAS_S3.md](modulos/inducciones/MIGRACION_FIRMAS_S3.md) | Migración de firmas a AWS S3 |

### Módulo Evaluaciones
| Archivo | Descripción |
|---------|-------------|
| [CAMBIOS_PREGUNTAS_EVALUACION.md](modulos/evaluaciones/CAMBIOS_PREGUNTAS_EVALUACION.md) | Historial de cambios en preguntas |
| [FIXES_EVALUACION_INDUCCIONES.md](modulos/evaluaciones/FIXES_EVALUACION_INDUCCIONES.md) | Correcciones del sistema de evaluación |
| [RESUMEN_BOTONES_TEST.md](modulos/evaluaciones/RESUMEN_BOTONES_TEST.md) | Testing de botones de evaluación |
| [RESUMEN_CAMBIOS_PREGUNTAS.md](modulos/evaluaciones/RESUMEN_CAMBIOS_PREGUNTAS.md) | Resumen de cambios en preguntas |

---

## 🔧 Scripts y Utilidades

| Archivo | Descripción |
|---------|-------------|
| [test-inspecciones-areas.js](scripts-utilidad/test-inspecciones-areas.js) | Script Node.js para testing de inspecciones de áreas |

---

## 📚 Documentación Complementaria

- **Documentación principal del proyecto:** `../CLAUDE.md`
- **Informe de organización:** `../INFORME_ORGANIZACION_PROYECTO.md`
- **README del proyecto:** `../README.md`
