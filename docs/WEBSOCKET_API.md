# WebSocket API Documentation

## Overview

The application provides real-time communication via WebSocket for:
- **Order/Booking Status Updates**: Real-time tracking of booking status changes
- **Support Chat**: Live messaging between customers and support agents
- **Technician Location**: Real-time location tracking during service delivery

## Connection

### Endpoint
```
ws://localhost:5000/ws
wss://your-domain.com/ws (production)
```

### Authentication
WebSocket connections require JWT authentication via query parameter:
```
ws://localhost:5000/ws?token=YOUR_JWT_TOKEN
```

Get JWT token from login response:
```bash
curl -X POST http://localhost:5000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+966500000001","password":"password123"}'
```

## Message Types

### Client → Server

#### Join Room
Subscribe to updates for a specific room:
```json
{
  "type": "join",
  "room": "booking:BOOKING_ID"
}
```

Room formats:
- `booking:BOOKING_ID` - Booking-specific updates
- `user:USER_ID` - User-specific notifications
- `support:TICKET_ID` - Support ticket messages

#### Leave Room
Unsubscribe from room updates:
```json
{
  "type": "leave",
  "room": "booking:BOOKING_ID"
}
```

#### Typing Indicator
Notify others in room that user is typing:
```json
{
  "type": "typing",
  "room": "support:TICKET_ID",
  "data": {
    "isTyping": true
  }
}
```

### Server → Client

#### Connection Confirmation
Received immediately after successful connection:
```json
{
  "type": "connected",
  "userId": "user-uuid",
  "timestamp": "2024-10-02T19:00:00.000Z"
}
```

#### Room Joined
Confirmation of room subscription:
```json
{
  "type": "joined_room",
  "room": "booking:BOOKING_ID",
  "timestamp": "2024-10-02T19:00:00.000Z"
}
```

#### Booking Status Update
Real-time booking status changes:
```json
{
  "type": "status_update",
  "bookingId": "booking-uuid",
  "status": "en_route",
  "timestamp": "2024-10-02T19:00:00.000Z"
}
```

#### Support Message
New support ticket message:
```json
{
  "type": "message",
  "ticketId": "ticket-uuid",
  "senderId": "sender-uuid",
  "message": {
    "id": "message-uuid",
    "message": "Hello, how can I help?",
    "createdAt": "2024-10-02T19:00:00.000Z"
  },
  "timestamp": "2024-10-02T19:00:00.000Z"
}
```

#### Technician Location Update
Real-time location tracking:
```json
{
  "type": "location_update",
  "bookingId": "booking-uuid",
  "location": {
    "latitude": 24.7136,
    "longitude": 46.6753
  },
  "timestamp": "2024-10-02T19:00:00.000Z"
}
```

#### Typing Indicator
User typing status in support chat:
```json
{
  "type": "typing",
  "userId": "user-uuid",
  "isTyping": true
}
```

## Usage Examples

### JavaScript/TypeScript (Frontend)

```typescript
// Connect to WebSocket
const token = localStorage.getItem('access_token');
const ws = new WebSocket(`ws://localhost:5000/ws?token=${token}`);

// Connection opened
ws.addEventListener('open', () => {
  console.log('WebSocket connected');
  
  // Join booking room
  ws.send(JSON.stringify({
    type: 'join',
    room: 'booking:123e4567-e89b-12d3-a456-426614174000'
  }));
});

// Listen for messages
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'status_update':
      console.log('Booking status updated:', message.status);
      // Update UI with new status
      break;
      
    case 'message':
      console.log('New support message:', message.message);
      // Display new message in chat
      break;
      
    case 'location_update':
      console.log('Technician location:', message.location);
      // Update map marker
      break;
  }
});

// Send typing indicator
const sendTypingIndicator = (isTyping: boolean) => {
  ws.send(JSON.stringify({
    type: 'typing',
    room: 'support:ticket-id',
    data: { isTyping }
  }));
};

// Close connection
ws.addEventListener('close', () => {
  console.log('WebSocket disconnected');
});
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';

export const useWebSocket = (bookingId?: string) => {
  const [status, setStatus] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !bookingId) return;
    
    const ws = new WebSocket(`ws://localhost:5000/ws?token=${token}`);
    
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        room: `booking:${bookingId}`
      }));
    });
    
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'status_update') {
        setStatus(message.status);
      } else if (message.type === 'message') {
        setMessages(prev => [...prev, message.message]);
      }
    });
    
    return () => ws.close();
  }, [bookingId]);
  
  return { status, messages };
};
```

## Backend Integration

### Broadcasting from API Routes

The WebSocket service is automatically integrated into booking and support routes:

```typescript
import { websocketService } from './services/websocket';

// Broadcast booking status update
await websocketService.broadcastBookingStatus(
  bookingId,
  userId,
  'en_route'
);

// Broadcast support message
await websocketService.broadcastSupportMessage(
  ticketId,
  senderId,
  messageData
);

// Broadcast technician location
await websocketService.broadcastTechnicianLocation(
  bookingId,
  { latitude: 24.7136, longitude: 46.6753 }
);
```

## Architecture

### Redis Pub/Sub + In-Memory Fallback
WebSocket uses hybrid broadcasting architecture:
- **Local broadcasts**: Always deliver to connected clients immediately (single-server or when Redis down)
- **Redis Pub/Sub**: Fan-out to multiple server instances in production clusters
- Redis channels: `booking:status`, `support:message`, `technician:location`
- **Graceful degradation**: Works fully in development without Redis; production clusters need Redis for cross-server delivery

### Room Management
- Clients join rooms to receive targeted updates
- Multiple rooms per connection supported
- Automatic cleanup on disconnect

### Security

#### Authentication & Authorization
- JWT authentication required for all connections
- Room-level authorization enforced:
  - **Booking rooms** (`booking:*`): Only booking owner, assigned technician, or admin can join
  - **Support rooms** (`support:*`): Only ticket creator or admin can join
  - **User rooms** (`user:*`): Only the user themselves or admin can join
- Invalid tokens rejected with WebSocket close code 1008
- Unauthorized room access returns error message without joining

#### Production Security Notes
⚠️ **JWT Token in URL - Known Limitation**: 
- Current implementation passes JWT via URL query parameter (`?token=...`)
- **Risk**: Tokens may be logged in intermediary proxies, CDNs, or server access logs
- **Mitigation**: Use short-lived tokens (15-30 minutes) and implement token refresh
- **Future Enhancement**: Consider implementing:
  - `Sec-WebSocket-Protocol` header for token passing
  - WebSocket authentication via initial HTTP upgrade headers  
  - Session-based auth for WebSocket connections

**Important**: Ensure your infrastructure doesn't log query parameters in production environments.

## Production Deployment

### Environment Variables
```bash
REDIS_URL=redis://your-redis-host:6379
JWT_SECRET=your-jwt-secret
```

### Load Balancing
WebSocket connections are sticky - ensure your load balancer supports:
- WebSocket protocol upgrade
- Session affinity (sticky sessions)
- Redis Pub/Sub for cross-server communication

### Monitoring
Monitor these metrics:
- Active WebSocket connections
- Redis Pub/Sub message rate
- Room subscription counts
- Connection errors and authentication failures
