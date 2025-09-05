import { Router } from "express";
import { SigninSchema, SignupSchema } from "../types";
import { SendEmmail } from "../postmark";
import jwt from "jsonwebtoken";
import { TOTP } from "totp-generator";
import base32 from "hi-base32";
import { generateSecret } from "../helpers/generateOTP";
import { PrismaClient } from "../generated/prisma";

const router = Router();
// Temporarily adding local user otp cache
const otpCache = new Map<string, string>();

const prismaClient = new PrismaClient();
router.post("/signup", async (req, res) => {
  const { success, data } = SignupSchema.safeParse(req.body);
  if (!success) {
    return res.status(411).json({
      message: "Invalid input",
    });
  }
  //const secret = generateSecret(data.email);
  const { otp, expires } = TOTP.generate(
    base32.encode(data.email + process.env.JWT_SECRET!)
  );
  console.log("email is", data.email);
  console.log("otp is", otp);
  if (process.env.NODE_ENV === "development") {
    await SendEmmail(
      data.email,
      "Welcome to NexusAI",
      `Your OTP is ${otp}. It will expire in 5 minutes.`
    );
  } else {
    console.log("Generated OTP:", otp, "Expires in:", expires);
  }
  otpCache.set(data.email, otp);
  try {
    await prismaClient.user.create({
      data: {
        email: data.email,
      },
    });
  } catch (error) {
    console.log("User already exists", error);
  }

  res.json({
    message: "Check your email for OTP",
    success: true,
  });
});

router.post("/signin", async (req, res) => {
  const { success, data } = SigninSchema.safeParse(req.body);
  console.log("Data", data);
  console.log("Success", success);
  if (!success) {
    return res.status(411).json({
      message: "Invalid inputs",
    });
  }
  console.log("otpCache is", otpCache.get(data.email));

  if (otpCache.get(data.email) != data.otp) {
    console.log("invalid otp");
    res.status(401).json({
      message: "Invalid otp",
    });
    return;
  }
  const user = await prismaClient.user.findFirst({
    where: {
      email: data.email,
    },
  });
  if (!user) {
    res.json({
      message: "User not found",
      success: false,
    });
    return;
  }
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
  res.json({
    token,
    success: true,
  });
});

export default router;
