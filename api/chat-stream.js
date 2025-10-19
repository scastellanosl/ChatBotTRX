// api/chat-stream.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = req.body?.message || "Hola, soy un bot Gemini!";
    const result = await model.generateContent(prompt);

    res.status(200).send(result.response.text());
  } catch (err) {
    console.error(err);
    res.status(500).send("Error interno del servidor: " + err.message);
  }
};
