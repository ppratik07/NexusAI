import type { Message } from "./types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_TOKEN_ITERATIONS = 1000;

if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

export const createCompletionGemini = async (
  messages: Message[],
  model: string, // e.g. "gemini-1.5-flash" or "gemini-1.5-pro"
  cb: (chunk: string) => void,
  systemPrompt?: string
) => {
  return new Promise<void>((resolve, reject) => {
    (async () => {
      try {
        const contents = [
          ...(systemPrompt
            ? [{ role: "model", parts: [{ text: systemPrompt }] }]
            : []),
          ...messages.map((m) => ({
            role: (m.role as any) === "system" ? "model" : (m.role as any), // Gemini doesn't have "system"
            parts: [{ text: m.content }],
          })),
        ];

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              },
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
              ],
            }),
          }
        );

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is not readable");

        const decoder = new TextDecoder();
        let buffer = "";
        let tokenIterations = 0;

        while (true) {
          tokenIterations++;
          if (tokenIterations > MAX_TOKEN_ITERATIONS) {
            resolve();
            return;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            if (line.startsWith("data:")) {
              const jsonStr = line.slice(5).trim();
              if (jsonStr === "[DONE]") {
                resolve();
                return;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) cb(text);
              } catch (e) {
                // ignore invalid json
              }
            }
          }
        }

        resolve();
        reader.cancel();
      } catch (err) {
        reject(err);
      }
    })();
  });
};
