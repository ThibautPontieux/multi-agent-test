import { useEffect, useState, useCallback, useRef } from 'react';
import type { WebSocketMessage } from '@/types';

export interface UseWebSocketOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  connectionAttempts: number;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    connectionAttempts: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<Map<string, (payload: any) => void>>(new Map());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          connectionAttempts: 0,
          error: null
        }));
        onConnect?.();
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, isConnected: false, isConnecting: false }));
        onDisconnect?.();

        // Tentative de reconnexion
        setState(prev => {
          if (prev.connectionAttempts < maxReconnectAttempts) {
            reconnectTimeoutRef.current = setTimeout(() => {
              setState(current => ({
                ...current,
                connectionAttempts: current.connectionAttempts + 1
              }));
              connect();
            }, reconnectInterval);
          }
          return prev;
        });
      };

      ws.onerror = (error) => {
        setState(prev => ({
          ...prev,
          error: 'Erreur de connexion WebSocket',
          isConnecting: false
        }));
        onError?.(error);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({ ...prev, lastMessage: message }));
          
          // Appeler les handlers de message spécifiques
          const handler = messageHandlersRef.current.get(message.type);
          if (handler) {
            handler(message.payload);
          }
        } catch (error) {
          console.error('Erreur parsing message WebSocket:', error);
        }
      };

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Impossible de créer la connexion WebSocket',
        isConnecting: false
      }));
    }
  }, [url, reconnectInterval, maxReconnectAttempts, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionAttempts: 0
    }));
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((messageType: string, handler: (payload: any) => void) => {
    messageHandlersRef.current.set(messageType, handler);
    
    // Retourne une fonction de cleanup
    return () => {
      messageHandlersRef.current.delete(messageType);
    };
  }, []);

  // Connexion automatique au mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup au unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    subscribe
  };
}
