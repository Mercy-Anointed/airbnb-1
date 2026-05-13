import { UserRole } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { AppError } from "./error.middleware";
import { TokenPayload } from "../modules/auth/auth.service";

// requireRole middleware factory
// Takes one or more roles — user must have ONE of them to proceed
// Always used AFTER authenticate middleware
// authenticate sets req.user → requireRole reads it
export const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Step 1 — Check user is authenticated
    // Should never hit this if authenticate runs first
    // Defensive check in case requireRole is used without authenticate
         if (!req.user){
            next(new AppError('Unauthorized', 401));
            return;
         }
          // Step 2 — Cast role to UserRole for type-safe comparison
    // req.user.role is string (from JWT payload)
    // allowedRoles is UserRole[] (Prisma enum)
    // casting makes TypeScript happy and comparison work correctly
    const userRole = req.user.role as UserRole;

      if (!allowedRoles.includes(userRole)){
        next(new AppError('Forbidden - insufficient permissions', 403));
        return; 
      }
        // Step 3 — Role is allowed, continue
      next();
    };

     
}