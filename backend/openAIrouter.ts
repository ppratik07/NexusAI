import type { Message, MODEL, SUPPORTED_MODELS } from "./types";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_TOKEN_ITERATIONS = 1000;

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

export const createCompletion = async (
  messages: Message[],
  model: MODEL,
  cb: (chunk: string) => void,
  systemPrompt?: string
) => {
  return new Promise<void>((resolve, reject) => {
    console.log("Message from postman", messages);
    (async () => {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model, // e.g. "gpt-4o-mini" or "gpt-4o"
            messages: systemPrompt
              ? [{ role: "system", content: systemPrompt }, ...messages]
              : messages,
            stream: true,
          }),
        });

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          let tokenIterations = 0;
          while (true) {
            tokenIterations++;
            if (tokenIterations > MAX_TOKEN_ITERATIONS) {
              console.log("max token iterations");
              resolve();
              return;
            }

            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            while (true) {
              const lineEnd = buffer.indexOf("\n");
              if (lineEnd === -1) break;

              const line = buffer.slice(0, lineEnd).trim();
              buffer = buffer.slice(lineEnd + 1);

              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  resolve();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    cb(content);
                  }
                } catch (e) {
                  // Ignore invalid JSON
                }
              }
            }
          }
        } finally {
          resolve();
          reader.cancel();
        }
      } catch (err) {
        reject(err);
      }
    })();
  });
};
