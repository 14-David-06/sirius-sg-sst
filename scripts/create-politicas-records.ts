/**
 * Script para crear registros de políticas en Airtable SIN subir archivos a S3
 * Los archivos se deben subir manualmente a S3 después
 * Uso: npx tsx scripts/create-politicas-records.ts
 */

// Cargar variables de entorno desde .env.local
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { airtableSGSSTConfig, getSGSSTUrl } from "../src/infrastructure/config/airtableSGSST";

// ══════════════════════════════════════════════════════════
// Configuración
// ══════════════════════════════════════════════════════════

const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || "sirius-sg-sst";
const S3_REGION = process.env.AWS_REGION || "us-east-1";

// Metadatade políticas
const POLITICAS_METADATA = [
  {
    codigo: "PT-SST-001",
    titulo: "Política de Seguridad y Salud en el Trabajo",
    descripcion: "Compromiso de la organización con la prevención de lesiones y enfermedades laborales, mediante la identificación de peligros, evaluación y control de riesgos.",
    categoria: "Seguridad y Salud",
    requiereFirma: true,
    orden: 1,
  },
  {
    codigo: "PT-SST-002",
    titulo: "Política de no Alcohol, Tabaquismo y Sustancias Psicoactivas",
    descripcion: "Prohibición del consumo de alcohol, tabaco y sustancias psicoactivas en el lugar de trabajo para garantizar un ambiente seguro y saludable.",
    categoria: "Seguridad y Salud",
    requiereFirma: true,
    orden: 2,
  },
  {
    codigo: "PT-SST-003",
    titulo: "Política de Prevención de Acoso Laboral",
    descripcion: "Compromiso con la prevención, corrección y sanción de conductas de acoso laboral, garantizando un ambiente de trabajo respetuoso y digno.",
    categoria: "Recursos Humanos",
    requiereFirma: true,
    orden: 3,
  },
  {
    codigo: "PT-SST-004",
    titulo: "Política de Elementos y Equipos de Protección Personal",
    descripcion: "Lineamientos para el uso obligatorio de EPP según los riesgos identificados en cada puesto de trabajo, garantizando la protección de los trabajadores.",
    categoria: "Seguridad y Salud",
    requiereFirma: true,
    orden: 4,
  },
  {
    codigo: "PT-SST-005",
    titulo: "Política de Seguridad Vial",
    descripcion: "Compromiso con la prevención de accidentes de tránsito y la promoción de prácticas seguras en la conducción de vehículos de la empresa.",
    categoria: "Seguridad y Salud",
    requiereFirma: true,
    orden: 5,
  },
  {
    codigo: "PT-SST-006",
    titulo: "Política Ambiental",
    descripcion: "Compromiso con la protección del medio ambiente, la gestión responsable de recursos y la prevención de la contaminación.",
    categoria: "General",
    requiereFirma: false,
    orden: 6,
  },
  {
    codigo: "PT-SST-007",
    titulo: "Política Contra la Violencia de Género y Acoso Sexual",
    descripcion: "Rechazo a cualquier forma de violencia de género y acoso sexual, garantizando un ambiente laboral libre de discriminación.",
    categoria: "Recursos Humanos",
    requiereFirma: true,
    orden: 7,
  },
  {
    codigo: "PT-SST-008",
    titulo: "Política de Respeto a los Derechos Humanos",
    descripcion: "Compromiso con el respeto y promoción de los derechos humanos fundamentales en todas las operaciones y relaciones laborales.",
    categoria: "General",
    requiereFirma: true,
    orden: 8,
  },
  {
    codigo: "PT-SST-009",
    titulo: "Política de LGTBI",
    descripcion: "Compromiso con la diversidad sexual y la no discriminación por orientación sexual o identidad de género.",
    categoria: "Recursos Humanos",
    requiereFirma: true,
    orden: 9,
  },
  {
    codigo: "PT-SST-010",
    titulo: "Política de Equidad de Género",
    descripcion: "Promoción de la igualdad de oportunidades y trato entre hombres y mujeres en el ámbito laboral.",
    categoria: "Recursos Humanos",
    requiereFirma: true,
    orden: 10,
  },
  {
    codigo: "PT-SST-011",
    titulo: "Política de Tratamiento de Datos Personales",
    descripcion: "Lineamientos para la recolección, uso, almacenamiento y protección de datos personales en cumplimiento de la normatividad vigente.",
    categoria: "General",
    requiereFirma: true,
    orden: 11,
  },
];

// ══════════════════════════════════════════════════════════
// Funciones auxiliares
// ══════════════════════════════════════════════════════════

function generateS3Url(codigo: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/politicas/${codigo.toLowerCase()}.pdf`;
}

async function checkIfPoliticaExists(codigo: string): Promise<string | null> {
  const PF = airtableSGSSTConfig.politicasFields;
  const url = getSGSSTUrl(airtableSGSSTConfig.politicasTableId);

  const filterFormula = `{${PF.CODIGO}} = '${codigo}'`;
  const queryUrl = `${url}?filterByFormula=${encodeURIComponent(filterFormula)}`;

  const response = await fetch(queryUrl, {
    headers: {
      Authorization: `Bearer ${airtableSGSSTConfig.apiToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error ${response.status} al consultar Airtable: ${errorText}`);
  }

  const data = await response.json();

  if (data.records && data.records.length > 0) {
    return data.records[0].id;
  }

  return null;
}

async function createPoliticaInAirtable(metadata: any, urlDocumento: string) {
  const url = getSGSSTUrl(airtableSGSSTConfig.politicasTableId);
  const PF = airtableSGSSTConfig.politicasFields;

  const today = new Date().toISOString();

  const record = {
    fields: {
      [PF.CODIGO]: metadata.codigo,
      [PF.TITULO]: metadata.titulo,
      [PF.DESCRIPCION]: metadata.descripcion,
      [PF.CATEGORIA]: metadata.categoria,
      [PF.VERSION]: "1.0",
      [PF.FECHA_PUBLICACION]: today,
      [PF.FECHA_VIGENCIA]: today,
      [PF.ESTADO]: "Activa",
      [PF.URL_DOCUMENTO_S3]: urlDocumento,
      [PF.REQUIERE_FIRMA]: metadata.requiereFirma,
      [PF.VISIBLE_COLABORADORES]: true,
      [PF.ORDEN_VISUALIZACION]: metadata.orden,
      [PF.CREADO_POR]: "Sistema",
      [PF.FECHA_CREACION]: today,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${airtableSGSSTConfig.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error al crear política en Airtable: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

async function updatePoliticaInAirtable(recordId: string, urlDocumento: string) {
  const url = `${getSGSSTUrl(airtableSGSSTConfig.politicasTableId)}/${recordId}`;
  const PF = airtableSGSSTConfig.politicasFields;

  const record = {
    fields: {
      [PF.URL_DOCUMENTO_S3]: urlDocumento,
      [PF.MODIFICADO_POR]: "Sistema",
      [PF.FECHA_MODIFICACION]: new Date().toISOString(),
    },
  };

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${airtableSGSSTConfig.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error al actualizar política en Airtable: ${error}`);
  }
}

// ══════════════════════════════════════════════════════════
// Script principal
// ══════════════════════════════════════════════════════════

async function main() {
  console.log("🚀 Creando registros de políticas en Airtable...\n");
  console.log("⚠️  NOTA: Los archivos PDF deben subirse manualmente a S3 después.\n");

  let successCount = 0;
  let errorCount = 0;
  let updateCount = 0;

  for (const metadata of POLITICAS_METADATA) {
    try {
      console.log(`\n📄 Procesando: ${metadata.codigo} - ${metadata.titulo}`);

      // Generar URL de S3 (aunque el archivo aún no esté subido)
      const urlDocumento = generateS3Url(metadata.codigo);
      console.log(`   🔗 URL S3: ${urlDocumento}`);

      // Verificar si ya existe en Airtable
      const existingRecordId = await checkIfPoliticaExists(metadata.codigo);

      if (existingRecordId) {
        console.log(`   🔄 Actualizando registro existente (ID: ${existingRecordId})`);
        await updatePoliticaInAirtable(existingRecordId, urlDocumento);
        console.log(`   ✅ Registro actualizado en Airtable`);
        updateCount++;
      } else {
        console.log(`   📝 Creando nuevo registro en Airtable`);
        const recordId = await createPoliticaInAirtable(metadata, urlDocumento);
        console.log(`   ✅ Registro creado en Airtable (ID: ${recordId})`);
        successCount++;
      }

    } catch (error) {
      console.error(`   ❌ Error procesando ${metadata.codigo}:`, error);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("📊 RESUMEN:");
  console.log(`   ✅ Registros creados: ${successCount}`);
  console.log(`   🔄 Registros actualizados: ${updateCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
  console.log(`   📋 Total procesado: ${POLITICAS_METADATA.length}`);
  console.log("=".repeat(70));

  if (errorCount === 0) {
    console.log("\n🎉 ¡Todos los registros se crearon exitosamente en Airtable!");
    console.log("\n📦 SIGUIENTE PASO:");
    console.log("   Sube los archivos PDF manualmente a S3:");
    console.log(`   Bucket: ${S3_BUCKET}`);
    console.log("   Carpeta: politicas/");
    console.log("\n   Archivos a subir:");
    POLITICAS_METADATA.forEach((p) => {
      console.log(`   - ${p.codigo.toLowerCase()}.pdf`);
    });
  } else {
    console.log("\n⚠️  Algunos registros no se pudieron crear. Revisa los errores arriba.");
  }
}

// Ejecutar
main().catch((error) => {
  console.error("💥 Error fatal:", error);
  process.exit(1);
});
