"use client";

import { useEffect, useState } from "react";

const BACKEND_URL = "http://localhost:5000";

export default function Home() {
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStream = async () => {
      setLoading(true);
      try {
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

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body received");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("Stream complete");
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log("Received chunk:", chunk);

          // Append chunk to UI
          setOutput((prev) => prev + chunk);
        }
      } catch (err) {
        console.error("Stream error:", err);
        setError(err instanceof Error ? err.message : String(err) || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchStream();
  }, []);

  return (
    <div className="p-4">
      <h2 className="font-bold mb-2">AI Response:</h2>

      {error && <p className="text-red-600">Error: {error}</p>}

      {loading && !error && <p className="text-gray-500">Streaming...</p>}

      <pre className="whitespace-pre-wrap text-sm bg-black p-2 rounded-md">
        {output}
      </pre>
    </div>
  );
}
