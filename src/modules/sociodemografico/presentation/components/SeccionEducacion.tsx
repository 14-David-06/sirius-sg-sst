import type { GuardarRespuestaDTO } from "../../domain/entities";

interface Props {
  formData: Partial<GuardarRespuestaDTO>;
  actualizarCampo: (campo: keyof GuardarRespuestaDTO, valor: any) => void;
}

export function SeccionEducacion({ formData, actualizarCampo }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Educación</h2>
        <p className="text-white/60">Nivel educativo y formación actual</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Escolaridad *</label>
        <select
          value={formData.escolaridad || ""}
          onChange={(e) => actualizarCampo("escolaridad", e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          required
        >
          <option value="">Seleccione...</option>
          <option value="Primaria">Primaria</option>
          <option value="Bachillerato">Bachillerato</option>
          <option value="Tecnico_Tecnologo">Técnico/Tecnólogo</option>
          <option value="Profesional">Profesional</option>
          <option value="Posgrado">Posgrado</option>
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
          <span className="text-white">¿Actualmente está estudiando?</span>
        </label>
      </div>

      {formData.estudiandoActualmente && (
        <div className="animate-fadeIn">
          <label className="block text-sm font-medium text-white/80 mb-2">¿Qué está estudiando?</label>
          <input
            type="text"
            value={formData.carreraActual || ""}
            onChange={(e) => actualizarCampo("carreraActual", e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Ej: Especialización en Salud Ocupacional"
          />
        </div>
      )}
    </div>
  );
}
