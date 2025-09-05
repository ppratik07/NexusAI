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

router.get("/conversations/:id", middleware, async (req, res) => {
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

  if(!existingMessages.length){
    const messages = await prismaClient.message.findMany({
      where :{
        conversationId
      }
    })
    messages.map((message)=>{
      InMemoryStore.getInstance().add(conversationId,{
        role: message.role as Role,
        content: message.content
      })
    })
    existingMessages = InMemoryStore.getInstance().get(conversationId);
    console.log('existing',existingMessages);
  }

    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE with client

  let message = "";
  // Event Emitters
  try {
        const chat = await createCompletion([...existingMessages, {
            role: Role.User,
            content: data.message
        }], data.model, (chunk: string) => {
            console.log("Chunk from backend:", chunk);
            message += chunk;
            // Format as proper SSE data
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        });
        console.log("Full message:", chat);
        // Send completion signal
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        
    } catch (error) {
        console.error("Error in completion:", error);
        res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
    } finally {
        res.end(); // Always end the response
    }
  InMemoryStore.getInstance().add(conversationId, {
    role: Role.User,
    content: data?.message,
  });

  InMemoryStore.getInstance().add(conversationId, {
    role: Role.Agent,
    content: message,
  });

  if (!data.conversationId) {
    const a= await prismaClient.conversation.create({
      data: {
        title: data.message.slice(0, 20) + "...",
        id: conversationId,
        userId,
      },
    });
    console.log('aaa',a);
  }
  // createMany is used to insert multiple messages at once
  const b= await prismaClient.message.createMany({
    data: [
      {
        conversationId,
        content: data.message,
        role: Role.User,
      },
      {
        conversationId,
        content: message,
        role: Role.Agent,
      },
    ],
  });
  console.log('bbb',b);
});
export default router;
