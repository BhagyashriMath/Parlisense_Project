import { Request, Response, NextFunction } from "express";
import { authService, AuthUser } from "../services/auth.service";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Parses authentication credentials from:
 * 1. Authorization header: "Bearer <token>"
 * 2. Session headers: "x-session-role", "x-member-id"
 * 3. Query parameter: "?token=<token>"
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 1. Check Bearer Token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const user = authService.verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // 2. Check query param token
  if (typeof req.query.token === "string") {
    const user = authService.verifyToken(req.query.token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // 3. Fallback dev/session headers (for local testing without strict bearer token)
  const headerRole = req.headers["x-session-role"] as string;
  const headerMemberId = req.headers["x-member-id"] as string;
  if (headerRole) {
    const roleClean = headerRole.toLowerCase() as "admin" | "speaker" | "member";
    const memberId = headerMemberId || (roleClean === "speaker" ? "SP001" : roleClean === "member" ? "M001" : "USR-ADM-001");
    const user = await authService.getUserById(memberId);
    if (user && user.role === roleClean) {
      req.user = user;
    }
  }

  // Pass through if unauthenticated (controllers/route guards can enforce requireAuth)
  next();
}

/**
 * Enforce that the user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required. Please log in." });
    return;
  }
  next();
}

/**
 * Enforce role-based access control
 */
export function requireRole(...allowedRoles: Array<"admin" | "speaker" | "member">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Requires ${allowedRoles.join(" or ")} role. Current role: ${req.user.role}`
      });
      return;
    }
    next();
  };
}
