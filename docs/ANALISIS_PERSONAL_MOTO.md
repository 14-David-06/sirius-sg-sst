# 📊 Análisis: Personal que se transporta en MOTO

**Archivo:** `docs/Personal que se transporta en MOTO.xlsx`  
**Fecha de análisis:** 2026-06-30  
**Analizado por:** Claude Code

---

## 📋 Resumen Ejecutivo

El archivo Excel contiene información sobre colaboradores de Sirius que se transportan en vehículos (principalmente motos), con datos sobre SOAT y tecnomecánica.

### Cifras Clave
- **13 colaboradores ACTIVOS** con vehículos registrados
- **4 colaboradores RETIRADOS** (histórico)
- **10/13 (77%)** tienen SOAT vigente
- **10/13 (77%)** tienen tecnomecánica vigente
- **3/13 (23%)** sin datos completos de documentos

---

## 📂 Estructura del Archivo

### Hoja 1: ACTIVOS
**Dimensiones:** 18 filas x 11 columnas

**Encabezados (Fila 5):**
```
# | CÉDULA | NOMBRES | APELLIDOS | TECNO-MECÁNICA | VENC. SOAT | PROPIETARIO DEL VEHÍCULO
```

**Datos:** Filas 6-18 (13 colaboradores)

**Campos:**
1. Número secuencial
2. Cédula del colaborador
3. Nombres
4. Apellidos
5. Fecha vencimiento tecnomecánica
6. Fecha vencimiento SOAT
7. Nombre del propietario del vehículo

### Hoja 2: RETIRADOS
**Dimensiones:** 9 filas x 8 columnas

**Encabezados (Fila 5):**
```
# | CÉDULA | NOMBRE Y APELLIDO | VENC. SOAT | PROPIETARIO DEL VEHÍCULO | PLACA | TIPO
```

**Datos:** Filas 6-9 (4 colaboradores)

**Campos adicionales:**
- Placa del vehículo
- Tipo de vehículo (MOTO/AUTOMOVIL)

---

## 👥 Personal Activo con Vehículos

### Listado Completo (13 colaboradores)

| # | Cédula | Nombre Completo | SOAT | Tecnomecánica | Estado |
|---|--------|----------------|------|---------------|--------|
| 1 | 1006834877 | Santiago Alexander Amaya Salazar | 2026-08-01 | 2028-08-01 | ✅ OK |
| 2 | 1006774686 | Hermes David Hernandez Garcia | 2027-06-19 | 2027-06-27 | ✅ OK |
| 3 | 1057014925 | Sirley Yesenia Ramirez Moreno | - | - | ⚠️ Sin datos |
| 4 | 1122626299 | Mario Andres Barrera Macea | 2027-05-16 | 2028-05-16 | ✅ OK |
| 5 | 1006866318 | Kevin Fernando Avila Santamaria | 2027-03-31 | 2027-04-01 | ✅ OK |
| 6 | 1026272126 | Joys Fernanda Moreno Firigua | 2027-03-20 | 2027-02-13 | ✅ OK |
| 7 | 1122626068 | Angi Yohana Cardenas Rey | 2027-02-26 | 2027-01-24 | ✅ OK |
| 9 | 1123561461 | María Alexandra Orosco Gil | 2026-12-11 | 2026-12-12 | ✅ OK |
| 10 | 1018497693 | Alejandro Uricoechea Reyes | x | x | ⚠️ Sin datos |
| 11 | 1016080562 | Yenny Carolina Casas Ortegon | 2027-03-12 | 2027-03-05 | ✅ OK |
| 12 | 1094887392 | Luis Alberto Obando Mendieta | 2027-04-06 | 2028-04-06 | ✅ OK |
| 13 | 1077859500 | María Alejandra Polania Perdomo | 16/04-05/08/2026 | - | ⚠️ Formato inconsistente |
| 14 | 31011466 | Claudia Viviana Gomez Alvarez | 2027-03-05 | 2027-03-21 | ✅ OK |

---

## 📊 Análisis de Estado de Documentos

### SOAT (Seguro Obligatorio)
```
✅ Vigente:    10 colaboradores (77%)
❌ Vencido:     0 colaboradores (0%)
⚠️  Sin dato:   3 colaboradores (23%)
```

**Colaboradores sin dato de SOAT:**
1. Sirley Yesenia Ramirez Moreno (1057014925)
2. Alejandro Uricoechea Reyes (1018497693)
3. María Alejandra Polania Perdomo (1077859500) - formato inconsistente

### Tecnomecánica
```
✅ Vigente:    10 colaboradores (77%)
❌ Vencida:     0 colaboradores (0%)
⚠️  Sin dato:   3 colaboradores (23%)
```

**Colaboradores sin dato de tecnomecánica:**
1. Sirley Yesenia Ramirez Moreno (1057014925)
2. Alejandro Uricoechea Reyes (1018497693)
3. María Alejandra Polania Perdomo (1077859500)

---

## 🔍 Observaciones y Problemas Detectados

### 1. **Datos Inconsistentes**
- **María Alejandra Polania (1077859500):**
  - SOAT con formato irregular: "16/04/2026-05/08/2026"
  - Propietario: "MARIA ALEJANDRA POLANIA/JOSE BALLARDO" (dos propietarios)
  - Tecnomecánica: vacía

- **Alejandro Uricoechea (1018497693):**
  - SOAT: "x"
  - Tecnomecánica: "x"
  - Propietario: "x"
  - Indica que no se tienen los datos

### 2. **Datos Faltantes**
- **Sirley Yesenia Ramirez (1057014925):**
  - Sin tecnomecánica
  - Sin SOAT
  - Sin propietario

### 3. **Falta Información Crítica**
El archivo **NO contiene**:
- ❌ Placas de vehículos (solo en hoja RETIRADOS)
- ❌ Tipo de vehículo (Moto/Automóvil/Camioneta)
- ❌ Marca y modelo
- ❌ Licencias de conducción
- ❌ Categoría de licencia

### 4. **Propietarios Diferentes**
Varios vehículos son de terceros:
- Kevin Fernando Avila → Propietario: Wilson de Jesus Berrio Camacho
- Yenny Carolina Casas → Propietario: Gerardo Perez Perez
- Angelly Culma (retirada) → Propietario: Fernando Culma
- Eliecer Rada (retirado) → Propietario: Andrea Paola España

---

## 🚀 Integración con Módulo Vehicular

El proyecto ya tiene implementado el **módulo de seguimiento vehicular** en:
- API: `src/app/api/sgsst/vehicular/`
- Dashboard: `src/app/dashboard/sgsst/vehicular/`

### Campos del Sistema vs. Archivo Excel

| Campo en Sistema | Campo en Excel | Estado |
|-----------------|----------------|--------|
| Placa | ❌ No existe en ACTIVOS | Falta |
| Tipo de vehículo | ❌ No existe en ACTIVOS | Falta |
| Marca/Modelo | ❌ No existe | Falta |
| Propietario nombre | ✅ PROPIETARIO DEL VEHÍCULO | OK |
| Propietario tipo | ❌ No existe | Falta |
| Fecha SOAT | ✅ VENC. SOAT | OK |
| Fecha Tecnomecánica | ✅ TECNO-MECÁNICA | OK |
| Licencia conducción | ❌ No existe | Falta |
| Categoría licencia | ❌ No existe | Falta |

---

## 📝 Recomendaciones

### Alta Prioridad

1. **Completar datos faltantes de los 3 colaboradores sin información**
   - Solicitar documentos a: Sirley Ramirez, Alejandro Uricoechea, María Polania

2. **Añadir columnas críticas faltantes en el Excel:**
   - Placa del vehículo
   - Tipo de vehículo (Moto/Automóvil/Camioneta/Camión)
   - Marca y modelo
   - Número de licencia de conducción
   - Categoría de licencia (A1, A2, B1, B2, B3, C1, C2, C3)
   - Fecha de vencimiento de licencia

3. **Normalizar formato de fechas**
   - Usar formato consistente: YYYY-MM-DD
   - Corregir: "16/04/2026-05/08/2026" → fecha única

### Media Prioridad

4. **Migrar datos al módulo vehicular del sistema**
   - El sistema ya está implementado y listo para recibir datos
   - Tablas Airtable ya configuradas:
     - `veh_vehiculos`
     - `veh_documentos` (SOAT y tecnomecánica)
     - `veh_licencias`
     - `veh_alertas_log`

5. **Definir tipo de propietario**
   - ¿El vehículo es propio o de un tercero?
   - Campo: "Propio", "Familiar", "Empresa", "Otro"

6. **Verificar estado actual de documentos**
   - Algunos vencimientos están próximos (María Orosco: dic-2026)

### Baja Prioridad

7. **Documentar motivo de vehículos de terceros**
   - Acuerdos de uso
   - Permisos escritos

8. **Considerar incluir datos de seguros todo riesgo** (si aplica)

---

## 🔄 Proceso de Migración Sugerido

### Opción 1: Migración Manual (Recomendada)
1. Completar datos faltantes en Excel
2. Añadir columnas nuevas requeridas
3. Normalizar formatos
4. Usar interfaz web del módulo vehicular para registrar cada vehículo

### Opción 2: Migración Automatizada
1. Crear script de importación desde Excel
2. Validar datos antes de insertar
3. Generar reporte de errores/inconsistencias
4. Insertar en Airtable vía API

**Archivo de referencia para migración:**
```bash
# Script existente en el proyecto
scripts/limpieza-proyecto.sh

# Crear nuevo script de migración
scripts/migrar-datos-vehiculares.js
```

---

## 📋 Template Mejorado para Excel

### Columnas Sugeridas para Hoja ACTIVOS v2:

```
1.  #
2.  CÉDULA
3.  NOMBRES
4.  APELLIDOS
5.  PLACA
6.  TIPO VEHÍCULO (Moto/Automóvil/Camioneta/Camión)
7.  MARCA
8.  MODELO
9.  PROPIETARIO NOMBRE
10. PROPIETARIO TIPO (Propio/Familiar/Empresa/Otro)
11. SOAT VENCIMIENTO (YYYY-MM-DD)
12. TECNOMECÁNICA VENCIMIENTO (YYYY-MM-DD)
13. LICENCIA NÚMERO
14. LICENCIA CATEGORÍA (A1/A2/B1/B2/B3/C1/C2/C3)
15. LICENCIA VENCIMIENTO (YYYY-MM-DD)
16. OBSERVACIONES
```

---

## 🎯 Conclusiones

### Positivo ✅
- 77% de los colaboradores tienen documentos vigentes
- No hay documentos vencidos en el personal activo
- Estructura básica del archivo es clara

### Por Mejorar ⚠️
- 23% de colaboradores sin datos completos
- Falta información crítica (placas, licencias, tipo de vehículo)
- Formatos inconsistentes en algunas fechas
- Datos de propietarios no estructurados

### Acción Inmediata 🚨
1. Solicitar documentos faltantes a los 3 colaboradores
2. Normalizar formato de fecha de María Polania
3. Completar Excel con columnas faltantes
4. Migrar al módulo vehicular del sistema

---

## 📂 Archivos Relacionados

- **Excel original:** `docs/Personal que se transporta en MOTO.xlsx`
- **Módulo vehicular - API:** `src/app/api/sgsst/vehicular/`
- **Módulo vehicular - Dashboard:** `src/app/dashboard/sgsst/vehicular/`
- **Configuración Airtable:** `src/infrastructure/config/airtableSGSST.ts` (líneas para vehículos)
- **Documentación módulo:** `docs/modulos/vehicular/`

---

**Generado por:** Claude Code  
**Fecha:** 2026-06-30  
**Próxima revisión sugerida:** Cuando se completen los datos faltantes
