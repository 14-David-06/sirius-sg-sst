import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/transcribir
 * Recibe un archivo de audio (multipart/form-data) y lo transcribe con Whisper.
 * Body: FormData con campo "audio" (Blob/File)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as Blob | null;

    if (!audioBlob) {
      return NextResponse.json(
        { success: false, message: "No se recibió audio" },
        { status: 400 }
      );
    }

    // Whisper necesita un File con nombre y extensión
    const audioFile = new File([audioBlob], "grabacion.webm", {
      type: audioBlob.type || "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "es",
    });

    return NextResponse.json({ success: true, texto: transcription.text });
  } catch (error) {
    console.error("Error transcribiendo audio:", error);
    return NextResponse.json(
      { success: false, message: "Error al transcribir el audio" },
      { status: 500 }
    );
  }
}
