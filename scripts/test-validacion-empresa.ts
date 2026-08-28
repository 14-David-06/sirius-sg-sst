/**
 * Script de prueba para verificar que la validación de variables de empresa
 * funcione correctamente en runtime (no en build-time).
 *
 * Uso:
 *   npx tsx scripts/test-validacion-empresa.ts
 */

// Simular que las variables no están definidas
delete process.env.EMPRESA_NOMBRE;
delete process.env.EMPRESA_RAZON_SOCIAL;
delete process.env.EMPRESA_NIT;
delete process.env.EMPRESA_TELEFONO;
delete process.env.EMPRESA_CORREO;
delete process.env.EMPRESA_DIRECCION;

async function testValidacion() {
  console.log("Probando validación de variables de empresa...\n");

  try {
    // Importar dinámicamente después de limpiar las variables
    const { renderEncabezado } = await import("../src/lib/pdf/corporativo");
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF();
    const formato = {
      codigo: "FT-TEST-001",
      version: "01",
      fechaEdicion: "2026-08-28",
      nombre: "DOCUMENTO DE PRUEBA",
    };

    console.log("❌ Error: renderEncabezado() no lanzó error cuando debería");
    console.log("   Las variables están ausentes pero la función no validó.");

    // Intentar llamar la función (debería fallar)
    renderEncabezado(doc, 10, 10, 180, null, formato);

    console.log("❌ FALLO: La función se ejecutó sin las variables requeridas");
    process.exit(1);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Variables de entorno requeridas no definidas")) {
        console.log("✅ ÉXITO: La validación funcionó correctamente");
        console.log("\nError esperado capturado:");
        console.log(error.message);
        process.exit(0);
      } else {
        console.log("❌ Error inesperado:");
        console.log(error.message);
        process.exit(1);
      }
    }
  }
}

testValidacion().catch((error) => {
  console.error("Error ejecutando la prueba:", error);
  process.exit(1);
});
