"use client";

import { useEffect, useState } from "react";

const BACKEND_URL = "http://localhost:5000";

export default function ChatComponent() {
  const [output, setOutput] = useState("");

  useEffect(() => {
    const fetchStream = async () => {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "What is 2+2",
          model: "deepseek/deepseek-r1",
        }),
      });

      if (!response.body) {
        console.error("No response body");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // decode and append streamed chunk
        const chunk = decoder.decode(value, { stream: true });
        console.log('Received chunk:',chunk);
        result += chunk;
        setOutput((prev) => prev + chunk);
      }
    };

    fetchStream();
  }, []);

  return (
    <div className="p-4">
      <h2 className="font-bold">AI Response:</h2>
      <pre className="whitespace-pre-wrap">{output}</pre>
    </div>
  );
}
