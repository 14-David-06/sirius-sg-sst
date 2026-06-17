"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, PenTool, Eraser } from "lucide-react";
import type { GuardarRespuestaDTO, TiempoLibre, JornadaTrabajo } from "@/modules/sociodemografico/domain/entities";
import { DEPARTAMENTOS_COLOMBIA, obtenerMunicipiosPorDepartamento } from "@/shared/data/departamentosMunicipios";

type SeccionActual = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 8 = confirmación

interface CampanaInfo {
  id: string;
  nombre: string;
  periodo: string;
  año: number;
  codigoEmpleado?: string; // Código SIRIUS-PER-XXXX del empleado
}

// Fondo corporativo estándar de la aplicación
function FondoApp() {
  return (
    <div className="fixed inset-0 -z-10">
      <Image
        src="/20032025-DSC_3717.jpg"
        alt=""
        fill
        className="object-cover"
        priority
        quality={85}
      />
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
    </div>
  );
}

export default function EncuestaSocioPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  // Error fatal de acceso (token inválido/usado/campaña cerrada) — pantalla completa
  const [errorToken, setErrorToken] = useState<string | null>(null);
  const [errorTipo, setErrorTipo] = useState<string | null>(null);
  // Error de validación del formulario — banner inline dentro de la sección
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [seccionActual, setSeccionActual] = useState<SeccionActual>(1);
  const [campanaInfo, setCampanaInfo] = useState<CampanaInfo | null>(null);
  const [prellenado, setPrellenado] = useState(false);

  // Estados para selector de departamento y municipio
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<string>("");
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState<Array<{ codigo: string; nombre: string }>>([]);

  // Estados para firma digital
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const hasStrokes = useRef(false);
  const [firmaVacia, setFirmaVacia] = useState(true);
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);

  // Estado del formulario (usando Record<string, any> para flexibilidad del formulario)
  const [formData, setFormData] = useState<Partial<Record<keyof GuardarRespuestaDTO, any>>>({
    tiempoLibre: [],
    // Inicializar todos los campos booleanos con false
    estudiandoActualmente: false,
    otroEmpleo: false,
    enfermedadCronica: false,
    discapacidad: false,
    tratamientoMedico: false,
    accidentesTrabajoPrevios: false,
    enfermedadLaboralPrevia: false,
    practicaDeporte: false,
    aceptaPoliticaDatos: false,
    firmaVeracidad: false,
  });

  useEffect(() => {
    params.then(async (p) => {
      setToken(p.token);
      await validarToken(p.token);
    });
  }, [params]);

  const validarToken = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/socio/tokens/validar/${tokenValue}`);
      const data = await response.json();

      if (!data.valido) {
        setErrorToken(data.error || "Token inválido");
        setErrorTipo(data.codigo);
        setLoading(false);
        return;
      }

      // Token válido, guardar info de la campaña
      setCampanaInfo(data.campana);

      // Prellenar datos del colaborador desde Nómina Core (editables)
      if (data.colaborador) {
        console.log("📋 Datos del colaborador:", data.colaborador);
        console.log("🏢 Área de trabajo:", data.colaborador.areaTrabajo);
        console.log("💼 Cargo:", data.colaborador.cargo);

        setFormData((prev) => ({
          ...prev,
          nombreCompleto: data.colaborador.nombreCompleto || prev.nombreCompleto,
          numeroDocumento: data.colaborador.numeroDocumento || prev.numeroDocumento,
          fechaNacimiento: data.colaborador.fechaNacimiento || prev.fechaNacimiento,
          fechaIngresoSirius: data.colaborador.fechaIncorporacion || prev.fechaIngresoSirius,
          areaTrabajo: data.colaborador.areaTrabajo || prev.areaTrabajo,
          cargo: data.colaborador.cargo || prev.cargo,
        }));
        setCampanaInfo({ ...data.campana, codigoEmpleado: data.colaborador.codigoEmpleado });
        setPrellenado(true);
      }

      setLoading(false);
    } catch {
      setErrorToken("Error al validar el token. Por favor, intente nuevamente.");
      setErrorTipo("ERROR_RED");
      setLoading(false);
    }
  };

  const actualizarCampo = (campo: keyof GuardarRespuestaDTO, valor: unknown) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
    // Limpiar error al modificar un campo
    if (error) setError(null);
  };

  const manejarCambioDepartamento = (codigoDepartamento: string) => {
    setDepartamentoSeleccionado(codigoDepartamento);
    const municipios = obtenerMunicipiosPorDepartamento(codigoDepartamento);
    setMunicipiosDisponibles(municipios);
    // Limpiar municipio seleccionado cuando cambia el departamento
    actualizarCampo("municipioResidencia", "");
  };

  const manejarCambioMunicipio = (nombreMunicipio: string) => {
    actualizarCampo("municipioResidencia", nombreMunicipio);
  };

  // Funciones del canvas de firma
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
    hasStrokes.current = true;
    setFirmaVacia(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a33";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const limpiarFirma = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    hasStrokes.current = false;
    setFirmaVacia(true);
    setFirmaDataUrl(null);
  };

  const confirmarFirma = () => {
    if (!canvasRef.current || !hasStrokes.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setFirmaDataUrl(dataUrl);
  };

  const validarSeccion = (seccion: SeccionActual): { valido: boolean; mensaje?: string } => {
    switch (seccion) {
      case 1:
        if (!formData.nombreCompleto) return { valido: false, mensaje: "El nombre completo es obligatorio" };
        if (!formData.numeroDocumento) return { valido: false, mensaje: "El número de documento es obligatorio" };
        if (!formData.fechaNacimiento) return { valido: false, mensaje: "La fecha de nacimiento es obligatoria" };
        if (!formData.genero) return { valido: false, mensaje: "El género es obligatorio" };
        if (!formData.estadoCivil) return { valido: false, mensaje: "El estado civil es obligatorio" };
        return { valido: true };

      case 2:
        if (!formData.municipioResidencia)
          return { valido: false, mensaje: "El municipio de residencia es obligatorio" };
        if (!formData.estrato) return { valido: false, mensaje: "El estrato es obligatorio" };
        if (!formData.tipoVivienda) return { valido: false, mensaje: "El tipo de vivienda es obligatorio" };
        if (!formData.personasACargo) return { valido: false, mensaje: "El campo personas a cargo es obligatorio" };
        return { valido: true };

      case 3:
        if (!formData.escolaridad) return { valido: false, mensaje: "El nivel de escolaridad es obligatorio" };
        if (formData.estudiandoActualmente && !formData.carreraActual)
          return { valido: false, mensaje: "Indique qué está estudiando actualmente" };
        return { valido: true };

      case 4:
        if (!formData.areaTrabajo) return { valido: false, mensaje: "El área de trabajo es obligatoria" };
        if (!formData.cargo) return { valido: false, mensaje: "El cargo es obligatorio" };
        if (!formData.tipoContrato) return { valido: false, mensaje: "El tipo de contrato es obligatorio" };
        if (!formData.fechaIngresoSirius)
          return { valido: false, mensaje: "La fecha de ingreso a Sirius es obligatoria" };
        if (!formData.turnoTrabajo) return { valido: false, mensaje: "La jornada de trabajo es obligatoria" };
        if (formData.otroEmpleo && !formData.descripcionOtroEmpleo)
          return { valido: false, mensaje: "Debe especificar el otro empleo que tiene" };
        return { valido: true };

      case 5:
        if (formData.enfermedadCronica && !formData.cualEnfermedadCronica)
          return { valido: false, mensaje: "Indique cuál enfermedad crónica tiene" };
        if (formData.discapacidad && !formData.cualDiscapacidad)
          return { valido: false, mensaje: "Indique cuál discapacidad tiene" };
        if (formData.tratamientoMedico && !formData.descripcionTratamiento)
          return { valido: false, mensaje: "Describa el tratamiento médico que está recibiendo" };
        if (formData.accidentesTrabajoPrevios && !formData.descripcionAccidentes)
          return { valido: false, mensaje: "Describa los accidentes de trabajo previos" };
        if (formData.enfermedadLaboralPrevia && !formData.descripcionEnfLaboral)
          return { valido: false, mensaje: "Describa la enfermedad laboral diagnosticada" };
        return { valido: true };

      case 6:
        if (!formData.fuma) return { valido: false, mensaje: "Indique si fuma" };
        if (!formData.alcohol) return { valido: false, mensaje: "Indique su consumo de alcohol" };
        if (formData.practicaDeporte && !formData.cualDeporte)
          return { valido: false, mensaje: "Indique cuál deporte practica" };
        if (!formData.tiempoLibre || formData.tiempoLibre.length === 0)
          return { valido: false, mensaje: "Seleccione al menos una actividad de tiempo libre" };
        if (formData.tiempoLibre?.includes("Otro") && !formData.descripcionOtroTiempoLibre)
          return { valido: false, mensaje: "Especifique qué otra actividad realiza en su tiempo libre" };
        return { valido: true };

      case 7:
        if (!formData.medioTransporte)
          return { valido: false, mensaje: "El medio de transporte es obligatorio" };
        if (!formData.tiempoDesplazamiento)
          return { valido: false, mensaje: "El tiempo de desplazamiento es obligatorio" };
        if (!formData.aceptaPoliticaDatos)
          return { valido: false, mensaje: "Debe aceptar la política de tratamiento de datos personales" };
        if (!formData.firmaVeracidad)
          return { valido: false, mensaje: "Debe declarar que la información es veraz" };
        if (!firmaDataUrl)
          return { valido: false, mensaje: "Debe firmar el formulario" };
        return { valido: true };

      default:
        return { valido: true };
    }
  };

  const siguientSeccion = () => {
    // Validar sección actual antes de avanzar
    const validacion = validarSeccion(seccionActual);
    if (!validacion.valido) {
      setError(validacion.mensaje || "Complete todos los campos obligatorios");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (seccionActual < 8) {
      setError(null);
      setSeccionActual((prev) => (prev + 1) as SeccionActual);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const seccionAnterior = () => {
    if (seccionActual > 1) {
      setSeccionActual((prev) => (prev - 1) as SeccionActual);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const enviarEncuesta = async () => {
    setEnviando(true);
    setError(null);

    try {
      const response = await fetch(`/api/socio/respuestas/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Enviar firma sin cifrar - el backend la cifrará
          firmaDataUrl: firmaDataUrl,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Mostrar detalles del error de validación si existen
        if (data.detalles && Array.isArray(data.detalles)) {
          const mensajes = data.detalles.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ');
          throw new Error(`${data.error}: ${mensajes}`);
        }
        throw new Error(data.error || "Error al enviar la encuesta");
      }

      // Ir a página de confirmación
      setSeccionActual(8);
    } catch (err: unknown) {
      console.error("Error al enviar encuesta:", err);
      setError(err instanceof Error ? err.message : "Error al enviar la encuesta");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FondoApp />
        <div className="text-white text-center">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-sm">Validando acceso...</p>
        </div>
      </div>
    );
  }

  // Pantalla de error si el token es inválido
  if (errorToken && !loading) {
    const getErrorIcon = () => {
      if (errorTipo === "TOKEN_YA_USADO") {
        return (
          <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        );
      }
      return (
        <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      );
    };

    // Clases estáticas por tipo de error (Tailwind no genera clases dinámicas)
    const colores = {
      emerald: {
        circulo: "bg-emerald-500/20",
        texto: "text-emerald-200/80",
        caja: "bg-emerald-500/10 border border-emerald-500/30",
        mensaje: "text-emerald-300",
      },
      amber: {
        circulo: "bg-amber-500/20",
        texto: "text-amber-200/80",
        caja: "bg-amber-500/10 border border-amber-500/30",
        mensaje: "text-amber-300",
      },
      red: {
        circulo: "bg-red-500/20",
        texto: "text-red-200/80",
        caja: "bg-red-500/10 border border-red-500/30",
        mensaje: "text-red-300",
      },
    } as const;

    const color =
      errorTipo === "TOKEN_YA_USADO" ? colores.emerald : errorTipo === "CAMPANA_CERRADA" ? colores.amber : colores.red;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <FondoApp />
        <div className="max-w-2xl w-full">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
            <div className={`w-20 h-20 ${color.circulo} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {getErrorIcon()}
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              {errorTipo === "TOKEN_YA_USADO" ? "Encuesta Ya Completada" : "Token Inválido"}
            </h1>
            <p className={`${color.texto} text-lg mb-8`}>{errorToken}</p>
            <div className={`${color.caja} rounded-xl p-4 mb-6`}>
              <p className={`${color.mensaje} text-sm`}>
                {errorTipo === "TOKEN_YA_USADO" &&
                  "Esta encuesta ya fue respondida. Si necesita actualizar información, por favor contacte al área de SST."}
                {errorTipo === "TOKEN_NO_ENCONTRADO" &&
                  "El enlace que utilizó no es válido. Verifique que copió la URL completa."}
                {errorTipo === "CAMPANA_CERRADA" &&
                  "Esta campaña de recolección de datos ya finalizó. Consulte con el área de SST si hay una nueva campaña disponible."}
                {errorTipo === "ERROR_RED" &&
                  "No se pudo verificar el token. Revise su conexión a internet e intente nuevamente."}
                {!errorTipo &&
                  "Si cree que esto es un error, contacte al área de Seguridad y Salud en el Trabajo."}
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (seccionActual === 8) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <FondoApp />
        <div className="max-w-2xl w-full">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">¡Encuesta Enviada Exitosamente!</h1>
            <p className="text-white/70 text-lg mb-8">
              Gracias por completar el Perfil Sociodemográfico. Su información ha sido registrada de forma segura y
              contribuirá al diseño de programas de prevención específicos para la población trabajadora de Sirius.
            </p>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
              <p className="text-emerald-300 text-sm">
                Sus datos están protegidos bajo la Ley 1581 de 2012 de Habeas Data y serán utilizados exclusivamente
                para fines del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST).
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progreso = ((seccionActual - 1) / 7) * 100;

  return (
    <div className="min-h-screen">
      <FondoApp />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Image src="/logo.png" alt="Sirius" width={180} height={48} className="h-12 w-auto" priority />
              {campanaInfo && (
                <p className="text-xs text-white/50 mt-1">
                  {campanaInfo.nombre} · {campanaInfo.periodo.replace("_", " ")} {campanaInfo.año}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50">Sección</p>
              <p className="text-lg font-bold text-white">
                {seccionActual} <span className="text-white/40">/ 7</span>
              </p>
            </div>
          </div>
          {/* Barra de progreso */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-6 md:p-8">
          {/* Sección 1: Datos Personales */}
          {seccionActual === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Datos Personales</h2>
                <p className="text-white/60">Información básica del colaborador</p>
              </div>

              {prellenado && (
                <div className="bg-violet-500/10 border border-violet-400/30 rounded-xl p-3">
                  <p className="text-violet-200/90 text-sm">
                    Sus datos fueron precargados desde la base de personal de Sirius.
                    Verifíquelos y corríjalos si es necesario.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Nombre completo *</label>
                <input
                  type="text"
                  value={formData.nombreCompleto || ""}
                  onChange={(e) => actualizarCampo("nombreCompleto", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ej: Juan Pérez García"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Número de documento *</label>
                <input
                  type="text"
                  value={formData.numeroDocumento || ""}
                  onChange={(e) => actualizarCampo("numeroDocumento", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ej: 1234567890"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Fecha de nacimiento *</label>
                <input
                  type="date"
                  value={formData.fechaNacimiento || ""}
                  onChange={(e) => actualizarCampo("fechaNacimiento", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Género *</label>
                <select
                  value={formData.genero || ""}
                  onChange={(e) => actualizarCampo("genero", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="No_binario">No binario</option>
                  <option value="Prefiero_no_decir">Prefiero no decir</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Estado civil *</label>
                <select
                  value={formData.estadoCivil || ""}
                  onChange={(e) => actualizarCampo("estadoCivil", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Soltero">Soltero(a)</option>
                  <option value="Casado">Casado(a)</option>
                  <option value="Union_libre">Unión libre</option>
                  <option value="Divorciado">Divorciado(a)</option>
                  <option value="Viudo">Viudo(a)</option>
                </select>
              </div>
            </div>
          )}

          {/* Sección 2: Vivienda */}
          {seccionActual === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Vivienda</h2>
                <p className="text-white/60">Información sobre su lugar de residencia</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Departamento *</label>
                <select
                  value={departamentoSeleccionado}
                  onChange={(e) => manejarCambioDepartamento(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione un departamento...</option>
                  {DEPARTAMENTOS_COLOMBIA.map((departamento) => (
                    <option key={departamento.codigo} value={departamento.codigo}>
                      {departamento.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Municipio de residencia *</label>
                <select
                  value={formData.municipioResidencia || ""}
                  onChange={(e) => manejarCambioMunicipio(e.target.value)}
                  disabled={!departamentoSeleccionado}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">
                    {departamentoSeleccionado ? "Seleccione un municipio..." : "Primero seleccione un departamento"}
                  </option>
                  {municipiosDisponibles.map((municipio) => (
                    <option key={municipio.codigo} value={municipio.nombre}>
                      {municipio.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Estrato socioeconómico *</label>
                <select
                  value={formData.estrato || ""}
                  onChange={(e) => actualizarCampo("estrato", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="1">Estrato 1</option>
                  <option value="2">Estrato 2</option>
                  <option value="3">Estrato 3</option>
                  <option value="4">Estrato 4</option>
                  <option value="5">Estrato 5</option>
                  <option value="6">Estrato 6</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Tipo de vivienda *</label>
                <select
                  value={formData.tipoVivienda || ""}
                  onChange={(e) => actualizarCampo("tipoVivienda", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Propia">Propia</option>
                  <option value="Arrendada">Arrendada</option>
                  <option value="Familiar">Familiar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Personas a cargo *</label>
                <select
                  value={formData.personasACargo || ""}
                  onChange={(e) => actualizarCampo("personasACargo", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Ninguna">Ninguna</option>
                  <option value="1">1 persona</option>
                  <option value="2">2 personas</option>
                  <option value="3">3 personas</option>
                  <option value="4_o_mas">4 o más personas</option>
                </select>
              </div>
            </div>
          )}

          {/* Sección 3: Educación */}
          {seccionActual === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Educación</h2>
                <p className="text-white/60">Nivel educativo y formación actual</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Nivel de escolaridad *</label>
                <select
                  value={formData.escolaridad || ""}
                  onChange={(e) => actualizarCampo("escolaridad", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Primaria">Primaria</option>
                  <option value="Bachillerato">Bachillerato</option>
                  <option value="Tecnico_Tecnologo">Técnico / Tecnólogo</option>
                  <option value="Profesional">Profesional</option>
                  <option value="Posgrado">Posgrado (especialización, maestría, doctorado)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.estudiandoActualmente || false}
                    onChange={(e) => {
                      actualizarCampo("estudiandoActualmente", e.target.checked);
                      if (!e.target.checked) {
                        actualizarCampo("carreraActual", undefined);
                      }
                    }}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Estudia actualmente?</span>
                </label>
              </div>

              {formData.estudiandoActualmente && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">¿Qué estudia? *</label>
                  <input
                    type="text"
                    value={formData.carreraActual || ""}
                    onChange={(e) => actualizarCampo("carreraActual", e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Ej: Técnico en salud ocupacional"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Sección 4: Trabajo */}
          {seccionActual === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Información Laboral</h2>
                <p className="text-white/60">Datos sobre su trabajo en Sirius</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Área de trabajo *</label>
                <select
                  value={formData.areaTrabajo || ""}
                  onChange={(e) => actualizarCampo("areaTrabajo", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Pirolisis">Pirólisis</option>
                  <option value="Laboratorio">Laboratorio</option>
                  <option value="Bodega">Bodega</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Cargo actual *</label>
                <input
                  type="text"
                  value={formData.cargo || ""}
                  onChange={(e) => actualizarCampo("cargo", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ej: Operario de producción"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Tipo de contrato *</label>
                <select
                  value={formData.tipoContrato || ""}
                  onChange={(e) => actualizarCampo("tipoContrato", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Termino_fijo">Término fijo</option>
                  <option value="Termino_indefinido">Término indefinido</option>
                  <option value="Prestacion_servicios">Prestación de servicios</option>
                  <option value="Aprendiz">Aprendiz</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Fecha de ingreso a Sirius *</label>
                <input
                  type="date"
                  value={formData.fechaIngresoSirius || ""}
                  onChange={(e) => actualizarCampo("fechaIngresoSirius", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Jornada de trabajo *</label>
                <select
                  value={formData.turnoTrabajo || ""}
                  onChange={(e) => actualizarCampo("turnoTrabajo", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Jornada_completa">Jornada completa</option>
                  <option value="Media_jornada">Media jornada</option>
                  <option value="Rotativo">Rotativo</option>
                  <option value="Por_turnos">Por turnos</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.otroEmpleo || false}
                    onChange={(e) => {
                      actualizarCampo("otroEmpleo", e.target.checked);
                      if (!e.target.checked) {
                        actualizarCampo("descripcionOtroEmpleo", undefined);
                      }
                    }}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Tiene otro empleo adicional?</span>
                </label>

                {formData.otroEmpleo && (
                  <textarea
                    value={formData.descripcionOtroEmpleo || ""}
                    onChange={(e) => actualizarCampo("descripcionOtroEmpleo", e.target.value)}
                    placeholder="Especifique el otro empleo que tiene..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* Sección 5: Salud */}
          {seccionActual === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Salud</h2>
                <p className="text-white/60">Información sobre su estado de salud</p>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enfermedadCronica || false}
                    onChange={(e) => {
                      actualizarCampo("enfermedadCronica", e.target.checked);
                      if (!e.target.checked) {
                        actualizarCampo("cualEnfermedadCronica", undefined);
                      }
                    }}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Tiene alguna enfermedad crónica diagnosticada?</span>
                </label>
              </div>

              {formData.enfermedadCronica && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">¿Cuál enfermedad? *</label>
                  <input
                    type="text"
                    value={formData.cualEnfermedadCronica || ""}
                    onChange={(e) => actualizarCampo("cualEnfermedadCronica", e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Ej: Hipertensión, Diabetes, etc."
                    required
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.discapacidad || false}
                    onChange={(e) => {
                      actualizarCampo("discapacidad", e.target.checked);
                      if (!e.target.checked) {
                        actualizarCampo("cualDiscapacidad", undefined);
                      }
                    }}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Tiene alguna discapacidad?</span>
                </label>
              </div>

              {formData.discapacidad && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">¿Cuál discapacidad? *</label>
                  <input
                    type="text"
                    value={formData.cualDiscapacidad || ""}
                    onChange={(e) => actualizarCampo("cualDiscapacidad", e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Describa brevemente"
                    required
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tratamientoMedico || false}
                    onChange={(e) => {
                      actualizarCampo("tratamientoMedico", e.target.checked);
                      if (!e.target.checked) {
                        actualizarCampo("descripcionTratamiento", undefined);
                      }
                    }}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Está actualmente en algún tratamiento médico?</span>
                </label>

                {formData.tratamientoMedico && (
                  <textarea
                    value={formData.descripcionTratamiento || ""}
                    onChange={(e) => actualizarCampo("descripcionTratamiento", e.target.value)}
                    placeholder="Breve descripción del tratamiento médico..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.accidentesTrabajoPrevios || false}
                    onChange={(e) => {
                      actualizarCampo("accidentesTrabajoPrevios", e.target.checked);
                      if (!e.target.checked) {
                        actualizarCampo("descripcionAccidentes", undefined);
                      }
                    }}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Ha tenido accidentes de trabajo previos?</span>
                </label>

                {formData.accidentesTrabajoPrevios && (
                  <textarea
                    value={formData.descripcionAccidentes || ""}
                    onChange={(e) => actualizarCampo("descripcionAccidentes", e.target.value)}
                    placeholder="Describa brevemente los accidentes de trabajo previos..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enfermedadLaboralPrevia || false}
                    onChange={(e) => {
                      actualizarCampo("enfermedadLaboralPrevia", e.target.checked);
                      if (!e.target.checked) {
                        actualizarCampo("descripcionEnfLaboral", undefined);
                      }
                    }}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Ha sido diagnosticado con alguna enfermedad laboral?</span>
                </label>

                {formData.enfermedadLaboralPrevia && (
                  <textarea
                    value={formData.descripcionEnfLaboral || ""}
                    onChange={(e) => actualizarCampo("descripcionEnfLaboral", e.target.value)}
                    placeholder="Describa la enfermedad laboral diagnosticada..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* Sección 6: Hábitos */}
          {seccionActual === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Hábitos y Estilo de Vida</h2>
                <p className="text-white/60">Información sobre sus hábitos diarios</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">¿Fuma? *</label>
                <select
                  value={formData.fuma || ""}
                  onChange={(e) => actualizarCampo("fuma", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Si">Sí</option>
                  <option value="No">No</option>
                  <option value="Exfumador">Exfumador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Consumo de alcohol *</label>
                <select
                  value={formData.alcohol || ""}
                  onChange={(e) => actualizarCampo("alcohol", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Nunca">Nunca</option>
                  <option value="Ocasionalmente">Ocasionalmente (eventos sociales)</option>
                  <option value="Frecuentemente">Frecuentemente (semanalmente)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.practicaDeporte || false}
                    onChange={(e) => {
                      actualizarCampo("practicaDeporte", e.target.checked);
                      if (!e.target.checked) {
                        actualizarCampo("cualDeporte", undefined);
                      }
                    }}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Practica algún deporte o ejercicio físico?</span>
                </label>
              </div>

              {formData.practicaDeporte && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">¿Cuál deporte o ejercicio? *</label>
                  <input
                    type="text"
                    value={formData.cualDeporte || ""}
                    onChange={(e) => actualizarCampo("cualDeporte", e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Ej: Fútbol, gimnasio, natación"
                    required
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/80 mb-3">
                  ¿Qué hace en su tiempo libre? (Puede seleccionar varias opciones) *
                </label>
                <div className="space-y-2">
                  {[
                    { value: "Familia_amigos", label: "Compartir con familia y amigos" },
                    { value: "Deportes", label: "Hacer deporte" },
                    { value: "Leer", label: "Leer" },
                    { value: "Musica", label: "Escuchar música" },
                    { value: "Videojuegos", label: "Jugar videojuegos" },
                    { value: "Series_peliculas", label: "Ver series o películas" },
                    { value: "Actividades_religiosas", label: "Actividades religiosas o espirituales" },
                    { value: "Otro", label: "Otro" },
                  ].map((opcion) => (
                    <label key={opcion.value} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tiempoLibre?.includes(opcion.value as TiempoLibre) || false}
                        onChange={(e) => {
                          const actual = formData.tiempoLibre || [];
                          if (e.target.checked) {
                            actualizarCampo("tiempoLibre", [...actual, opcion.value]);
                          } else {
                            actualizarCampo(
                              "tiempoLibre",
                              actual.filter((v: string) => v !== opcion.value)
                            );
                            // Limpiar descripción si desmarca "Otro"
                            if (opcion.value === "Otro") {
                              actualizarCampo("descripcionOtroTiempoLibre", undefined);
                            }
                          }
                        }}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                      />
                      <span className="text-white">{opcion.label}</span>
                    </label>
                  ))}
                </div>

                {formData.tiempoLibre?.includes("Otro") && (
                  <textarea
                    value={formData.descripcionOtroTiempoLibre || ""}
                    onChange={(e) => actualizarCampo("descripcionOtroTiempoLibre", e.target.value)}
                    placeholder="Especifique qué otra actividad realiza en su tiempo libre..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* Sección 7: Transporte y Consentimiento */}
          {seccionActual === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Transporte</h2>
                <p className="text-white/60">Información sobre su desplazamiento al trabajo</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Medio de transporte principal *</label>
                <select
                  value={formData.medioTransporte || ""}
                  onChange={(e) => actualizarCampo("medioTransporte", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="A_pie">A pie</option>
                  <option value="Bus_Transmilenio">Bus / TransMilenio</option>
                  <option value="Bicicleta">Bicicleta</option>
                  <option value="Moto">Moto</option>
                  <option value="Carro_particular">Carro particular</option>
                  <option value="Ruta_empresa">Ruta de empresa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Tiempo promedio de desplazamiento (ida) *
                </label>
                <select
                  value={formData.tiempoDesplazamiento || ""}
                  onChange={(e) => actualizarCampo("tiempoDesplazamiento", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-slate-800 [&>option]:text-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Menos_30min">Menos de 30 minutos</option>
                  <option value="30_60min">30 minutos a 1 hora</option>
                  <option value="1_2horas">1 a 2 horas</option>
                  <option value="Mas_2horas">Más de 2 horas</option>
                </select>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Consentimiento y Autorización</h3>

                <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold text-white mb-3">Autorización de Tratamiento de Datos Personales</h4>
                  <div className="text-white/70 text-sm space-y-3">
                    <p>
                      Conforme a la Ley 1581 de 2012 y la Política de Privacidad de Sirius Regenerative Solutions
                      S.A.S., la información suministrada en este formulario es de carácter confidencial y será utilizada
                      exclusivamente para fines del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST).
                    </p>
                    <p>
                      Sus datos no serán cedidos a terceros sin su consentimiento previo. Usted tiene derecho a conocer,
                      actualizar, rectificar y suprimir sus datos personales conforme lo establece la ley.
                    </p>
                    <p>
                      Los datos recopilados serán utilizados para: diseño e implementación de programas de prevención de
                      riesgos laborales, análisis epidemiológico de la población trabajadora, diseño de intervenciones
                      específicas según perfiles sociodemográficos, y cumplimiento de la normativa vigente en SST.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.aceptaPoliticaDatos || false}
                      onChange={(e) => actualizarCampo("aceptaPoliticaDatos", e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                      required
                    />
                    <span className="text-white text-sm group-hover:text-white/90">
                      Acepto la política de tratamiento de datos personales y autorizo el uso de mi información para fines
                      del SG-SST, de acuerdo con lo establecido en la Ley 1581 de 2012. *
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.firmaVeracidad || false}
                      onChange={(e) => actualizarCampo("firmaVeracidad", e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                      required
                    />
                    <span className="text-white text-sm group-hover:text-white/90">
                      Declaro que la información suministrada es veraz y completa, y me comprometo a actualizarla en caso
                      de cambios significativos. *
                    </span>
                  </label>
                </div>

                {(!formData.aceptaPoliticaDatos || !formData.firmaVeracidad) && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-300 text-xs">
                      ⚠️ Debe aceptar ambas declaraciones para poder enviar el formulario
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Firma Digital</h3>
                <p className="text-white/70 text-sm mb-4">
                  Para validar la autenticidad de la información suministrada, por favor firme en el recuadro a
                  continuación.
                </p>

                {!firmaDataUrl ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden border-2 border-white/20 bg-white shadow-lg">
                      <canvas
                        ref={canvasRef}
                        width={700}
                        height={220}
                        className="w-full h-[180px] sm:h-[200px] cursor-crosshair touch-none"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                      />
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-slate-400 text-xs pointer-events-none">
                        Firme aquí
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={limpiarFirma}
                        disabled={firmaVacia}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Eraser className="w-4 h-4" />
                        Limpiar
                      </button>
                      <button
                        type="button"
                        onClick={confirmarFirma}
                        disabled={firmaVacia}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PenTool className="w-4 h-4" />
                        Confirmar Firma
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden border-2 border-emerald-400/30 bg-white p-4">
                      <img src={firmaDataUrl} alt="Firma" className="w-full h-[180px] object-contain" />
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-400/30 rounded-lg">
                      <svg
                        className="w-5 h-5 text-emerald-400 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <p className="text-emerald-300 text-sm flex-1">Firma confirmada correctamente</p>
                      <button
                        type="button"
                        onClick={limpiarFirma}
                        className="text-emerald-300 text-sm font-semibold hover:text-emerald-200 transition-colors"
                      >
                        Cambiar firma
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mensaje de error de validación */}
          {error && seccionActual < 8 && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <div>
                <p className="text-red-300 font-semibold text-sm">Campo obligatorio faltante</p>
                <p className="text-red-200/80 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Botones de navegación */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={seccionAnterior}
              disabled={seccionActual === 1}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            {seccionActual < 7 ? (
              <button
                onClick={siguientSeccion}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={enviarEncuesta}
                disabled={enviando || !formData.aceptaPoliticaDatos || !formData.firmaVeracidad}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? "Enviando..." : "Enviar Encuesta"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
