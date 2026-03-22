import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { redis } from "../config/redis";
import { env } from "../config/env";
import { UserRole } from "../models/User";

export interface TokenPayload {
  userId: string;
  walletAddress: string;
  role: UserRole;
  sessionId: string;
}

// Create a JWT and store session in Redis (24h TTL)
export async function createSession(
  userId: string,
  walletAddress: string,
  role: UserRole
): Promise<string> {
  const sessionId = uuidv4();

  const payload: TokenPayload = { userId, walletAddress, role, sessionId };

  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as string,
  } as jwt.SignOptions);

  const sessionData = JSON.stringify({ userId, walletAddress, role });
  await redis.setex(`session:${sessionId}`, 86400, sessionData);

  return token;
}

// Verify JWT and check session is still active in Redis
export async function verifySession(token: string): Promise<TokenPayload | null> {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;

    const session = await redis.get(`session:${payload.sessionId}`);
    if (!session) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function destroySession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}

// Destroy all sessions for a user (used after password reset)
export async function destroyAllUserSessions(userId: string): Promise<void> {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "session:*", "COUNT", 100);
    cursor = nextCursor;

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.userId === userId) {
          await redis.del(key);
        }
      }
    }
  } while (cursor !== "0");
}
