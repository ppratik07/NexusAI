import { Router } from "express";
import { CreateChatSchema, Role } from "../types";
import { createCompletion } from "../openrouter";
import { InMemoryStore } from "../InMemoryStore";
import { middleware } from "../middleware";
import { PrismaClient } from "../generated/prisma";
const router = Router();

const prismaClient = new PrismaClient();

router.get("/conversations", middleware, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const conversation = await prismaClient.conversation.findMany({
    where: {
      userId,
    },
  });
  res.json({ conversation });
});

router.get("/conversation/:id/messages", middleware, async (req, res) => {
  const userId = req.userId;
  const conversationId = req.params.conversationId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const conversation = await prismaClient.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
  res.json({
    conversation,
  });
});

router.post("/chat", middleware, async (req, res) => {
  const userId = req.userId;
  const { success, data } = CreateChatSchema.safeParse(req.body);
  const conversationId = data?.conversationId || Bun.randomUUIDv7();
  if (!success) {
    return res.status(400).json({ message: "Invalid request" });
  }

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let existingMessages = InMemoryStore.getInstance().get(conversationId);

  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Connection", "keep-alive");
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
    content: message,
  });

  if (!data.conversationId) {
    await prismaClient.conversation.create({
      data: {
        id: conversationId,
        userId,
        // messages:{
        //   create:[
        //     {
        //       content : data.message,
        //       role: Role.User
        //     },
        //     {
        //       content : message,
        //       role: Role.Agent
        //     }
        //   ]
        // }
      },
    });
  }
  // createMany is used to insert multiple messages at once
  await prismaClient.message.createMany({
    data: [
      {
        conversationId,
        content: message,
        role: Role.Agent,
      },
      {
        conversationId,
        content: data.message,
        role: Role.User,
      },
    ],
  });
});
export default router;
