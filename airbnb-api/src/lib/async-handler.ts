import { Request, Response, NextFunction, RequestHandler } from 'express';

// Wraps async route handlers to catch promise rejections
// Without this you need try/catch in every single controller function
// With this — any thrown error automatically goes to error middleware
// This is standard in every production Express codebase
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};