import { Request, Response, NextFunction } from "express";

/**
 * Centralized JSON Error Handler
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "An unexpected server error occurred";

  res.status(statusCode).json({
    error: message,
    status: statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
}
