import { Request, Response } from 'express';
import { userService } from './user.service';
import { ApiResponse } from '../../lib/api-response';
import { UserParams, UserQuery, UpdateRoleInput } from './user.schema';

// ─── Get All Users ────────────────────────────────────────────────────────────
// Admin only — RBAC enforced in Week 5
export const getUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const query = req.query as unknown as UserQuery;
  const result = await userService.getUsers(query);
  ApiResponse.success(res, result);
};

// ─── Get User Profile ─────────────────────────────────────────────────────────
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as UserParams;
  const user = await userService.getUserById(id);
  ApiResponse.success(res, user);
};

// ─── Get My Profile ───────────────────────────────────────────────────────────
// Returns the currently authenticated user's profile
// TODO: replace placeholder with req.user.id after Week 4 auth
export const getMyProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user!.userId
  const user = await userService.getUserById(userId);
  ApiResponse.success(res, user);
};

// ─── Update Profile ───────────────────────────────────────────────────────────
// TODO: replace placeholder with req.user.id after Week 4 auth
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user!.userId
  const user = await userService.updateProfile(userId, req.body);
  ApiResponse.success(res, user);
};

// ─── Update User Role ─────────────────────────────────────────────────────────
// Admin only — RBAC enforced in Week 5
export const updateRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as UserParams;
  const result = await userService.updateRole(id, req.body as UpdateRoleInput);
  ApiResponse.success(res, result);
};

// ─── Delete User ──────────────────────────────────────────────────────────────
// Admin only — RBAC enforced in Week 5
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as UserParams;
  const result = await userService.deleteUser(id);
  ApiResponse.success(res, result);
};