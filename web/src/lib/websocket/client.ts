/**
 * WebSocket Client for Real-Time Updates
 * 
 * Provides real-time notifications for:
 * - Timesheet approvals/rejections
 * - New annotations
 * - Deadline reminders
 * - System notifications
 */

export type WebSocketEventType =
  | 'timesheet:approved'
  | 'timesheet:rejected'
  | 'timesheet:annotated'
  | 'deadline:reminder'
  | 'notification:new';

export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: unknown;
  timestamp: string;
  tenant_id: string;
  user_id?: string;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

/**
 * WebSocket client for real-time updates
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private handlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      // Add auth token to URL
      const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.isConnecting = false;
        this.stopHeartbeat();
        this.attemptReconnect(token);
      };
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
      this.isConnecting = false;
      this.attemptReconnect(token);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to event type
   */
  on(type: WebSocketEventType, handler: WebSocketEventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  /**
   * Send message to server
   */
  send(message: Partial<WebSocketMessage>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message: not connected');
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (err) {
          console.error('[WebSocket] Handler error:', err);
        }
      });
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

/**
 * Get WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    wsClient = new WebSocketClient(wsUrl);
  }
  return wsClient;
}

/**
 * React hook for WebSocket events
 */
export function useWebSocket(
  type: WebSocketEventType,
  handler: WebSocketEventHandler
): (() => void) | undefined {
  if (typeof window === 'undefined') return undefined;

  const client = getWebSocketClient();

  // Subscribe on mount
  const unsubscribe = client.on(type, handler);

  // Unsubscribe on unmount
  return unsubscribe;
}

