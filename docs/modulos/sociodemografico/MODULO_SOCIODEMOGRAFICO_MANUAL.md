# Creación Manual del Módulo Sociodemográfico

Debido a las limitaciones de la API Metadata de Airtable, por favor crear las siguientes tablas manualmente en la base **appBU8J9xGIFJSOVc** (Sirius SG-SST).

## Tabla 1: socio_campanas

| Campo | Tipo | Opciones |
|---|---|---|
| Nombre | Single line text | |
| Periodo | Single select | Opciones: Semestre_1, Semestre_2 |
| Año | Number | Precision: 0 |
| Estado | Single select | Opciones: Activa, Cerrada |
| Fecha_Inicio | Date | Format: ISO |
| Fecha_Cierre | Date | Format: ISO |
| Creado_Por | Single line text | |
| ID_Campana | Formula | `CONCATENATE("SOCIO-", RECORD_ID())` |

## Tabla 2: socio_tokens

| Campo | Tipo | Opciones |
|---|---|---|
| Token | Single line text | |
| Campana | Link to another record | → socio_campanas |
| Personal | Link to another record | → Personal (tblJNdYasZrhBniJj) |
| Usado | Checkbox | |
| Fecha_Uso | Date time | Format: ISO + Time 24h + America/Bogota |

## Tabla 3: socio_respuestas

### Referencias
| Campo | Tipo | Link |
|---|---|---|
| Token | Link to another record | → socio_tokens |
| Campana | Link to another record | → socio_campanas |
| Personal | Link to another record | → Personal (tblJNdYasZrhBniJj) |

### Sección 1: Datos personales
| Campo | Tipo | Opciones |
|---|---|---|
| nombre_completo | Single line text | |
| numero_documento | Single line text | |
| fecha_nacimiento | Date | ISO |
| genero | Single select | Masculino, Femenino, No_binario, Prefiero_no_decir |
| estado_civil | Single select | Soltero, Casado, Union_libre, Divorciado, Viudo |

### Sección 2: Vivienda
| Campo | Tipo | Opciones |
|---|---|---|
| municipio_residencia | Single line text | |
| estrato | Single select | 1, 2, 3, 4, 5, 6 |
| tipo_vivienda | Single select | Propia, Arrendada, Familiar |
| personas_a_cargo | Single select | Ninguna, 1, 2, 3, 4_o_mas |

### Sección 3: Educación
| Campo | Tipo | Opciones |
|---|---|---|
| escolaridad | Single select | Primaria, Bachillerato, Tecnico_Tecnologo, Profesional, Posgrado |
| estudiando_actualmente | Checkbox | |
| carrera_actual | Single line text | |

### Sección 4: Trabajo
| Campo | Tipo | Opciones |
|---|---|---|
| area_trabajo | Single select | Pirolisis, Laboratorio, Bodega, Administrativo |
| cargo | Single line text | |
| tipo_contrato | Single select | Termino_fijo, Termino_indefinido, Prestacion_servicios, Aprendiz |
| fecha_ingreso_sirius | Date | ISO |
| turno_trabajo | Single select | Mañana, Tarde, Noche, Rotativo |
| otro_empleo | Checkbox | |

### Sección 5: Salud
| Campo | Tipo | Opciones |
|---|---|---|
| enfermedad_cronica | Checkbox | |
| cual_enfermedad_cronica | Single line text | |
| discapacidad | Checkbox | |
| cual_discapacidad | Single line text | |
| tratamiento_medico | Checkbox | |
| accidentes_trabajo_previos | Checkbox | |
| enfermedad_laboral_previa | Checkbox | |

### Sección 6: Hábitos
| Campo | Tipo | Opciones |
|---|---|---|
| fuma | Single select | Si, No, Exfumador |
| alcohol | Single select | Nunca, Ocasionalmente, Frecuentemente |
| practica_deporte | Checkbox | |
| cual_deporte | Single line text | |
| tiempo_libre | Multiple selects | Familia_amigos, Deportes, Leer, Musica, Videojuegos, Series_peliculas, Actividades_religiosas, Otro |

### Sección 7: Transporte
| Campo | Tipo | Opciones |
|---|---|---|
| medio_transporte | Single select | A_pie, Bus_Transmilenio, Bicicleta, Moto, Carro_particular, Ruta_empresa |
| tiempo_desplazamiento | Single select | Menos_30min, 30_60min, 1_2horas, Mas_2horas |

### Consentimiento
| Campo | Tipo | Opciones |
|---|---|---|
| acepta_politica_datos | Checkbox | Description: Ley 1581 de 2012 |
| firma_veracidad | Checkbox | Description: Declara que la información es veraz |

## Tabla 4: socio_informes

| Campo | Tipo | Opciones |
|---|---|---|
| Campana | Link to another record | → socio_campanas |
| URL_PDF | Single line text | |
| Generado_Por | Single line text | |
| Total_Respuestas | Number | Precision: 0 |

---

## Después de crear las tablas manualmente:

1. Ir a https://airtable.com/create/tokens
2. Crear un token con scope `schema.bases:read`
3. Ejecutar el siguiente script para obtener todos los field IDs:

```bash
npx tsx scripts/extract-socio-field-ids.ts
```

4. Copiar el output al final de `.env.local`
