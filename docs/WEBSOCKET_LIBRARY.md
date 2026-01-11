# WebSocket Library Documentation

Dokumentasi lengkap untuk WebSocket library yang type-safe dan reusable, dibangun dengan Socket.IO.

## 📦 Overview

WebSocket library menyediakan:

- Type-safe event handling
- Authentication middleware
- Room management (untuk membagi clients ke groups)
- Broadcasting capabilities
- Easy event registration
- Auto error handling

## 🔧 Initialization

### Basic Setup

```typescript
// src/index.ts
import express from 'express';
import {createServer} from 'http';
import * as ws from './lib/websocket';

const app = express();
const httpServer = createServer(app);

// Register auth middleware BEFORE initialize
ws.useAuth((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        next(new Error('Authentication error: Token missing'));
        return;
    }
    // Validate token...
    next();
});

// Initialize WebSocket
ws.initialize(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Register event handlers
ws.on<{ chatId: string; message: string }>('chat:send_message', async (socket, data) => {
    console.log('Message from:', socket.id);
    console.log('Data:', data);
});

httpServer.listen(3003);
```

### With Authentication

```typescript
import jwt from 'jsonwebtoken';

ws.useAuth((socket, next) => {
    // Get token dari socket handshake
    const token = socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
        return next(new Error('Authentication error: Token missing'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        // Attach user info to socket
        (socket as any).userId = decoded.id;
        (socket as any).userEmail = decoded.email;
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
});

ws.initialize(httpServer, { /* ... */});
```

## ⚙️ Configuration

### WebSocketConfig Type

```typescript
type WebSocketConfig = {
    cors?: {
        origin: string | string[];     // Allowed origins
        credentials?: boolean;          // Allow credentials
    };
    pingTimeout?: number;              // Ping timeout (ms)
    pingInterval?: number;             // Ping interval (ms)
    path?: string;                     // Socket.IO path (default: /socket.io)
};
```

### Default Values

```typescript
{
    cors: {
        origin: '*',
            credentials
    :
        true,
    }
,
    pingTimeout: 60000,    // 60 seconds
        pingInterval
:
    25000,   // 25 seconds
        path
:
    '/socket.io',
}
```

## 🚀 Usage

### Event Handler Registration

#### Basic Handler

```typescript
import * as ws from './lib/websocket';

// Register handler for 'chat:send_message' event
ws.on('chat:send_message', async (socket, data) => {
    console.log(`Message from ${socket.id}:`, data);
    // Handle message...
});
```

#### Type-Safe Handler

```typescript
interface SendMessagePayload {
    chatId: string;
    message: string;
    type: 'text' | 'image' | 'file';
}

ws.on<SendMessagePayload>('chat:send_message', async (socket, data) => {
    // TypeScript knows data type
    console.log(`Chat: ${data.chatId}, Message: ${data.message}`);

    // Respond to sender
    socket.emit('message:sent', {id: 'msg-123', timestamp: Date.now()});

    // Notify other members
    ws.emitToRoom(data.chatId, 'message:new', {
        sender: (socket as any).userId,
        content: data.message,
        type: data.type,
    });
});
```

#### Multiple Handlers in Same Event

```typescript
// Handlers dapat di-register multiple kali
ws.on('user:typing', async (socket, data) => {
    // Handler 1
});

// Handler 2 untuk event yang sama akan replace yang sebelumnya
ws.on('user:typing', async (socket, data) => {
    // Handler 2
});
```

---

### Sending Events

#### Emit to Specific Socket

```typescript
const success = ws.emitToSocket(socketId, 'notification:new', {
    title: 'New message',
    content: 'You have a new message',
});

console.log(success ? 'Sent' : 'Socket not found');
```

#### Emit to Room

```typescript
// Send to all sockets di specific room
ws.emitToRoom('chat:123', 'message:new', {
    sender: 'user:456',
    content: 'Hello everyone!',
    timestamp: new Date().toISOString(),
});
```

#### Broadcast to All

```typescript
// Send ke semua connected clients
ws.broadcast('server:notification', {
    message: 'Server maintenance in 5 minutes',
});
```

#### Send from Client

```typescript
// Client sends to server
socket.emit('chat:send_message', {
    chatId: 'chat-123',
    message: 'Hello!',
});

// Client receives from server
socket.on('message:new', (data) => {
    console.log('New message:', data);
});

// Client receives from specific event
socket.on('notification:new', (data) => {
    console.log('Notification:', data);
});
```

---

### Room Management

Rooms adalah cara untuk mengelompokkan sockets dan mengirim pesan ke group.

#### Join Room

```typescript
const success = await ws.joinRoom(socketId, 'chat:123');
if (success) {
    console.log('Socket joined room chat:123');
} else {
    console.log('Socket not found');
}
```

#### Leave Room

```typescript
const success = await ws.leaveRoom(socketId, 'chat:123');
```

#### Get Sockets in Room

```typescript
const socketIds = await ws.getSocketsInRoom('chat:123');
console.log('Users in chat:', socketIds.length);
```

#### Get Socket Rooms

```typescript
const rooms = ws.getSocketRooms(socketId);
if (rooms) {
    console.log('Socket is in rooms:', Array.from(rooms));
}
```

#### Example: Chat Room Management

```typescript
ws.on<{ chatId: string }>('chat:join', async (socket, data) => {
    const userId = (socket as any).userId;

    // Join room
    await ws.joinRoom(socket.id, `chat:${data.chatId}`);

    // Notify others
    ws.emitToRoom(`chat:${data.chatId}`, 'user:joined', {
        userId,
        timestamp: Date.now(),
    });
});

ws.on<{ chatId: string }>('chat:leave', async (socket, data) => {
    const userId = (socket as any).userId;

    // Leave room
    await ws.leaveRoom(socket.id, `chat:${data.chatId}`);

    // Notify others
    ws.emitToRoom(`chat:${data.chatId}`, 'user:left', {
        userId,
        timestamp: Date.now(),
    });
});
```

---

### Socket Management

#### Disconnect Socket

```typescript
// Force disconnect
ws.disconnectSocket(socketId, false); // graceful
ws.disconnectSocket(socketId, true);  // abrupt
```

#### Get Connected Count

```typescript
const count = ws.getConnectedCount();
console.log(`${count} clients connected`);
```

#### Get Socket Rooms

```typescript
const rooms = ws.getSocketRooms(socketId);
if (rooms) {
    console.log('Socket rooms:', Array.from(rooms));
}
```

---

## 📋 API Reference

### initialize()

Initialize WebSocket server.

```typescript
export function initialize(
    httpServer: HttpServer,
    config?: WebSocketConfig
): Server
```

**Must be called:**

- After Express setup
- After auth middleware registration
- Before registering event handlers (recommended)

**Returns:**

- Socket.IO Server instance

**Example:**

```typescript
ws.initialize(httpServer, {
    cors: {origin: 'http://localhost:3000'},
    pingTimeout: 60000,
});
```

---

### useAuth()

Register authentication middleware.

**Must be called BEFORE initialize()**

```typescript
export function useAuth(middleware: AuthMiddleware): void
```

**Parameters:**

- `middleware`: Async function that receives socket and next callback

**Example:**

```typescript
ws.useAuth((socket, next) => {
    const token = socket.handshake.auth.token;
    if (verifyToken(token)) {
        next(); // Allow connection
    } else {
        next(new Error('Invalid token')); // Reject connection
    }
});
```

---

### on<T>()

Register event handler dengan type safety.

```typescript
export function on<T = unknown>(
    event: string,
    handler: MessageHandler<T>
): void
```

**Parameters:**

- `event`: Event name
- `handler`: Async function receiving socket and typed data

**Type Parameters:**

- `T`: Type of event data

**Example:**

```typescript
interface ChatMessage {
    chatId: string;
    text: string;
}

ws.on<ChatMessage>('chat:send', async (socket, msg) => {
    // msg is typed as ChatMessage
    console.log(msg.text);
});
```

---

### off()

Remove event handler.

```typescript
export function off(event: string): boolean
```

**Returns:**

- true if handler existed and was removed

**Example:**

```typescript
const removed = ws.off('chat:send');
```

---

### emitToSocket<T>()

Emit to specific socket.

```typescript
export function emitToSocket<T = unknown>(
    socketId: string,
    event: string,
    data: T
): boolean
```

**Returns:**

- true if socket exists and event sent

**Example:**

```typescript
ws.emitToSocket(socket.id, 'message:ack', {id: 'msg-123'});
```

---

### emitToRoom<T>()

Emit to all sockets in a room.

```typescript
export function emitToRoom<T = unknown>(
    room: string,
    event: string,
    data: T
): void
```

**Example:**

```typescript
ws.emitToRoom('chat:123', 'message:new', {
    sender: 'user-456',
    text: 'Hello all!',
});
```

---

### broadcast<T>()

Emit to all connected clients.

```typescript
export function broadcast<T = unknown>(
    event: string,
    data: T
): void
```

**Example:**

```typescript
ws.broadcast('server:status', {status: 'ok'});
```

---

### joinRoom()

Join socket to a room.

```typescript
export async function joinRoom(
    socketId: string,
    room: string
): Promise<boolean>
```

**Returns:**

- true if socket exists and joined

**Example:**

```typescript
await ws.joinRoom(socket.id, 'notification_room');
```

---

### leaveRoom()

Remove socket from a room.

```typescript
export async function leaveRoom(
    socketId: string,
    room: string
): Promise<boolean>
```

---

### getSocketsInRoom()

Get all socket IDs in a room.

```typescript
export async function getSocketsInRoom(room: string): Promise<string[]>
```

**Example:**

```typescript
const socketIds = await ws.getSocketsInRoom('chat:123');
console.log(`${socketIds.length} users in chat`);
```

---

### getSocketRooms()

Get all rooms socket has joined.

```typescript
export function getSocketRooms(socketId: string): Set<string> | null
```

**Returns:**

- Set of room names or null if socket not found

**Example:**

```typescript
const rooms = ws.getSocketRooms(socket.id);
if (rooms) {
    rooms.forEach(room => console.log(room));
}
```

---

### disconnectSocket()

Disconnect specific socket.

```typescript
export function disconnectSocket(
    socketId: string,
    close?: boolean
): boolean
```

**Parameters:**

- `socketId`: Socket ID to disconnect
- `close`: true untuk abrupt, false untuk graceful (default: false)

**Example:**

```typescript
ws.disconnectSocket(socket.id, false);
```

---

### getServer()

Get Socket.IO server instance.

```typescript
export function getServer(): Server | null
```

**Example:**

```typescript
const io = ws.getServer();
if (io) {
    io.emit('message', 'From raw IO');
}
```

---

### isInitialized()

Check if WebSocket is initialized.

```typescript
export function isInitialized(): boolean
```

---

### getConnectedCount()

Get total connected clients.

```typescript
export function getConnectedCount(): number
```

**Example:**

```typescript
console.log(`${ws.getConnectedCount()} clients online`);
```

---

### close()

Gracefully close WebSocket server.

```typescript
export async function close(): Promise<void>
```

**Example:**

```typescript
process.on('SIGINT', async () => {
    await ws.close();
    process.exit(0);
});
```

---

## 🔄 Complete Example

### Server Setup

```typescript
// src/index.ts
import express from 'express';
import {createServer} from 'http';
import jwt from 'jsonwebtoken';
import * as ws from './lib/websocket';

const app = express();
const httpServer = createServer(app);

// Auth middleware
ws.useAuth((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        const decoded = jwt.verify(token, 'secret') as any;
        (socket as any).userId = decoded.id;
        next();
    } catch (err) {
        next(new Error('Auth failed'));
    }
});

// Initialize
ws.initialize(httpServer, {
    cors: {origin: 'http://localhost:3000'},
});

// Event handlers
interface JoinChatPayload {
    chatId: string;
}

ws.on<JoinChatPayload>('chat:join', async (socket, payload) => {
    const userId = (socket as any).userId;

    // Join room
    await ws.joinRoom(socket.id, `chat:${payload.chatId}`);

    // Notify others
    ws.emitToRoom(`chat:${payload.chatId}`, 'user:joined', {
        userId,
        joinedAt: new Date(),
    });
});

interface SendMessagePayload {
    chatId: string;
    text: string;
}

ws.on<SendMessagePayload>('chat:message', async (socket, payload) => {
    const userId = (socket as any).userId;

    // Broadcast to room
    ws.emitToRoom(`chat:${payload.chatId}`, 'message:new', {
        userId,
        text: payload.text,
        timestamp: Date.now(),
    });
});

httpServer.listen(3003, () => {
    console.log('Server running on :3003');
});
```

### Client Usage (Browser)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3003', {
    auth: {
        token: 'your-jwt-token'
    }
});

// Join chat
socket.emit('chat:join', { chatId: 'chat-123' });

// Listen for messages
socket.on('message:new', (data) => {
    console.log(`${data.userId}: ${data.text}`);
});

// Send message
socket.emit('chat:message', {
    chatId: 'chat-123',
    text: 'Hello everyone!',
});

// Handle user join
socket.on('user:joined', (data) => {
    console.log(`${data.userId} joined`);
});
```

---

## 💡 Best Practices

### 1. Event Naming Convention

```typescript
// Good: namespace:action
'chat:join'
'chat:message'
'user:typing'
'notification:new'

// Avoid: flat names
'join'
'message'
'typing'
```

### 2. Type Your Events

```typescript
// ❌ No type
ws.on('event', (socket, data) => {
    // data is unknown
});

// ✅ With type
interface MyEvent {
    id: string;
    text: string;
}

ws.on<MyEvent>('event', (socket, data) => {
    // data is typed
    console.log(data.id);
});
```

### 3. Always Handle Errors

```typescript
ws.on<MyEvent>('event', async (socket, data) => {
    try {
        // Your logic
    } catch (err) {
        // Send error back to client
        socket.emit('error', {
            event: 'event',
            message: (err as Error).message,
        });
    }
});
```

### 4. Use Rooms for Targeting

```typescript
// ❌ Bad: emit to all
ws.broadcast('message', data);

// ✅ Good: emit to specific group
ws.emitToRoom(`chat:${chatId}`, 'message', data);
```

### 5. Attach User Data to Socket

```typescript
ws.useAuth((socket, next) => {
    const userId = extractUserId(socket.handshake.auth.token);
    (socket as any).userId = userId;
    next();
});

// Later use it
ws.on('event', async (socket) => {
    const userId = (socket as any).userId; // ✅ Available
});
```

---

## 🧪 Testing

### Mock WebSocket

```typescript
jest.mock('../lib/websocket', () => ({
    initialize: jest.fn(),
    on: jest.fn(),
    emitToRoom: jest.fn(),
    getConnectedCount: jest.fn(() => 0),
}));

import * as ws from '../lib/websocket';

describe('WebSocket', () => {
    it('should register handler', () => {
        ws.on('event', jest.fn());
        expect(ws.on).toHaveBeenCalledWith('event', expect.any(Function));
    });
});
```

---

## Events Lifecycle

```
Client connects
    ↓
Server checks auth middleware
    ↓
socket.on('connect') fires (client-side)
    ↓
Handlers registered for events
    ↓
Client sends event
    ↓
Handler processes
    ↓
Handler sends response
    ↓
Client receives response
    ↓
Client disconnects
    ↓
socket.on('disconnect') fires
```

---

## Troubleshooting

### "WebSocket not initialized"

**Cause**: `initialize()` not called

**Fix**:

```typescript
ws.initialize(httpServer);
```

### CORS errors

**Cause**: Origin not allowed

**Fix**:

```typescript
ws.initialize(httpServer, {
    cors: {origin: 'http://localhost:3000'}
});
```

### Client can't connect

**Cause**: Invalid token or server unreachable

**Fix**:

```typescript
// Check auth middleware
// Check server is running
// Check firewall rules
```

---

## References

- [Socket.IO Documentation](https://socket.io/docs/)
- [Socket.IO Rooms](https://socket.io/docs/v4/rooms/)
- [Socket.IO Events](https://socket.io/docs/v4/emit-cheatsheet/)

