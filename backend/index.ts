import express from "express";
import { CreateChatSchema, Role } from "./types";
import { createCompletion } from "./openrouter";
import { InMemoryStore } from "./InMemoryStore";
import cors from "cors";
import authRouter from "./routes/auth";
import aiRouter from "./routes/ai";
import { middleware } from "./middleware";
import { PrismaClient } from "./generated/prisma";

const app = express();
const port = 5000;
app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);
app.use("/ai", aiRouter);

const prismaClient = new PrismaClient();
app.post("/chat",middleware, async (req, res) => {
  const userId = req.userId;
  const { success, data } = CreateChatSchema.safeParse(req.body);
  const conversationId = data?.conversationId || Bun.randomUUIDv7();
  if (!success) {
    return res.status(400).json({ message: "Invalid request" });
  }

  // Ensure we have a userId (Prisma expects a defined string for required fields)
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
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

  // store the agent reply (use the generated message, not the user message)
  InMemoryStore.getInstance().add(conversationId, {
    role: Role.Agent,
    content: message,
  });

if(!data.conversationId){
  await prismaClient.conversation.create({
    data:{
      userId,
      messages:{
        create:[
          {
            content : data.message,
            role: Role.User
          },
          {
            content : message,
            role: Role.Agent
          }
        ]
      }
    }
  })
}else{
  // createMany is used to insert multiple messages at once
  await prismaClient.message.createMany({
    data:[
      {
        conversationId,
        content: message,
        role: Role.Agent
      },
      {
        conversationId,
        content : data.message,
        role: Role.User
      }
    ]
  })
}
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
