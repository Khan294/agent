import type { Request, Response } from "express";
import { createVisitorToken, hashVisitorToken } from "../helpers/crypto.js";
import { prisma } from "../helpers/prisma.js";

export const visitorCookieName = "agent_demo_visitor";

export async function resolveVisitor(req: Request, res: Response) {
  let token = req.cookies?.[visitorCookieName] as string | undefined;

  if (!token) {
    token = createVisitorToken();
    res.cookie(visitorCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.secure || req.headers["x-forwarded-proto"] === "https",
      path: "/"
    });
  }

  const visitorTokenHash = hashVisitorToken(token);

  return prisma.visitor.upsert({
    where: { visitorTokenHash },
    update: { lastSeenAt: new Date() },
    create: { visitorTokenHash }
  });
}
