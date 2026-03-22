import { Request, Response, NextFunction } from "express";
import { verifySession, TokenPayload } from "../services/session.service";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Verify JWT from httpOnly cookie and check Redis session
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "Not authenticated. Please log in." });
    return;
  }

  const payload = await verifySession(token);

  if (!payload) {
    res.status(401).json({ error: "Session expired or invalid. Please log in again." });
    return;
  }

  req.user = payload;
  next();
}

// Role-based access control — use after authMiddleware
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Access denied. Insufficient permissions." });
      return;
    }

    next();
  };
}
