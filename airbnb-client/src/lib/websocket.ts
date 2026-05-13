import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from './api';
import { Notification } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

export const useWebSocket = (
  onNotification: (notification: Notification) => void,
  enabled: boolean = true
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const createConnection = () => {
      const token = getAccessToken();
      if (!token) return;

      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(`${WS_URL}?token=${token}`);

      ws.onopen = () => setIsConnected(true);

      ws.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          if (notification.message === 'ping') {
            ws.send(JSON.stringify({ type: 'PONG' }));
            return;
          }
          if (notification.type !== 'SYSTEM') {
            onNotification(notification);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(createConnection, 3000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    };

    createConnection();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, onNotification]); // onNotification in deps — no ref needed

  return { isConnected };
};
