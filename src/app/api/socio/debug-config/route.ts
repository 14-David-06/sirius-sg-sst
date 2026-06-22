import { NextResponse } from "next/server";

/**
 * GET /api/socio/debug-config
 * Endpoint temporal para verificar configuración de variables de entorno
 * ⚠️ ELIMINAR EN PRODUCCIÓN
 */
export async function GET() {
  const config = {
    ACEPTA_POLITICA_DATOS: {
      defined: !!process.env.AIRTABLE_SOCIO_RESP_ACEPTA_POLITICA,
      value: process.env.AIRTABLE_SOCIO_RESP_ACEPTA_POLITICA ? "✓ Definido" : "✗ NO DEFINIDO",
      fieldId: process.env.AIRTABLE_SOCIO_RESP_ACEPTA_POLITICA,
    },
    FIRMA_VERACIDAD: {
      defined: !!process.env.AIRTABLE_SOCIO_RESP_FIRMA_VERACIDAD,
      value: process.env.AIRTABLE_SOCIO_RESP_FIRMA_VERACIDAD ? "✓ Definido" : "✗ NO DEFINIDO",
      fieldId: process.env.AIRTABLE_SOCIO_RESP_FIRMA_VERACIDAD,
    },
    FIRMA: {
      defined: !!process.env.AIRTABLE_SOCIO_RESP_FIRMA,
      value: process.env.AIRTABLE_SOCIO_RESP_FIRMA ? "✓ Definido" : "✗ NO DEFINIDO",
      fieldId: process.env.AIRTABLE_SOCIO_RESP_FIRMA,
    },
  };

  return NextResponse.json({
    success: true,
    message: "Diagnóstico de configuración - Variables de entorno",
    config,
    warning: "⚠️ ELIMINAR ESTE ENDPOINT EN PRODUCCIÓN",
  });
}
