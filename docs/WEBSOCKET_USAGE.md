# WebSocket Library Usage

Dokumentasi lengkap untuk menggunakan WebSocket library yang type-safe dan reusable.

## 📦 Installation

Library ini menggunakan `socket.io`. Pastikan sudah terinstall:

```bash
npm install socket.io
npm install -D @types/socket.io
```

## 🚀 Quick Start

### 1. Initialize WebSocket Server

Di file `src/index.ts`:

```typescript
import express from 'express';
import http from 'http';
import * as ws from './lib/websocket';

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
ws.initialize(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### 2. Setup Authentication Middleware

```typescript
import * as ws from './lib/websocket';
import * as jwt from 'jsonwebtoken';

// Register auth middleware BEFORE initialize()
ws.useAuth((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
        return next(new Error('Authentication error: Token missing'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string };
        (socket as any).userId = decoded.id;
        (socket as any).userEmail = decoded.email;
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
});

// Then initialize
ws.initialize(server, config);
```

### 3. Register Event Handlers

#### Type-Safe Event Handlers

```typescript
// src/modules/chat/chatWebSocket.ts
import * as ws from '../../lib/websocket';
import {Socket} from 'socket.io';

type SendMessagePayload = {
    chatId: string;
    message: string;
};

type JoinChatPayload = {
    chatId: string;
};

// Register handlers
export function registerChatHandlers() {
    // Handler untuk mengirim message
    ws.on<SendMessagePayload>('chat:send_message', async (socket: Socket, data) => {
        const userId = (socket as any).userId;
        console.log(`User ${userId} sending message to chat ${data.chatId}`);

        // Validate
        if (!data.chatId || !data.message) {
            socket.emit('error', {event: 'chat:send_message', message: 'Invalid payload'});
            return;
        }

        // Save message to database
        // const message = await saveMessage(data.chatId, userId, data.message);

        // Emit to room
        ws.emitToRoom(data.chatId, 'chat:new_message', {
            chatId: data.chatId,
            message: data.message,
            userId,
            timestamp: new Date().toISOString(),
        });
    });

    // Handler untuk join chat room
    ws.on<JoinChatPayload>('chat:join', async (socket: Socket, data) => {
        const userId = (socket as any).userId;
        console.log(`User ${userId} joining chat ${data.chatId}`);

        // Validate user has access to this chat
        // const hasAccess = await checkChatAccess(userId, data.chatId);
        // if (!hasAccess) {
        //     socket.emit('error', {event: 'chat:join', message: 'Access denied'});
        //     return;
        // }

        await ws.joinRoom(socket.id, data.chatId);
        socket.emit('chat:joined', {chatId: data.chatId});

        // Notify others
        ws.emitToRoom(data.chatId, 'chat:user_joined', {
            chatId: data.chatId,
            userId,
        });
    });

    // Handler untuk leave chat room
    ws.on<JoinChatPayload>('chat:leave', async (socket: Socket, data) => {
        const userId = (socket as any).userId;
        console.log(`User ${userId} leaving chat ${data.chatId}`);

        await ws.leaveRoom(socket.id, data.chatId);
        socket.emit('chat:left', {chatId: data.chatId});

        // Notify others
        ws.emitToRoom(data.chatId, 'chat:user_left', {
            chatId: data.chatId,
            userId,
        });
    });

    // Handler untuk typing indicator
    ws.on<{ chatId: string; isTyping: boolean }>('chat:typing', async (socket: Socket, data) => {
        const userId = (socket as any).userId;

        // Broadcast to others in the room (exclude sender)
        socket.to(data.chatId).emit('chat:user_typing', {
            chatId: data.chatId,
            userId,
            isTyping: data.isTyping,
        });
    });
}
```

### 4. Register Handlers at Startup

```typescript
// src/index.ts
import * as ws from './lib/websocket';
import {registerChatHandlers} from './modules/chat/chatWebSocket';

// Setup auth
ws.useAuth(authMiddleware);

// Initialize
ws.initialize(server, config);

// Register event handlers
registerChatHandlers();
```

## 📚 API Reference

### Configuration

#### `initialize(httpServer, config?)`

Initialize WebSocket server.

**Parameters:**

- `httpServer`: HTTP server instance
- `config`: Optional configuration
    - `cors`: CORS configuration
    - `pingTimeout`: Ping timeout in ms (default: 60000)
    - `pingInterval`: Ping interval in ms (default: 25000)
    - `path`: Socket.IO path (default: '/socket.io')

### Authentication

#### `useAuth(middleware)`

Register authentication middleware. Must be called **before** `initialize()`.

**Example:**

```typescript
ws.useAuth((socket, next) => {
    // Verify token from socket.handshake.auth or headers
    // Attach user info to socket object
    // Call next() or next(error)
});
```

### Event Handling

#### `on<T>(event, handler)`

Register event handler.

**Parameters:**

- `event`: Event name
- `handler`: Handler function `(socket, data) => Promise<void> | void`

**Example:**

```typescript
ws.on<{ message: string }>('chat:message', async (socket, data) => {
    console.log('Received message:', data.message);
});
```

#### `off(event)`

Remove event handler.

### Emitting Events

#### `emitToSocket<T>(socketId, event, data)`

Emit to specific socket by ID.

```typescript
ws.emitToSocket('socket-id-123', 'notification', {message: 'Hello'});
```

#### `emitToRoom<T>(room, event, data)`

Emit to all sockets in a room.

```typescript
ws.emitToRoom('chat-uuid', 'chat:new_message', {text: 'Hello room!'});
```

#### `broadcast<T>(event, data)`

Emit to all connected clients.

```typescript
ws.broadcast('system:maintenance', {message: 'Server maintenance in 5 minutes'});
```

### Room Management

#### `joinRoom(socketId, room)`

Add socket to a room.

```typescript
await ws.joinRoom(socket.id, 'chat-uuid');
```

#### `leaveRoom(socketId, room)`

Remove socket from a room.

```typescript
await ws.leaveRoom(socket.id, 'chat-uuid');
```

#### `getSocketsInRoom(room)`

Get all socket IDs in a room.

```typescript
const socketIds = await ws.getSocketsInRoom('chat-uuid');
console.log('Sockets in room:', socketIds);
```

#### `getSocketRooms(socketId)`

Get all rooms a socket has joined.

```typescript
const rooms = ws.getSocketRooms(socket.id);
console.log('Socket rooms:', Array.from(rooms));
```

### Utility Functions

#### `disconnectSocket(socketId, close?)`

Disconnect a specific socket.

```typescript
ws.disconnectSocket('socket-id-123', true);
```

#### `getServer()`

Get the Socket.IO server instance.

#### `isInitialized()`

Check if server is initialized.

#### `getConnectedCount()`

Get total connected clients count.

#### `close()`

Close WebSocket server gracefully.

## 🎯 Complete Example: Chat Application

### Backend Setup

```typescript
// src/modules/chat/chatWebSocket.ts
import * as ws from '../../lib/websocket';
import {Socket} from 'socket.io';
import * as chatService from './chatService';
import * as messageService from '../message/messageService';

export function registerChatHandlers() {
    // Join chat room
    ws.on<{ chatId: string }>('chat:join', async (socket: Socket, data) => {
        const userId = (socket as any).userId;

        try {
            // Verify user is member of chat
            const isMember = await chatService.isUserMember(data.chatId, userId);
            if (!isMember) {
                socket.emit('error', {event: 'chat:join', message: 'Not a member'});
                return;
            }

            // Join room
            await ws.joinRoom(socket.id, data.chatId);

            // Load recent messages
            const messages = await messageService.getRecentMessages(data.chatId, 50);

            socket.emit('chat:joined', {
                chatId: data.chatId,
                messages,
            });

            // Notify others
            socket.to(data.chatId).emit('chat:user_online', {userId});
        } catch (err) {
            socket.emit('error', {event: 'chat:join', message: 'Failed to join chat'});
        }
    });

    // Send message
    ws.on<{ chatId: string; content: string }>('chat:send', async (socket: Socket, data) => {
        const userId = (socket as any).userId;

        try {
            // Save message
            const message = await messageService.createMessage({
                chatId: data.chatId,
                userId,
                content: data.content,
            });

            // Emit to all in room
            ws.emitToRoom(data.chatId, 'chat:message', {
                id: message.id,
                chatId: data.chatId,
                userId,
                content: data.content,
                createdAt: message.createdAt,
            });
        } catch (err) {
            socket.emit('error', {event: 'chat:send', message: 'Failed to send message'});
        }
    });

    // Typing indicator
    ws.on<{ chatId: string; isTyping: boolean }>('chat:typing', (socket: Socket, data) => {
        const userId = (socket as any).userId;
        socket.to(data.chatId).emit('chat:typing', {userId, isTyping: data.isTyping});
    });

    // Leave chat
    ws.on<{ chatId: string }>('chat:leave', async (socket: Socket, data) => {
        const userId = (socket as any).userId;
        await ws.leaveRoom(socket.id, data.chatId);
        socket.to(data.chatId).emit('chat:user_offline', {userId});
    });
}
```

### Frontend Usage (React/TypeScript)

```typescript
// src/lib/socket.ts
import {io, Socket} from 'socket.io-client';

class SocketClient {
    private socket: Socket | null = null;

    connect(token: string) {
        this.socket = io('http://localhost:3001', {
            auth: {token},
        });

        this.socket.on('connect', () => {
            console.log('Connected:', this.socket?.id);
        });

        this.socket.on('error', (data) => {
            console.error('Socket error:', data);
        });
    }

    joinChat(chatId: string) {
        this.socket?.emit('chat:join', {chatId});
    }

    sendMessage(chatId: string, content: string) {
        this.socket?.emit('chat:send', {chatId, content});
    }

    onMessage(handler: (data: any) => void) {
        this.socket?.on('chat:message', handler);
    }

    disconnect() {
        this.socket?.disconnect();
    }
}

export default new SocketClient();
```

## 🔒 Security Best Practices

1. **Always use authentication middleware**
   ```typescript
   ws.useAuth(authMiddleware);
   ```

2. **Validate room access before joining**
   ```typescript
   ws.on('chat:join', async (socket, data) => {
       const hasAccess = await checkAccess(socket.userId, data.chatId);
       if (!hasAccess) {
           socket.emit('error', {message: 'Access denied'});
           return;
       }
       await ws.joinRoom(socket.id, data.chatId);
   });
   ```

3. **Sanitize user input**
   ```typescript
   import {z} from 'zod';
   
   const schema = z.object({
       chatId: z.string().uuid(),
       message: z.string().max(1000),
   });
   
   ws.on('chat:send', async (socket, data) => {
       const result = schema.safeParse(data);
       if (!result.success) {
           socket.emit('error', {message: 'Invalid input'});
           return;
       }
       // Process data
   });
   ```

4. **Rate limiting**
    - Use rate limiting per socket/user
    - Prevent spam and abuse

## 📊 Monitoring

```typescript
// Get stats
console.log('Connected clients:', ws.getConnectedCount());
console.log('Sockets in room:', await ws.getSocketsInRoom('chat-123'));

// Log events
ws.on('chat:send', async (socket, data) => {
    console.log(`[${new Date().toISOString()}] User ${socket.userId} sent message to ${data.chatId}`);
});
```

## 🎨 Event Naming Convention

Gunakan format: `<module>:<action>`

Examples:

- `chat:join`
- `chat:leave`
- `chat:send`
- `chat:typing`
- `notification:new`
- `user:status`

## ⚠️ Error Handling

Semua handler otomatis catch error dan emit ke client:

```typescript
socket.on('error', (data) => {
    console.error('Error:', data.event, data.message);
});
```

## 🔄 Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing WebSocket...');
    await ws.close();
    process.exit(0);
});
```

