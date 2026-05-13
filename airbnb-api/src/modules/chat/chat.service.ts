import mongoose from 'mongoose';
import { ChatMessage, Conversation, IConversation, IMessage } from './chat.model';
import { AppError } from '../../middleware/error.middleware';
import { wsManager } from '../../config/websocket';

const buildConversationKey = (userA: string, userB: string, propertyId: string) =>
  [...[userA, userB].sort(), propertyId].join(':');

const serializeMessage = (message: IMessage) => ({
  _id: message._id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  content: message.content,
  readAt: message.readAt,
  createdAt: message.createdAt,
});

export const chatService = {
  async getOrCreateConversation(
    guestId: string,
    hostId: string,
    propertyId: string
  ): Promise<IConversation> {
    const conversationKey = buildConversationKey(guestId, hostId, propertyId);

    const existing = await Conversation.findOne({
      $or: [
        { conversationKey },
        { participantIds: { $all: [guestId, hostId] }, propertyId },
      ],
    });

    if (existing) {
      if (!existing.conversationKey) {
        existing.conversationKey = conversationKey;
        await existing.save();
      }
      return existing;
    }

    try {
      return await Conversation.create({
        participantIds: [guestId, hostId],
        conversationKey,
        propertyId,
        unreadCounts: {
          [guestId]: 0,
          [hostId]: 0,
        },
      });
    } catch (error: any) {
      if (error.code === 11000) {
        const conversation = await Conversation.findOne({ conversationKey });
        if (conversation) return conversation;
      }
      throw error;
    }
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string
  ) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participantIds: senderId,
    });

    if (!conversation) {
      throw new AppError('Conversation not found or access denied', 404);
    }

    const trimmed = content.trim();
    const recipientId = conversation.participantIds.find((id) => id !== senderId);
    if (!recipientId) throw new AppError('Recipient not found', 500);

    const message = await ChatMessage.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      senderId,
      content: trimmed,
    });

    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          lastMessage: trimmed.substring(0, 100),
          lastMessageAt: message.createdAt,
        },
        $inc: {
          [`unreadCounts.${recipientId}`]: 1,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedConversation) throw new AppError('Failed to send message', 500);

    const payload = {
      type: 'NEW_MESSAGE' as const,
      title: 'New Message',
      message: trimmed.substring(0, 100),
      data: {
        conversationId,
        message: serializeMessage(message),
      },
      timestamp: new Date().toISOString(),
    };

    wsManager.sendToUsers([senderId, recipientId], payload);

    return {
      conversation: updatedConversation,
      message: serializeMessage(message),
    };
  },

  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participantIds: userId,
    }).select({ _id: 1 });

    if (!conversation) {
      throw new AppError('Conversation not found or access denied', 404);
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [total, newestFirst] = await Promise.all([
      ChatMessage.countDocuments({ conversationId }),
      ChatMessage.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
    ]);

    return {
      messages: newestFirst.reverse().map(serializeMessage),
      total,
      page: safePage,
      hasMore: skip + newestFirst.length < total,
    };
  },

  async getUserConversations(userId: string) {
    return await Conversation.find(
      { participantIds: userId },
      {
        participantIds: 1,
        propertyId: 1,
        lastMessage: 1,
        lastMessageAt: 1,
        unreadCounts: 1,
        createdAt: 1,
      }
    ).sort({ lastMessageAt: -1, updatedAt: -1 });
  },

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await Promise.all([
      ChatMessage.updateMany(
        { conversationId, senderId: { $ne: userId }, readAt: null },
        { $set: { readAt: new Date() } }
      ),
      Conversation.updateOne(
        { _id: conversationId, participantIds: userId },
        { $set: { [`unreadCounts.${userId}`]: 0 } }
      ),
    ]);
  },
};
