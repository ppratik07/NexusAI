import { Router } from "express";
import { SigninSchema, SignupSchema } from "../types";
import { SendEmmail } from "../postmark";
import jwt from "jsonwebtoken";
import { TOTP } from "totp-generator";
import base32 from "hi-base32";
import { generateSecret } from "../helpers/generateOTP";

const router = Router();

router.post("/signup", async (req, res) => {
  const { success, data } = SignupSchema.safeParse(req.body);
  if (!success) {
    return res.status(411).json({
      message: "Invalid input",
    });
  }
  const secret = generateSecret(data.email);
  const { otp, expires } = TOTP.generate(secret);
  if (process.env.NODE_ENV === "development") {
    await SendEmmail(
      data.email,
      "Welcome to NexusAI",
      `Your OTP is ${otp}. It will expire in 5 minutes.`
    );
  } else {
    console.log("Generated OTP:", otp, "Expires in:", expires);
  }
  res.json({
    message: "Check your email for OTP",
    success: true,
  });
});

router.post("/signin", (req, res) => {
  const { success, data } = SigninSchema.safeParse(req.body);
  console.log("Data", data);
  console.log("Success", success);
  if (!success) {
    return res.status(411).json({
      message: "Invalid inputs",
    });
  }
  const secret = generateSecret(data.email);
  const { otp } = TOTP.generate(secret);

  console.log("Generated expected OTP:", otp, "User provided:", data.otp);

  if (data.otp !== otp) {
    return res.status(401).json({
      message: "Invalid OTP",
      success: false,
    });
  }
  const userId = "pratik";
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
  res.json({
    token,
    success: true,
  });
});

export default router;
