import dotenv from "dotenv";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

dotenv.config();

// Verifica que la API Key exista
if (!process.env.GEMINI_API_KEY) {
  console.error("Falta GEMINI_API_KEY en .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-pro",
});

// Función serverless para Vercel
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: "Mensaje vacío" });
    return;
  }

  try {
    const generationConfig = {
      temperature: 0.3,
      topP: 0.8,
      topK: 30,
      maxOutputTokens: 8192,
    };

    const chat = model.startChat({
      generationConfig,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
      history: [],
    });

    const systemPrompt = `Eres un profesor experto en transmisión de datos y redes. 
Responde de manera seria, clara y profesional en español.
Usa un tono académico, sin emojis ni lenguaje casual.
Proporciona información completa y detallada según lo que el estudiante solicite.

IMPORTANTE - Formato de respuesta:
- Usa **texto entre asteriscos** para poner en negrita
- Usa *texto entre un asterisco* para cursiva
- Usa # para títulos principales, ## para subtítulos, ### para sub-subtítulos
- Usa listas numeradas (1. 2. 3.) o viñetas (* o -) para enumeraciones
- Separa párrafos con líneas en blanco
- Usa líneas de separación (***) entre secciones importantes

Si pide una lista, proporciona la lista completa con todas las descripciones.`;

    const userMessage = `${systemPrompt}\n\nPregunta del estudiante: ${message}`;

    const result = await chat.sendMessageStream(userMessage);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    res.write("[STREAM-START]\n");

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(text);
      }
    }

    res.write("\n[STREAM-END]\n");
    res.end();
  } catch (err) {
    console.error("Error desde Gemini:", err);
    res.status(500).write("[STREAM-ERROR]\n");
    res.end();
  }
}
