import { ApiResponse } from "../../lib/api-response";
import { ChangePasswordInput, LoginInput, RegisterInput } from "./auth.schema";
import { authService } from "./auth.service";
import { Request, Response } from "express";
import { AppError } from "../../middleware/error.middleware";


// ─── Cookie Config ────────────────────────────────────────────────────────────

// Centralized cookie options — same config used for set and clear
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const isProd = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ─── Register ─────────────────────────────────────────────────────────────
// 
// ─── Register ─────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  const result = await authService.register(req.body as RegisterInput);
  // No cookie yet — user must verify OTP first before getting tokens
  ApiResponse.created(res, result);
}


  // ─── Login ────────────────────────────────────────────────────────────────────
  export const login = async(req: Request, res: Response): Promise<void> => {
    const {accessToken, refreshToken, user} = await authService.login(
        req.body as LoginInput
    )
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

    ApiResponse.success(res, {
        accessToken,
        user
    })
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────────
  export const refreshToken = async(req: Request, res: Response): Promise<void> => {
     // Read refresh token from cookie — not from body
  // This is why we store it in a cookie
    const token = req.cookies[REFRESH_TOKEN_COOKIE];
    if (!token) {
        throw new AppError('No refresh token provided', 401)
    }
    const {accessToken, refreshToken: newRefreshToken} = await authService.refreshAccessToken(token);
      // Set new refresh token cookie — replaces old one
      res.cookie(REFRESH_TOKEN_COOKIE, newRefreshToken, cookieOptions);
    ApiResponse.success(res,{accessToken})
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────
  export const logout = async(req: Request, res:Response): Promise<void>=> {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];

     // If token exists — delete from database
     if (token){
        await authService.logout(token)
     }

      // Clear the cookie regardless
      res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);

      ApiResponse.success(res, {message:'Logged out successfully'})
  }

  // ─── Logout All Devices ───────────────────────────────────────────────────────
  export const logoutAllDevices = async (req: Request, res: Response): Promise<void>=> {
    await authService.logoutAllDevices(req.user!.userId);
    res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions)

    ApiResponse.success(res, {message: 'Logged out from all devices'})
  }

  // ─── Get Current User ─────────────────────────────────────────────────────────
// Returns the currently authenticated user's profile
// req.user is set by authenticate middleware
export const getMe = async(
    req: Request, res: Response
): Promise<void>=> {
    const user = await authService.getMe(req.user!.userId);
    ApiResponse.success(res, user)
}

export const changePassword = async (req:Request, res: Response): Promise<void>=>{
    const {currentPassword, newPassword} = req.body as ChangePasswordInput;
    await authService.changePassword(
        req.user!.userId,
        currentPassword,
        newPassword
    );

      // Clear cookie — user must log in again on all devices
    res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
    ApiResponse.success(res, {message: 'Password changed successfully'})
    
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { accessToken, refreshToken, user } = await authService.verifyOtp(req.body);

  // NOW we set the cookie — user is fully verified
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

  ApiResponse.success(res, {
    accessToken,
    user,
    message: 'Email verified successfully. Welcome!'
  });
}

// ─── Resend OTP ───────────────────────────────────────────────────────────────
export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  await authService.resendOtp(req.body.email);
  ApiResponse.success(res, {
    message: 'If that email exists and is unverified, a new code has been sent.'
  });
}