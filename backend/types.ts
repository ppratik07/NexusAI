import { email, z } from "zod";

const MAX_INPUT_TOKENS = 1000;
export const SUPPORTED_MODELS = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "deepseek/deepseek-r1",
  "Gemini 2.5 Flash Image Preview",
  "gpt-4o"
];
export type MODEL = (typeof SUPPORTED_MODELS)[number];

export const CreateChatSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().max(MAX_INPUT_TOKENS),
  model: z.enum(SUPPORTED_MODELS),
});

export const SignupSchema = z.object({
  email: z.email(),
});

export const SigninSchema = z.object({
  email: z.email(),
  otp : z.string(),
})
// export type Model = "openai/gpt-4o" | "openai/gpt-4o-mini";

export enum Role {
  Agent = "assistant",
  User = "user",
}

export type Message = {
  content: string;
  role: Role;
};

export type Messages = Message[];
