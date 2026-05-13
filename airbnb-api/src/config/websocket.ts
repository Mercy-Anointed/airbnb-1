import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { logger } from './logger';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_PENDING'
  | 'NEW_REVIEW'
  | 'NEW_MESSAGE'
  | 'SYSTEM';

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server });
    logger.info('WebSocket server initialized');

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      try {
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
          userId: string;
        };

        ws.userId = payload.userId;
        ws.isAlive = true;

        const sockets = this.clients.get(payload.userId) ?? new Set();
        sockets.add(ws);
        this.clients.set(payload.userId, sockets);

        logger.info(`WebSocket authenticated for user: ${payload.userId}`);

        this.sendToSocket(ws, {
          type: 'SYSTEM',
          title: 'Connected',
          message: 'Real-time notifications active',
          timestamp: new Date().toISOString(),
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'PONG') ws.isAlive = true;
          } catch {
            // Ignore malformed client messages.
          }
        });

        ws.on('close', () => {
          this.removeSocket(ws);
          logger.info(`WebSocket disconnected for user: ${ws.userId}`);
        });

        ws.on('error', (error) => {
          logger.error(`WebSocket error for user ${ws.userId}:`, error);
          this.removeSocket(ws);
        });
      } catch {
        ws.close(1008, 'Invalid token');
        logger.warn('WebSocket connection rejected: invalid token');
      }
    });

    const heartbeatInterval = setInterval(() => {
      this.clients.forEach((sockets, userId) => {
        sockets.forEach((ws) => {
          if (!ws.isAlive) {
            logger.info(`Removing dead WebSocket connection for user: ${userId}`);
            sockets.delete(ws);
            ws.terminate();
            return;
          }

          ws.isAlive = false;
          this.sendToSocket(ws, {
            type: 'SYSTEM',
            title: 'Ping',
            message: 'ping',
            timestamp: new Date().toISOString(),
          });
        });

        if (sockets.size === 0) this.clients.delete(userId);
      });
    }, 30000);

    this.wss.on('close', () => clearInterval(heartbeatInterval));
  }

  sendToUser(userId: string, payload: NotificationPayload): boolean {
    const sockets = this.clients.get(userId);

    if (!sockets?.size) {
      logger.info(`User ${userId} not connected: notification not sent via WS`);
      return false;
    }

    let sent = false;
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToSocket(ws, payload);
        sent = true;
      }
    });

    return sent;
  }

  sendToUsers(userIds: string[], payload: NotificationPayload): void {
    userIds.forEach((userId) => this.sendToUser(userId, payload));
  }

  broadcast(payload: NotificationPayload): void {
    this.clients.forEach((sockets) => {
      sockets.forEach((ws) => this.sendToSocket(ws, payload));
    });
  }

  getStats(): { connectedUsers: number; openSockets: number } {
    let openSockets = 0;
    this.clients.forEach((sockets) => {
      openSockets += sockets.size;
    });

    return { connectedUsers: this.clients.size, openSockets };
  }

  private removeSocket(ws: AuthenticatedWebSocket): void {
    if (!ws.userId) return;
    const sockets = this.clients.get(ws.userId);
    if (!sockets) return;
    sockets.delete(ws);
    if (sockets.size === 0) this.clients.delete(ws.userId);
  }

  private sendToSocket(ws: AuthenticatedWebSocket, payload: NotificationPayload): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error);
    }
  }
}

export const wsManager = new WebSocketManager();
