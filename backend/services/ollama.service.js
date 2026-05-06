import { ENV } from "../config/env.js";

export class OllamaService {

  async generate(promptText) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": "Bearer " + ENV.GROQ_API_KEY
      },
      body: JSON.stringify({
        model:       ENV.GROQ_MODEL,
        messages:    [{ role: "user", content: promptText }],
        max_tokens:  1024,
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error("Groq HTTP " + response.status);

    const data = await response.json();
    if (!data || !data.choices || !data.choices[0])
      throw new Error("Respuesta inválida de Groq");

    return data.choices[0].message.content;
  }
}