import type { Request, Response, NextFunction } from 'express';

function sanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/[<>]/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = sanitize(v);
    }
    return result;
  }
  return value;
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  next();
}

export function validateRequired(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter(f => !req.body[f] && req.body[f] !== 0);
    if (missing.length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        missing,
      });
      return;
    }
    next();
  };
}
