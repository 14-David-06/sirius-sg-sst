"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { GuardarRespuestaDTO } from "@/modules/sociodemografico/domain/entities";

type SeccionActual = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 8 = confirmación

export default function EncuestaSocioPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [seccionActual, setSeccionActual] = useState<SeccionActual>(1);

  // Estado del formulario
  const [formData, setFormData] = useState<Partial<GuardarRespuestaDTO>>({
    tiempoLibre: [],
  });

  useEffect(() => {
    params.then((p) => {
      setToken(p.token);
      // TODO: Validar token con la API
      setLoading(false);
    });
  }, [params]);

  const actualizarCampo = (campo: keyof GuardarRespuestaDTO, valor: any) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  };

  const siguientSeccion = () => {
    if (seccionActual < 8) {
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
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Error al enviar la encuesta");
      }

      // Ir a página de confirmación
      setSeccionActual(8);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (seccionActual === 8) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Image src="/logo.png" alt="Sirius" width={180} height={48} className="h-12 w-auto" priority />
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
      </div>

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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Género *</label>
                <select
                  value={formData.genero || ""}
                  onChange={(e) => actualizarCampo("genero", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                <label className="block text-sm font-medium text-white/80 mb-2">Municipio de residencia *</label>
                <input
                  type="text"
                  value={formData.municipioResidencia || ""}
                  onChange={(e) => actualizarCampo("municipioResidencia", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ej: Bogotá"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Estrato socioeconómico *</label>
                <select
                  value={formData.estrato || ""}
                  onChange={(e) => actualizarCampo("estrato", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Primaria_incompleta">Primaria incompleta</option>
                  <option value="Primaria_completa">Primaria completa</option>
                  <option value="Bachillerato_incompleto">Bachillerato incompleto</option>
                  <option value="Bachillerato_completo">Bachillerato completo</option>
                  <option value="Tecnico">Técnico</option>
                  <option value="Tecnologo">Tecnólogo</option>
                  <option value="Profesional">Profesional</option>
                  <option value="Especializacion">Especialización</option>
                  <option value="Maestria">Maestría</option>
                  <option value="Doctorado">Doctorado</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.estudiandoActualmente || false}
                    onChange={(e) => actualizarCampo("estudiandoActualmente", e.target.checked)}
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Turno de trabajo *</label>
                <select
                  value={formData.turnoTrabajo || ""}
                  onChange={(e) => actualizarCampo("turnoTrabajo", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                  <option value="Rotativo">Rotativo</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.otroEmpleo || false}
                    onChange={(e) => actualizarCampo("otroEmpleo", e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Tiene otro empleo adicional?</span>
                </label>
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
                    onChange={(e) => actualizarCampo("enfermedadCronica", e.target.checked)}
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
                    onChange={(e) => actualizarCampo("discapacidad", e.target.checked)}
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

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tratamientoMedico || false}
                    onChange={(e) => actualizarCampo("tratamientoMedico", e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Está actualmente en algún tratamiento médico?</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.accidentesTrabajoPrevios || false}
                    onChange={(e) => actualizarCampo("accidentesTrabajoPrevios", e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Ha tenido accidentes de trabajo previos?</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enfermedadLaboralPrevia || false}
                    onChange={(e) => actualizarCampo("enfermedadLaboralPrevia", e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-white">¿Ha sido diagnosticado con alguna enfermedad laboral?</span>
                </label>
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                    onChange={(e) => actualizarCampo("practicaDeporte", e.target.checked)}
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

              <div>
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
                        checked={formData.tiempoLibre?.includes(opcion.value as any) || false}
                        onChange={(e) => {
                          const actual = formData.tiempoLibre || [];
                          if (e.target.checked) {
                            actualizarCampo("tiempoLibre", [...actual, opcion.value]);
                          } else {
                            actualizarCampo(
                              "tiempoLibre",
                              actual.filter((v) => v !== opcion.value)
                            );
                          }
                        }}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-2 focus:ring-violet-500"
                      />
                      <span className="text-white">{opcion.label}</span>
                    </label>
                  ))}
                </div>
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
