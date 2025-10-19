import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido. Usa POST.");
  }

  const { message } = req.body;
  if (!message) return res.status(400).send("Mensaje vacío.");

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Falta GEMINI_API_KEY en variables de entorno");
    return res.status(500).send("Falta configuración del servidor.");
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-pro" });

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
      if (text) res.write(text);
    }
    res.write("\n[STREAM-END]\n");
    res.end();
  } catch (error) {
    console.error("Error desde Gemini:", error);
    res.status(500).send("Error interno del servidor.");
  }
};
