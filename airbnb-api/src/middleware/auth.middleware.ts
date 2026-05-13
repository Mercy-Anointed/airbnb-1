import { Request,Response, NextFunction } from "express";
import { TokenPayload } from "../modules/auth/auth.service";
import { AppError } from "./error.middleware";
import jwt from 'jsonwebtoken'
import { env } from "../config/env";
import { prisma } from "../config/database";

declare global{
    namespace Express {
        interface Request {
            user?: TokenPayload
        }
    }
}

// ─── Authenticate Middleware ──────────────────────────────────────────────────
// Verifies JWT access token on every protected request
// Attaches decoded user payload to req.user
export const authenticate = async (req:Request, res: Response, next: NextFunction): Promise<void> => {
    try {
         // Step 1 — Extract token from Authorization header
    // Standard format: "Bearer eyJhbGciOiJIUzI1NiJ9..."
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer')){
            throw new AppError('No token provided', 401);
        }
         // Step 2 — Extract the token part after "Bearer "
        const token = authHeader.split(' ')[1];
        if (!token){
            throw new AppError('No token provided', 401)
        }
         // Step 3 — Verify token signature and expiry
    // jwt.verify throws if:
    //   → Token is tampered with (signature mismatch)
    //   → Token is expired
    //   → Token is malformed
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload
    const activeUser = await prisma.user.findFirst({
        where: { id: decoded.userId, deletedAt: null },
        select: { id: true },
    });
    if (!activeUser) {
        throw new AppError('Invalid or expired token', 401);
    }
     // Step 4 — Attach user to request
    // Every controller after this can access req.user
    // req.user.userId, req.user.email, req.user.role
    req.user = decoded;
     // Step 5 — Pass to next middleware or controller
        next();
    } catch (error) {
         // jwt.verify throws JsonWebTokenError or TokenExpiredError
    // We catch both and return a clean 401
    if (error instanceof AppError){
        next(error);
        return;
    }
    next(new AppError('Invalid or expired token', 401));
    }
};

// ─── Optional Auth Middleware ─────────────────────────────────────────────────
// For routes that work both authenticated and unauthenticated
// Example: GET /properties — guests see listings, logged in users see favorites
// If token exists and valid → attaches req.user
// If no token → continues without req.user (no error)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> =>{
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer')){
            return next() // no token — continue as guest
        }
        const token = authHeader.split(' ')[1]
        if (!token) return next();

        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
        const activeUser = await prisma.user.findFirst({
            where: { id: decoded.userId, deletedAt: null },
            select: { id: true },
        });
        if (!activeUser) return next();
        req.user = decoded;
        next();
    } catch (error) {
        // Invalid token — treat as unauthenticated guest
    // Don't throw — just continue without req.user
    next()
    }
}
