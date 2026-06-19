import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: string;
  content: string;
  readAt?: Date | null;
  createdAt: Date;
}

export interface IConversation extends Document {
  participantIds: string[];
  conversationKey: string;
  propertyId: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCounts: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const ConversationSchema = new Schema<IConversation>(
  {
    participantIds: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length === 2,
        message: 'A conversation must have exactly 2 participants',
      },
    },
    conversationKey: {
      type: String,
      required: true,
    },
    propertyId: {
      type: String,
      required: true,
      index: true,
    },
    lastMessage: String,
    lastMessageAt: Date,
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ participantIds: 1 });
ConversationSchema.index(
  { conversationKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      conversationKey: { $type: 'string' },
    },
  }
);
ConversationSchema.index({ lastMessageAt: -1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, readAt: 1 });

export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  ConversationSchema
);

export const ChatMessage = mongoose.model<IMessage>(
  'ChatMessage',
  MessageSchema
);
