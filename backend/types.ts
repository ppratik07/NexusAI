import {z} from "zod";

const MAX_INPUT_TOKENS = 1000;
export const SUPPORTED_MODELS = ["openai/gpt-4o", "openai/gpt-4o-mini"];
export type MODEL = typeof SUPPORTED_MODELS[number]; 

export const CreateChatSchema = z.object({
    conversationId : z.string().optional(),
    message : z.string().max(MAX_INPUT_TOKENS),
    model : z.enum(SUPPORTED_MODELS)
})

// export type Model = "openai/gpt-4o" | "openai/gpt-4o-mini";

export enum Role {
    Agent = "assistant",
    User = "user"
}

export type Message = {
  content: string;
  role: Role;
}

export type Messages = Message[];