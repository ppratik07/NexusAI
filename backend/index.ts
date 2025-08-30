import express from "express";
import { CreateChatSchema, Role } from "./types";
import { createCompletion } from "./openrouter";
import { InMemoryStore } from "./InMemoryStore";
import cors from "cors";

const app = express();
const port = 5000;
app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  const { success, data } = CreateChatSchema.safeParse(req.body);
  const conversationId = data?.conversationId || Bun.randomUUIDv7();
  if (!success) {
    return res.status(400).json({ message: "Invalid request" });
  }
  let existingMessages = InMemoryStore.getInstance().get(conversationId);

    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE with client

  let message = "";
  // Event Emitters
  await createCompletion(
    [
      ...existingMessages,
      {
        role: Role.User,
        content: data?.message,
      },
    ],
    data.model,
    (chunk: string) => {
      console.log("Chunk from backend:", chunk);
      message += chunk;
      res.write(chunk);
    }
  );
//   res.end();
  InMemoryStore.getInstance().add(conversationId, {
    role: Role.User,
    content: data?.message,
  });

  InMemoryStore.getInstance().add(conversationId, {
    role: Role.Agent,
    content: data?.message,
  });
  //store im db
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
