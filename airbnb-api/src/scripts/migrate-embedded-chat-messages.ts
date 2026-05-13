import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { ChatMessage, Conversation } from '../modules/chat/chat.model';
import { logger } from '../config/logger';

type LegacyConversation = {
  _id: mongoose.Types.ObjectId;
  messages?: Array<{
    _id?: mongoose.Types.ObjectId;
    senderId: string;
    content: string;
    readAt?: Date | null;
    createdAt?: Date;
  }>;
};

const run = async () => {
  await mongoose.connect(env.MONGODB_URI);

  const legacyConversations = await mongoose.connection
    .collection<LegacyConversation>('conversations')
    .find({ messages: { $exists: true, $not: { $size: 0 } } })
    .toArray();

  let migratedMessages = 0;

  for (const conversation of legacyConversations) {
    const messages = conversation.messages ?? [];

    for (const message of messages) {
      const exists = await ChatMessage.exists({
        conversationId: conversation._id,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      });

      if (exists) continue;

      await ChatMessage.create({
        conversationId: conversation._id,
        senderId: message.senderId,
        content: message.content,
        readAt: message.readAt ?? null,
        createdAt: message.createdAt ?? new Date(),
      });
      migratedMessages += 1;
    }

    await Conversation.updateOne(
      { _id: conversation._id },
      { $unset: { messages: '' } }
    );
  }

  logger.info(`Migrated ${migratedMessages} embedded chat message(s)`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  logger.error('Embedded chat migration failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
