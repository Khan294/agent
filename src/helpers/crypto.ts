import crypto from "node:crypto";
import { env } from "./env.js";

export function createVisitorToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashVisitorToken(token: string): string {
  return crypto.createHmac("sha256", env.COOKIE_SECRET).update(token).digest("hex");
}
