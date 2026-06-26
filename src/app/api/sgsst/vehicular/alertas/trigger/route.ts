// POST — Cron job para revisar vencimientos y enviar alertas por correo
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";
import { airtableConfig } from "@/infrastructure/config/airtable";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "sst@siriusregenerative.com";
const RESPONSABLE_SST = process.env.SENDGRID_RESPONSABLE_SST_EMAIL || "david@siriusregenerative.com";

async function enviarCorreoSendGrid(to: string, subject: string, htmlContent: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.error("SENDGRID_API_KEY no configurado");
    return false;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: "SG-SST Sirius" },
        subject,
        content: [{ type: "text/html", value: htmlContent }],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error enviando correo SendGrid:", error);
    return false;
  }
}

function generarHTMLAlerta(datos: any): string {
  const { colaborador, tipo, entidad, diasRestantes } = datos;
  const colorEstado = diasRestantes < 0 ? "#ef4444" : "#f59e0b";
  const estadoTexto = diasRestantes < 0 ? "VENCIDO" : "PRÓXIMO A VENCER";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Alerta de Vencimiento — SG-SST</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Alerta de Vencimiento</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">SG-SST — Seguimiento Vehicular</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <div style="background: ${colorEstado}; color: white; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 20px;">
      ${estadoTexto} ${diasRestantes < 0 ? `(${Math.abs(diasRestantes)} días atrás)` : `(${diasRestantes} días restantes)`}
    </div>

    <h2 style="color: #1f2937; margin-top: 0;">Detalles del documento:</h2>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background: #fff;">
        <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Colaborador:</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${colaborador.nombre}</td>
      </tr>
      <tr style="background: #f9fafb;">
        <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Tipo de ${tipo}:</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${entidad.tipo}</td>
      </tr>
      <tr style="background: #fff;">
        <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">${tipo === "documento" ? "Número" : "Licencia #"}:</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${entidad.numero}</td>
      </tr>
      ${tipo === "documento" && entidad.placa ? `
      <tr style="background: #f9fafb;">
        <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Placa:</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${entidad.placa}</td>
      </tr>
      ` : ""}
      <tr style="background: ${diasRestantes < 0 ? "#fee2e2" : "#fef3c7"};">
        <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Fecha de vencimiento:</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: ${colorEstado};">${entidad.fechaVencimiento}</td>
      </tr>
    </table>

    <div style="background: #e0e7ff; padding: 15px; border-left: 4px solid #6366f1; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; color: #1e40af;"><strong>Acción requerida:</strong> ${diasRestantes < 0 ? "Renovar inmediatamente" : "Programar renovación antes del vencimiento"}</p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://sgsst.siriusregenerative.com/dashboard/sgsst/vehicular" style="display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Panel Vehicular</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">
      Este es un correo automático generado por el Sistema de Gestión de Seguridad y Salud en el Trabajo de Sirius Regenerative.<br>
      Decreto 1072/2015 — Resolución 0312/2019
    </p>
  </div>
</body>
</html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const config = airtableSGSSTConfig;
    const headers = getSGSSTHeaders();
    const alertasEnviadas: any[] = [];
    const errores: any[] = [];

    // 1. Consultar documentos por vencer (≤30 días) o vencidos
    const docUrl = getSGSSTUrl(config.documentosVehicularesTableId);
    const docResponse = await fetch(docUrl, { headers });
    const docData = docResponse.ok ? await docResponse.json() : { records: [] };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const doc of docData.records || []) {
      const fields = doc.fields;
      const fechaVenc = fields[config.documentosVehicularesFields.FECHA_VENCIMIENTO];
      if (!fechaVenc) continue;

      const vencimiento = new Date(fechaVenc);
      vencimiento.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        // Verificar si ya se envió alerta en últimas 24 horas
        const alertasUrl = getSGSSTUrl(config.alertasVehicularesTableId);
        const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const checkFormula = `AND({${config.alertasVehicularesFields.ENTIDAD_ID}} = '${doc.id}', IS_AFTER({${config.alertasVehicularesFields.FECHA_ENVIO}}, '${hace24h}'))`;

        const checkResponse = await fetch(`${alertasUrl}?filterByFormula=${encodeURIComponent(checkFormula)}`, { headers });
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.records && checkData.records.length > 0) {
            continue; // Ya se envió alerta recientemente
          }
        }

        // Obtener datos del vehículo y colaborador
        const vehiculoId = fields[config.documentosVehicularesFields.VEHICULO_LINK]?.[0];
        if (!vehiculoId) continue;

        const vehUrl = `${getSGSSTUrl(config.vehiculosTableId)}/${vehiculoId}`;
        const vehResponse = await fetch(vehUrl, { headers });
        if (!vehResponse.ok) continue;

        const vehData = await vehResponse.json();
        const idPersonal = vehData.fields[config.vehiculosFields.ID_PERSONAL_CORE];
        const placa = vehData.fields[config.vehiculosFields.PLACA];

        // Resolver colaborador
        const personalUrl = `${airtableConfig.baseUrl}/${airtableConfig.baseId}/${airtableConfig.personalTableId}`;
        const PF = airtableConfig.personalFields;
        const personalResponse = await fetch(`${personalUrl}?filterByFormula=${encodeURIComponent(`{${PF.ID_EMPLEADO}} = '${idPersonal}'`)}`, {
          headers: { Authorization: `Bearer ${airtableConfig.apiToken}`, "Content-Type": "application/json" },
        });

        let nombreColaborador = "Desconocido";
        if (personalResponse.ok) {
          const personalData = await personalResponse.json();
          if (personalData.records?.[0]) {
            nombreColaborador = personalData.records[0].fields[PF.NOMBRE_COMPLETO] || "Desconocido";
          }
        }

        // Enviar alerta
        const datosAlerta = {
          colaborador: { nombre: nombreColaborador },
          tipo: "documento",
          entidad: {
            tipo: fields[config.documentosVehicularesFields.TIPO_DOCUMENTO],
            numero: fields[config.documentosVehicularesFields.NUMERO_DOCUMENTO],
            placa,
            fechaVencimiento: fechaVenc,
          },
          diasRestantes: diffDays,
        };

        const htmlContent = generarHTMLAlerta(datosAlerta);
        const subject = `⚠️ ${datosAlerta.entidad.tipo} ${diffDays < 0 ? "VENCIDO" : "Por Vencer"} — ${placa}`;

        const enviado = await enviarCorreoSendGrid(RESPONSABLE_SST, subject, htmlContent);

        // Registrar en log
        const logPayload = {
          fields: {
            [config.alertasVehicularesFields.ENTIDAD_TIPO]: "documento",
            [config.alertasVehicularesFields.ENTIDAD_ID]: doc.id,
            [config.alertasVehicularesFields.TIPO_ALERTA]: diffDays < 0 ? "vencido" : "por_vencer",
            [config.alertasVehicularesFields.FECHA_ENVIO]: new Date().toISOString(),
            [config.alertasVehicularesFields.DESTINATARIO]: RESPONSABLE_SST,
            [config.alertasVehicularesFields.ENVIADO]: enviado,
          },
        };

        await fetch(alertasUrl, { method: "POST", headers, body: JSON.stringify(logPayload) });

        if (enviado) {
          alertasEnviadas.push({ tipo: "documento", id: doc.id, placa, destinatario: RESPONSABLE_SST });
        } else {
          errores.push({ tipo: "documento", id: doc.id, error: "Fallo envío SendGrid" });
        }
      }
    }

    // 2. Consultar licencias por vencer
    const licUrl = getSGSSTUrl(config.licenciasConduccionTableId);
    const licResponse = await fetch(licUrl, { headers });
    const licData = licResponse.ok ? await licResponse.json() : { records: [] };

    for (const lic of licData.records || []) {
      const fields = lic.fields;
      const fechaVenc = fields[config.licenciasConduccionFields.FECHA_VENCIMIENTO];
      if (!fechaVenc) continue;

      const vencimiento = new Date(fechaVenc);
      vencimiento.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        // Verificar anti-spam (similar a documentos)
        const alertasUrl = getSGSSTUrl(config.alertasVehicularesTableId);
        const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const checkFormula = `AND({${config.alertasVehicularesFields.ENTIDAD_ID}} = '${lic.id}', IS_AFTER({${config.alertasVehicularesFields.FECHA_ENVIO}}, '${hace24h}'))`;

        const checkResponse = await fetch(`${alertasUrl}?filterByFormula=${encodeURIComponent(checkFormula)}`, { headers });
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.records?.length > 0) continue;
        }

        const idPersonal = fields[config.licenciasConduccionFields.ID_PERSONAL_CORE];

        // Resolver colaborador
        const personalUrl = `${airtableConfig.baseUrl}/${airtableConfig.baseId}/${airtableConfig.personalTableId}`;
        const PF = airtableConfig.personalFields;
        const personalResponse = await fetch(`${personalUrl}?filterByFormula=${encodeURIComponent(`{${PF.ID_EMPLEADO}} = '${idPersonal}'`)}`, {
          headers: { Authorization: `Bearer ${airtableConfig.apiToken}`, "Content-Type": "application/json" },
        });

        let nombreColaborador = "Desconocido";
        if (personalResponse.ok) {
          const personalData = await personalResponse.json();
          if (personalData.records?.[0]) {
            nombreColaborador = personalData.records[0].fields[PF.NOMBRE_COMPLETO] || "Desconocido";
          }
        }

        const datosAlerta = {
          colaborador: { nombre: nombreColaborador },
          tipo: "licencia",
          entidad: {
            tipo: `Licencia Categoría ${fields[config.licenciasConduccionFields.CATEGORIA]}`,
            numero: fields[config.licenciasConduccionFields.NUMERO_LICENCIA],
            fechaVencimiento: fechaVenc,
          },
          diasRestantes: diffDays,
        };

        const htmlContent = generarHTMLAlerta(datosAlerta);
        const subject = `⚠️ Licencia de Conducción ${diffDays < 0 ? "VENCIDA" : "Por Vencer"} — ${nombreColaborador}`;

        const enviado = await enviarCorreoSendGrid(RESPONSABLE_SST, subject, htmlContent);

        // Registrar en log
        const logPayload = {
          fields: {
            [config.alertasVehicularesFields.ENTIDAD_TIPO]: "licencia",
            [config.alertasVehicularesFields.ENTIDAD_ID]: lic.id,
            [config.alertasVehicularesFields.TIPO_ALERTA]: diffDays < 0 ? "vencido" : "por_vencer",
            [config.alertasVehicularesFields.FECHA_ENVIO]: new Date().toISOString(),
            [config.alertasVehicularesFields.DESTINATARIO]: RESPONSABLE_SST,
            [config.alertasVehicularesFields.ENVIADO]: enviado,
          },
        };

        await fetch(alertasUrl, { method: "POST", headers, body: JSON.stringify(logPayload) });

        if (enviado) {
          alertasEnviadas.push({ tipo: "licencia", id: lic.id, destinatario: RESPONSABLE_SST });
        } else {
          errores.push({ tipo: "licencia", id: lic.id, error: "Fallo envío SendGrid" });
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalAlertasEnviadas: alertasEnviadas.length,
      alertasEnviadas,
      errores,
      mensaje: `Se enviaron ${alertasEnviadas.length} alertas. ${errores.length > 0 ? `${errores.length} errores.` : ""}`,
    });
  } catch (error) {
    console.error("Error en POST /api/sgsst/vehicular/alertas/trigger:", error);
    return NextResponse.json({ error: "Error al procesar alertas" }, { status: 500 });
  }
}
