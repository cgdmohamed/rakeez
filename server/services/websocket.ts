import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { redisService } from './redis';
import { storage } from '../storage';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  rooms?: Set<string>;
}

interface WebSocketMessage {
  type: 'join' | 'leave' | 'message' | 'status_update' | 'typing';
  room?: string;
  data?: any;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private broadcastQueue: Array<{ room: string; message: any; timestamp: number }> = [];
  private readonly instanceId = Math.random().toString(36).substring(7); // Unique instance ID
  private readonly MAX_QUEUE_SIZE_PER_ROOM = 50; // Max queued messages per room
  private readonly QUEUE_MESSAGE_TTL = 5 * 60 * 1000; // 5 minutes

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      console.log('WebSocket connection attempt');

      // Extract token from query string
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify JWT token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret') as any;
        ws.userId = decoded.userId;
        ws.userRole = decoded.role;
        ws.rooms = new Set();

        console.log(`WebSocket authenticated: userId=${ws.userId}, role=${ws.userRole}`);

        // Handle incoming messages
        ws.on('message', (data) => {
          try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            this.handleMessage(ws, message);
          } catch (error) {
            console.error('WebSocket message parse error:', error);
          }
        });

        // Handle disconnect
        ws.on('close', () => {
          this.handleDisconnect(ws);
        });

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connected',
          userId: ws.userId,
          timestamp: new Date().toISOString(),
        }));

      } catch (error) {
        console.error('WebSocket authentication failed:', error);
        ws.close(1008, 'Invalid token');
      }
    });

    // Subscribe to Redis channels for broadcasting
    this.setupRedisSubscriptions();

    console.log('WebSocket server initialized');
  }

  private setupRedisSubscriptions(): void {
    // Subscribe to booking status updates
    redisService.subscribe('booking:status', (message) => {
      const { bookingId, status, userId, _instanceId } = message;
      
      // Skip if from same instance (already broadcasted locally)
      if (_instanceId === this.instanceId) return;
      
      this.broadcastToRoom(`booking:${bookingId}`, {
        type: 'status_update',
        bookingId,
        status,
        timestamp: new Date().toISOString(),
      });
      
      // Also send to user-specific room
      this.broadcastToRoom(`user:${userId}`, {
        type: 'status_update',
        bookingId,
        status,
        timestamp: new Date().toISOString(),
      });
    });

    // Subscribe to support ticket messages
    redisService.subscribe('support:message', (message) => {
      const { ticketId, senderId, messageData, _instanceId } = message;
      
      // Skip if from same instance (already broadcasted locally)
      if (_instanceId === this.instanceId) return;
      
      this.broadcastToRoom(`support:${ticketId}`, {
        type: 'message',
        ticketId,
        senderId,
        message: messageData,
        timestamp: new Date().toISOString(),
      });
    });

    // Subscribe to technician location updates
    redisService.subscribe('technician:location', (message) => {
      const { bookingId, location, _instanceId } = message;
      
      // Skip if from same instance (already broadcasted locally)
      if (_instanceId === this.instanceId) return;
      
      this.broadcastToRoom(`booking:${bookingId}`, {
        type: 'location_update',
        bookingId,
        location,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'join':
        if (message.room) {
          const authorized = await this.authorizeRoom(ws, message.room);
          if (authorized) {
            this.joinRoom(ws, message.room);
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unauthorized to join this room',
              room: message.room
            }));
          }
        }
        break;

      case 'leave':
        if (message.room) {
          this.leaveRoom(ws, message.room);
        }
        break;

      case 'typing':
        if (message.room && ws.rooms?.has(message.room)) {
          this.broadcastToRoom(message.room, {
            type: 'typing',
            userId: ws.userId,
            isTyping: message.data?.isTyping || false,
          }, ws);
        }
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private async authorizeRoom(ws: AuthenticatedWebSocket, room: string): Promise<boolean> {
    const [roomType, roomId] = room.split(':');
    
    if (!ws.userId || !ws.userRole) {
      return false;
    }

    try {
      switch (roomType) {
        case 'booking': {
          // Verify user owns this booking or is admin/technician
          if (ws.userRole === 'admin') return true;
          
          const booking = await storage.getBooking(roomId);
          if (!booking) return false;
          
          // Allow: booking owner, assigned technician, or admin
          return booking.userId === ws.userId || 
                 booking.technicianId === ws.userId ||
                 ws.userRole === 'admin';
        }

        case 'support': {
          // Verify user owns this support ticket or is admin/support agent
          if (ws.userRole === 'admin' || ws.userRole === 'support_agent') return true;
          
          const ticket = await storage.getSupportTicket(roomId);
          if (!ticket) return false;
          
          // Allow: ticket creator, support agents, or admin
          return ticket.userId === ws.userId || 
                 ws.userRole === 'admin' || 
                 ws.userRole === 'support_agent';
        }

        case 'user': {
          // Only allow joining own user room or admin
          return roomId === ws.userId || ws.userRole === 'admin';
        }

        default:
          console.warn('Unknown room type:', roomType);
          return false;
      }
    } catch (error) {
      console.error('Room authorization error:', error);
      return false;
    }
  }

  private joinRoom(ws: AuthenticatedWebSocket, room: string): void {
    if (!ws.rooms) ws.rooms = new Set();
    
    ws.rooms.add(room);
    
    if (!this.clients.has(room)) {
      this.clients.set(room, new Set());
    }
    this.clients.get(room)!.add(ws);

    console.log(`User ${ws.userId} joined room: ${room}`);

    // Process any queued broadcasts for this room
    this.processQueuedBroadcasts(room);

    // Notify user they joined
    ws.send(JSON.stringify({
      type: 'joined_room',
      room,
      timestamp: new Date().toISOString(),
    }));
  }

  private leaveRoom(ws: AuthenticatedWebSocket, room: string): void {
    if (ws.rooms) {
      ws.rooms.delete(room);
    }

    const roomClients = this.clients.get(room);
    if (roomClients) {
      roomClients.delete(ws);
      if (roomClients.size === 0) {
        this.clients.delete(room);
      }
    }

    console.log(`User ${ws.userId} left room: ${room}`);
  }

  private handleDisconnect(ws: AuthenticatedWebSocket): void {
    // Remove from all rooms
    if (ws.rooms) {
      ws.rooms.forEach(room => {
        this.leaveRoom(ws, room);
      });
    }

    console.log(`WebSocket disconnected: userId=${ws.userId}`);
  }

  private broadcastToRoom(room: string, message: any, exclude?: AuthenticatedWebSocket): void {
    const roomClients = this.clients.get(room);
    if (!roomClients || roomClients.size === 0) {
      // Queue for later if no clients currently connected (with bounds)
      this.queueBroadcast(room, message);
      return;
    }

    const payload = JSON.stringify(message);
    roomClients.forEach(client => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  private queueBroadcast(room: string, message: any): void {
    const now = Date.now();
    
    // Clean up expired messages
    this.broadcastQueue = this.broadcastQueue.filter(
      item => (now - item.timestamp) < this.QUEUE_MESSAGE_TTL
    );

    // Check per-room limit
    const roomMessages = this.broadcastQueue.filter(item => item.room === room);
    if (roomMessages.length >= this.MAX_QUEUE_SIZE_PER_ROOM) {
      // Remove oldest message for this room to make space
      const oldestIndex = this.broadcastQueue.findIndex(item => item.room === room);
      if (oldestIndex !== -1) {
        this.broadcastQueue.splice(oldestIndex, 1);
      }
    }

    this.broadcastQueue.push({ room, message, timestamp: now });
  }

  // Process queued broadcasts when clients join
  private processQueuedBroadcasts(room: string): void {
    const roomClients = this.clients.get(room);
    if (!roomClients || roomClients.size === 0) return;

    const now = Date.now();

    // Find and send queued messages for this room (not expired)
    const queuedMessages = this.broadcastQueue.filter(
      item => item.room === room && (now - item.timestamp) < this.QUEUE_MESSAGE_TTL
    );
    if (queuedMessages.length === 0) return;

    const payload = queuedMessages.map(item => JSON.stringify(item.message));
    roomClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        payload.forEach(msg => client.send(msg));
      }
    });

    // Remove processed messages from queue
    this.broadcastQueue = this.broadcastQueue.filter(item => item.room !== room);
  }

  // Public methods for broadcasting from API routes
  public async broadcastBookingStatus(bookingId: string, userId: string, status: string): Promise<void> {
    const message = {
      type: 'status_update',
      bookingId,
      status,
      timestamp: new Date().toISOString(),
      _instanceId: this.instanceId, // Track source instance
    };

    // Try Redis Pub/Sub for multi-server broadcast (includes instanceId)
    await redisService.publish('booking:status', { bookingId, userId, status, _instanceId: this.instanceId });

    // Always broadcast locally for immediate delivery (fallback when Redis unavailable)
    this.broadcastToRoom(`booking:${bookingId}`, message);
    this.broadcastToRoom(`user:${userId}`, message);
  }

  public async broadcastSupportMessage(ticketId: string, senderId: string, messageData: any): Promise<void> {
    const message = {
      type: 'message',
      ticketId,
      senderId,
      message: messageData,
      timestamp: new Date().toISOString(),
      _instanceId: this.instanceId,
    };

    // Try Redis Pub/Sub for multi-server broadcast
    await redisService.publish('support:message', { ticketId, senderId, messageData, _instanceId: this.instanceId });

    // Always broadcast locally for immediate delivery
    this.broadcastToRoom(`support:${ticketId}`, message);
  }

  public async broadcastTechnicianLocation(bookingId: string, location: any): Promise<void> {
    const message = {
      type: 'location_update',
      bookingId,
      location,
      timestamp: new Date().toISOString(),
      _instanceId: this.instanceId,
    };

    // Try Redis Pub/Sub for multi-server broadcast
    await redisService.publish('technician:location', { bookingId, location, _instanceId: this.instanceId });

    // Always broadcast locally for immediate delivery
    this.broadcastToRoom(`booking:${bookingId}`, message);
  }
}

export const websocketService = new WebSocketService();
