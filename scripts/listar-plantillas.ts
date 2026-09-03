import "./_load-env";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function listarPlantillas() {
  console.log('🔍 Listando plantillas de evaluación...\n');

  try {
    const headers = getSGSSTHeaders();
    const { plantillasEvalTableId, plantillasEvalFields: PF } = airtableSGSSTConfig;

    const params = new URLSearchParams({
      view: 'Grid view',
      returnFieldsByFieldId: 'true',
    });

    const url = `${getSGSSTUrl(plantillasEvalTableId)}?${params}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Error al consultar plantillas: ${response.statusText}`);
    }

    const data = await response.json();
    const records = data.records || [];

    if (records.length === 0) {
      console.log('❌ No se encontraron plantillas');
      return;
    }

    console.log(`✅ Encontradas ${records.length} plantillas:\n`);

    records.forEach((record: any) => {
      const fields = record.fields;

      console.log('═'.repeat(60));
      console.log(`📋 ${fields[PF.NOMBRE] || 'Sin nombre'}`);
      console.log(`   Record ID: ${record.id}`);
      console.log(`   Código: ${fields[PF.CODIGO] || 'Sin código'}`);
      console.log(`   Tipo: ${fields[PF.TIPO] || 'Sin tipo'}`);
      console.log(`   Estado: ${fields[PF.ESTADO] || 'Sin estado'}`);
      console.log(`   Descripción: ${fields[PF.DESCRIPCION] || 'Sin descripción'}`);
      console.log(`   Puntaje mínimo: ${fields[PF.PUNTAJE_MINIMO] || 0}`);
      console.log(`   Tiempo límite: ${fields[PF.TIEMPO_LIMITE] || 'Sin límite'} min`);

      const numPreguntas = Array.isArray(fields[PF.PREGUNTAS_LINK])
        ? fields[PF.PREGUNTAS_LINK].length
        : 0;
      console.log(`   Preguntas: ${numPreguntas}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ Error al listar plantillas:', error);
    process.exit(1);
  }
}

listarPlantillas();
