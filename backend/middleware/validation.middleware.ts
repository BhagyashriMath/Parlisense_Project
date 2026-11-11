import { Request, Response, NextFunction } from "express";

/**
 * Validate required fields in request body
 */
export function validateBody(...requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing: string[] = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === "") {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`
      });
      return;
    }
    next();
  };
}

/**
 * Validate required route parameters
 */
export function validateParams(...requiredParams: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing: string[] = [];
    for (const param of requiredParams) {
      if (!req.params[param]) {
        missing.push(param);
      }
    }
    if (missing.length > 0) {
      res.status(400).json({
        error: `Missing required route parameter: ${missing.join(", ")}`
      });
      return;
    }
    next();
  };
}
