import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Gemini
if (!process.env.GEMINI_API_KEY) {
  console.error("Falta GEMINI_API_KEY en .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-pro",
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Sirve frontend

// ENDPOINT STREAM
app.post("/api/chat-stream", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).send("Mensaje vacío.");
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

    // ✅ SISTEMA OPTIMIZADO - Más rápido y directo
    const systemPrompt = `Eres un profesor experto en transmisión de datos y redes. 
Responde de manera seria, clara y profesional en español.
Usa un tono académico, sin emojis ni lenguaje casual.
Sé conciso pero completo. Proporciona información directa y bien estructurada.

IMPORTANTE - Formato de respuesta:
- Usa **texto entre asteriscos** para poner en negrita
- Usa *texto entre un asterisco* para cursiva
- Usa # para títulos principales, ## para subtítulos, ### para sub-subtítulos
- Usa listas numeradas (1. 2. 3.) o viñetas (* o -) para enumeraciones
- Separa párrafos con líneas en blanco
- Ve directo al punto sin introducciones largas`;

    const userMessage = `${systemPrompt}\n\nPregunta: ${message}`;

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
    res.write("[STREAM-ERROR]\n");
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
