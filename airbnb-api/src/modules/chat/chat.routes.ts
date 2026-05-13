import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { chatService } from './chat.service';
import { asyncHandler } from '../../lib/async-handler';
import { AppError } from '../../middleware/error.middleware';
import mongoose from 'mongoose';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// ── Start or get a conversation ───────────────────────────────────────────────
router.post('/conversations', asyncHandler(async (req: Request, res: Response) => {
  const { hostId, propertyId } = req.body;
  const guestId = req.user!.userId;

  if (!hostId || !propertyId) {
    throw new AppError('hostId and propertyId are required', 400);
  }

  if (guestId === hostId) {
    throw new AppError('You cannot start a conversation with yourself', 400);
  }

  const conversation = await chatService.getOrCreateConversation(
    guestId,
    hostId,
    propertyId
  );

  res.status(200).json({ success: true, data: conversation });
}));

// ── Send a message ────────────────────────────────────────────────────────────
router.post('/conversations/:id/messages', asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body;
  const senderId = req.user!.userId;

  // ── Validate MongoDB ObjectId BEFORE using it ─────────────────────────────
  // Must come first — if ID is invalid, no point doing anything else
  // req.params.id is typed as string in Express — safe to use directly
  const conversationId = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('Invalid conversation ID', 400);
  }

  if (!content?.trim()) {
    throw new AppError('Message content is required', 400);
  }

  if (content.trim().length > 2000) {
    throw new AppError('Message content must be 2000 characters or less', 400);
  }

  const result = await chatService.sendMessage(
    conversationId,
    senderId,
    content
  );

  res.status(201).json({ success: true, data: result });
}));

// ── Get messages for a conversation ──────────────────────────────────────────
router.get('/conversations/:id/messages', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const conversationId = req.params.id as string;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

  // ── Validate BEFORE querying ──────────────────────────────────────────────
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('Invalid conversation ID', 400);
  }

  const result = await chatService.getMessages(conversationId, userId, page, limit);

  // Mark as read when conversation is opened
  await chatService.markAsRead(conversationId, userId);

  res.status(200).json({ success: true, data: result });
}));

// ── Get user's inbox ──────────────────────────────────────────────────────────
router.get('/conversations', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const conversations = await chatService.getUserConversations(userId);
  res.status(200).json({ success: true, data: conversations });
}));

export default router;
