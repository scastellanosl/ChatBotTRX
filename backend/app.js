// app.js - Frontend mejorado para Gemini

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const clearBtn = document.getElementById("clear");

function createMessageEl(role, text) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "bot");

  const bubble = document.createElement("div");
  bubble.className = "bubble " + (role === "user" ? "user" : "bot");

  // Mantener saltos de línea y romper palabras largas
  bubble.style.whiteSpace = "pre-wrap";
  bubble.style.wordWrap = "break-word";
  bubble.style.overflowWrap = "break-word";

  bubble.textContent = text;
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);

  // Scroll automático al final
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return bubble;
}

sendBtn.onclick = async () => {
  const txt = inputEl.value.trim();
  if (!txt) return;

  // Deshabilitar input mientras se envía
  inputEl.disabled = true;
  sendBtn.disabled = true;

  // Agregar mensaje del usuario
  createMessageEl("user", txt);
  inputEl.value = "";

  // Crear burbuja del bot que se actualizará
  const botBubble = createMessageEl("bot", "⏳ Procesando...");

  try {
    const controller = new AbortController();

    const resp = await fetch("/api/chat-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: txt }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const err = await resp.text();
      botBubble.textContent = "❌ Error: " + (err || resp.statusText);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // Limpiar marcadores del backend
      const cleaned = chunk
        .replace(/\[STREAM-START\]\n?/g, "")
        .replace(/\[STREAM-END\]\n?/g, "")
        .replace(/\[STREAM-ERROR\]\n?/g, "");

      accumulated += cleaned;

      // Actualizar el texto en tiempo real SIN trim() para no cortar contenido
      botBubble.textContent = accumulated || "⏳ Procesando...";

      // Scroll automático
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // Respuesta final (opcional: trim() aquí para limpiar espacios iniciales/finales)
    if (!accumulated.trim()) {
      botBubble.textContent =
        "⚠️ Respuesta vacía. Por favor, intenta de nuevo.";
    }
  } catch (e) {
    console.error("Stream error:", e);
    botBubble.textContent = "❌ Error: " + e.message;
  } finally {
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
};

clearBtn.onclick = () => {
  if (confirm("¿Limpiar el historial de conversación?")) {
    messagesEl.innerHTML = "";
  }
};

// Permitir Enter para enviar
inputEl.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});
