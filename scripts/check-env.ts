/**
 * Verifica que todos los IDs de Airtable estén configurados en .env.local.
 *
 * Uso:
 *   npm run check:env
 *
 * Sale con código 1 si falta algo, para poder encadenarlo en CI o en un
 * pre-commit sin lógica adicional.
 */
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  // Import dinámico: los módulos de config leen process.env al evaluarse,
  // así que deben cargarse después de dotenv.
  const { validateConfig, formatearReporte } = await import(
    "../src/infrastructure/config/validateConfig"
  );

  const resultado = validateConfig();

  console.log(formatearReporte(resultado));

  if (!resultado.valido) {
    const faltantes = resultado.problemas.filter((p) => p.tipo === "faltante").length;
    const placeholders = resultado.problemas.filter(
      (p) => p.tipo === "placeholder"
    ).length;

    console.log(
      `Resumen: ${faltantes} variables ausentes, ${placeholders} placeholders sin reemplazar.`
    );
    console.log(
      "Revisa .env.example para ver la lista completa de variables esperadas."
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error al validar la configuración:", error);
  process.exit(1);
});
