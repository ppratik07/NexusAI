import crypto from "crypto";
import base32 from "hi-base32";

export function generateSecret(email: string) {
  const hash = crypto.createHash("sha1").update(email + process.env.JWT_SECRET!).digest();
  return base32.encode(hash).replace(/=+$/, ""); // strip padding
}