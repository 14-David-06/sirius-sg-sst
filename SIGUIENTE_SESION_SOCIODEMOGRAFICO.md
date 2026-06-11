# Módulo Sociodemográfico - Próxima Sesión

**Fecha de última sesión:** 2026-06-11  
**Progreso actual:** 65%  
**Backend:** ✅ 100% completado y funcional  
**Frontend:** ⚠️ 15% - continuar aquí

---

## 🎯 Objetivo de la Próxima Sesión

Completar el **frontend del módulo sociodemográfico**, específicamente:

1. **Formulario público completo** (secciones 3-7)
2. **Panel de administración** básico
3. **Testing del flujo completo**

---

## 📍 Estado Actual del Frontend

### ✅ Lo que YA está hecho:

1. **Página principal del módulo**
   - Ruta: `http://localhost:3000/dashboard/sociodemografico`
   - Archivo: `src/app/dashboard/sociodemografico/page.tsx`
   - Estado: Página informativa con barras de progreso

2. **Formulario público - Base**
   - Ruta: `/encuesta/socio/[token]`
   - Archivo: `src/app/encuesta/socio/[token]/page.tsx`
   - Secciones implementadas:
     - ✅ Sección 1: Datos Personales (5 campos)
     - ✅ Sección 2: Vivienda (4 campos)
     - ⚠️ Sección 3: Educación (parcial - componente separado)
     - ❌ Sección 4: Trabajo (pendiente)
     - ❌ Sección 5: Salud (pendiente)
     - ❌ Sección 6: Hábitos (pendiente)
     - ❌ Sección 7: Transporte (pendiente)
     - ❌ Consentimiento legal (pendiente)

3. **Componentes auxiliares**
   - `src/modules/sociodemografico/presentation/components/SeccionEducacion.tsx`

---

## 🔨 Tareas Prioritarias

### 1. Completar Formulario Público (6-8 horas)

#### Sección 3: Educación ✅ (ya iniciada)
- ✅ Escolaridad
- ✅ ¿Estudiando actualmente?
- ✅ Campo condicional: ¿Qué estudia?

#### Sección 4: Trabajo (pendiente)
Campos a agregar:
```typescript
areaTrabajo: "Pirolisis" | "Laboratorio" | "Bodega" | "Administrativo"
cargo: string
tipoContrato: "Termino_fijo" | "Termino_indefinido" | "Prestacion_servicios" | "Aprendiz"
fechaIngresoSirius: string (date)
turnoTrabajo: "Mañana" | "Tarde" | "Noche" | "Rotativo"
otroEmpleo: boolean
```

#### Sección 5: Salud (pendiente)
Campos a agregar:
```typescript
enfermedadCronica: boolean
cualEnfermedadCronica?: string (condicional)
discapacidad: boolean
cualDiscapacidad?: string (condicional)
tratamientoMedico: boolean
accidentesTrabajoPrevios: boolean
enfermedadLaboralPrevia: boolean
```

#### Sección 6: Hábitos (pendiente)
Campos a agregar:
```typescript
fuma: "Si" | "No" | "Exfumador"
alcohol: "Nunca" | "Ocasionalmente" | "Frecuentemente"
practicaDeporte: boolean
cualDeporte?: string (condicional)
tiempoLibre: Array<string> (múltiple selección)
```

Opciones de tiempo libre:
- Familia_amigos
- Deportes
- Leer
- Musica
- Videojuegos
- Series_peliculas
- Actividades_religiosas
- Otro

#### Sección 7: Transporte (pendiente)
Campos a agregar:
```typescript
medioTransporte: "A_pie" | "Bus_Transmilenio" | "Bicicleta" | "Moto" | "Carro_particular" | "Ruta_empresa"
tiempoDesplazamiento: "Menos_30min" | "30_60min" | "1_2horas" | "Mas_2horas"
```

#### Sección Final: Consentimiento (pendiente)
**IMPORTANTE:** Agregar texto completo de la Ley 1581/2012

```tsx
<div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-6 mb-6">
  <h3 className="font-semibold text-white mb-3">
    Autorización de Tratamiento de Datos Personales
  </h3>
  <div className="text-white/70 text-sm space-y-2">
    <p>
      Conforme a la Ley 1581 de 2012 y la Política de Privacidad de Sirius Regenerative 
      Solutions S.A.S., la información suministrada en este formulario es de carácter 
      confidencial y será utilizada exclusivamente para fines del Sistema de Gestión de 
      Seguridad y Salud en el Trabajo (SG-SST).
    </p>
    <p>
      Sus datos no serán cedidos a terceros sin su consentimiento previo. Usted tiene 
      derecho a conocer, actualizar, rectificar y suprimir sus datos personales conforme 
      lo establece la ley.
    </p>
  </div>
</div>

<div className="space-y-4">
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={formData.aceptaPoliticaDatos}
      onChange={(e) => actualizarCampo("aceptaPoliticaDatos", e.target.checked)}
      className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5"
      required
    />
    <span className="text-white text-sm">
      Acepto la política de tratamiento de datos personales y autorizo el uso de mi 
      información para fines del SG-SST. *
    </span>
  </label>

  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={formData.firmaVeracidad}
      onChange={(e) => actualizarCampo("firmaVeracidad", e.target.checked)}
      className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5"
      required
    />
    <span className="text-white text-sm">
      Declaro que la información suministrada es veraz y me comprometo a actualizarla 
      en caso de cambios. *
    </span>
  </label>
</div>
```

---

### 2. Panel de Administración (4-6 horas)

Crear: `src/app/dashboard/sociodemografico/campanas/page.tsx`

Funcionalidades:
- ✅ Lista de campañas (usar endpoint GET `/api/socio/campanas`)
- ✅ Botón "Nueva campaña"
- ✅ Ver estado de cada campaña (Activa/Cerrada)
- ✅ Ver progreso (X/Y respuestas)
- ✅ Acciones por campaña:
  - Generar tokens
  - Ver estadísticas
  - Descargar informe (cuando esté el PDF)

#### Vista de Detalle de Campaña
Crear: `src/app/dashboard/sociodemografico/campanas/[id]/page.tsx`

Funcionalidades:
- Lista de tokens generados
- Estado de cada token (Usado ✅ / Pendiente ⏳)
- Botón "Copiar link" por token
- Botón "Generar más tokens"
- Sección de estadísticas (gráficos básicos)

---

## 📝 Código de Referencia

### Estructura del FormData Completo

```typescript
interface FormData extends GuardarRespuestaDTO {
  // Sección 1: Datos Personales
  nombreCompleto: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  genero: Genero;
  estadoCivil: EstadoCivil;

  // Sección 2: Vivienda
  municipioResidencia: string;
  estrato: Estrato;
  tipoVivienda: TipoVivienda;
  personasACargo: PersonasACargo;

  // Sección 3: Educación
  escolaridad: Escolaridad;
  estudiandoActualmente: boolean;
  carreraActual?: string;

  // Sección 4: Trabajo
  areaTrabajo: AreaTrabajo;
  cargo: string;
  tipoContrato: TipoContrato;
  fechaIngresoSirius: string;
  turnoTrabajo: TurnoTrabajo;
  otroEmpleo: boolean;

  // Sección 5: Salud
  enfermedadCronica: boolean;
  cualEnfermedadCronica?: string;
  discapacidad: boolean;
  cualDiscapacidad?: string;
  tratamientoMedico: boolean;
  accidentesTrabajoPrevios: boolean;
  enfermedadLaboralPrevia: boolean;

  // Sección 6: Hábitos
  fuma: Fuma;
  alcohol: Alcohol;
  practicaDeporte: boolean;
  cualDeporte?: string;
  tiempoLibre: TiempoLibre[];

  // Sección 7: Transporte
  medioTransporte: MedioTransporte;
  tiempoDesplazamiento: TiempoDesplazamiento;

  // Consentimiento
  aceptaPoliticaDatos: boolean;
  firmaVeracidad: boolean;
}
```

---

## 🧪 Testing Recomendado

### 1. Flujo Completo Manual
```
1. Crear campaña desde panel admin
2. Generar tokens para 2-3 colaboradores
3. Abrir link de encuesta: /encuesta/socio/{token}
4. Llenar formulario completo (las 7 secciones)
5. Validar que NO se puede reenviar (token usado)
6. Ver estadísticas en panel admin
7. Verificar datos en Airtable
```

### 2. Casos Edge a Probar
- ✅ Token inválido → debe mostrar error
- ✅ Token ya usado → mensaje "Ya respondida"
- ✅ Campaña cerrada → mensaje "No disponible"
- ✅ Campos condicionales (estudia, enfermedad, deporte)
- ✅ Validación de checkboxes de consentimiento

---

## 📊 Endpoints Disponibles para Usar

```bash
# Listar campañas
GET /api/socio/campanas

# Crear campaña
POST /api/socio/campanas
Body: {
  "nombre": "Perfil Jun-2026",
  "periodo": "Semestre_1",
  "año": 2026,
  "fechaInicio": "2026-06-01",
  "creadoPor": "Admin SST"
}

# Generar tokens
POST /api/socio/campanas/{id}/tokens
Body: {
  "personalIds": ["recXXXXX", "recYYYYY"]
}

# Estadísticas
GET /api/socio/campanas/{id}/estadisticas

# Pirámide
GET /api/socio/campanas/{id}/piramide
```

---

## 🎨 Paleta de Colores del Diseño

```css
/* Colores principales */
--violet-500: #8b5cf6
--purple-500: #a855f7
--emerald-500: #10b981
--blue-500: #3b82f6
--red-500: #ef4444

/* Background */
--slate-950: #020617
--slate-900: #0f172a

/* Glassmorphism */
bg-white/10 backdrop-blur-xl border border-white/15
```

---

## 📁 Archivos a Modificar/Crear

### Modificar:
1. `src/app/encuesta/socio/[token]/page.tsx`
   - Agregar secciones 4-7
   - Agregar consentimiento legal
   - Mejorar validaciones

### Crear:
1. `src/app/dashboard/sociodemografico/campanas/page.tsx`
   - Lista de campañas
   - Crear campaña
   
2. `src/app/dashboard/sociodemografico/campanas/nueva/page.tsx`
   - Formulario crear campaña

3. `src/app/dashboard/sociodemografico/campanas/[id]/page.tsx`
   - Detalle de campaña
   - Gestión de tokens

---

## ✅ Checklist para la Próxima Sesión

- [ ] Completar Sección 4: Trabajo
- [ ] Completar Sección 5: Salud
- [ ] Completar Sección 6: Hábitos
- [ ] Completar Sección 7: Transporte
- [ ] Agregar texto legal Ley 1581/2012
- [ ] Implementar validación de consentimiento
- [ ] Crear página de lista de campañas
- [ ] Crear formulario de nueva campaña
- [ ] Crear página de detalle de campaña
- [ ] Testing completo del flujo
- [ ] Verificar responsive en móvil

---

## 🚀 Comando para Iniciar

```bash
cd C:\Users\siriu\Developer\sirius-sg-sst
npm run dev
```

Luego acceder a: http://localhost:3000/dashboard/sociodemografico

---

**Estado:** Backend 100% ✅ | Frontend 15% ⚠️  
**Próximo objetivo:** Frontend 80%+ (formulario + panel admin básico)  
**Tiempo estimado:** 10-12 horas de desarrollo
