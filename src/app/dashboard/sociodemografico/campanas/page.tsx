import { redirect } from "next/navigation";

/**
 * La gestión de campañas vive en el panel principal del módulo.
 * Esta ruta se mantiene solo por compatibilidad con enlaces antiguos.
 */
export default function CampanasRedirect() {
  redirect("/dashboard/sociodemografico");
}
