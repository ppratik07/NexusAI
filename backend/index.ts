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



app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
