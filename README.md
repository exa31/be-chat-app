# Chat Application Backend

Backend untuk aplikasi chat real-time dengan REST API dan WebSocket.

## 🚀 Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Real-time**: Socket.IO (WebSocket)
- **Message Queue**: RabbitMQ
- **Authentication**: JWT + Refresh Token
- **Validation**: Zod
- **Migration**: node-pg-migrate

## 📦 Installation

```bash
npm install
```

## 🔧 Configuration

Create `.env` file:

```env
PORT=3003
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_DB=chatapp

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# RabbitMQ
RABBITMQ_URL=amqp://localhost

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

## 🗃️ Database Setup

```bash
# Check PostgreSQL connection
npm run db:check

# Run migrations
npm run migrate:up

# Rollback migration
npm run migrate:down

# Create new migration
npm run migrate:create <migration-name>
```

## 🏃 Running the App

```bash
# Development mode with hot reload
npm run dev

# Build
npm run build

# Production mode
npm start
```

## 📚 API Documentation

### Authentication

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Users

- `GET /api/users/:id` - Get user by ID
- `GET /api/users/email/:email` - Get user by email
- `PUT /api/users/:id` - Update user

### Chat Requests

- `POST /api/chat-requests` - Send chat request (by email)
- `GET /api/chat-requests/incoming` - List incoming requests
- `GET /api/chat-requests/outgoing` - List outgoing requests
- `POST /api/chat-requests/:id/respond` - Accept/Reject/Block request
- `DELETE /api/chat-requests/:id` - Cancel request (sender only)

**Request Flow:**

1. User A sends request to User B (by email)
2. System checks:
    - ✅ No existing chat between them
    - ✅ No pending request
    - ✅ No active cooldown (from previous rejection)
3. User B can:
    - **Accept** → Creates private chat automatically
    - **Reject** → Sets 7-day cooldown (User A can't send new request for 7 days)
    - **Block** → Permanent block
4. User A can cancel pending request anytime

### Chats

- `POST /api/chats` - Create chat
- `GET /api/chats/:id` - Get chat by ID
- `GET /api/chats/user/:userId` - List user's chats

## 🔌 WebSocket Events

Full documentation: [WEBSOCKET_USAGE.md](./docs/WEBSOCKET_USAGE.md)

### Client → Server

- `chat:join` - Join chat room
- `chat:leave` - Leave chat room
- `chat:send_message` - Send message
- `chat:typing` - Typing indicator
- `chat:mark_read` - Mark message as read
- `chat:get_online_users` - Get online users count

### Server → Client

- `chat:joined` - Join confirmed
- `chat:new_message` - New message
- `chat:user_typing` - User typing
- `chat:user_joined` - User joined
- `chat:user_left` - User left
- `chat:online_users` - Online users count
- `error` - Error occurred

### Authentication

WebSocket requires JWT token:

```javascript
const socket = io('http://localhost:3003', {
    auth: {
        token: 'your-jwt-token'
    }
});
```

## 📁 Project Structure

```
src/
├── config/           # Configuration
├── databases/        # Database connection & transaction wrapper
├── errors/           # Custom error classes
├── lib/              # Reusable libraries
│   ├── password.ts   # SHA256 + bcrypt password hashing
│   ├── rabbitmq.ts   # RabbitMQ wrapper
│   └── websocket.ts  # Socket.IO wrapper
├── middleware/       # Express middlewares
│   ├── asyncHandler.ts
│   ├── auth.ts       # JWT authentication
│   ├── errorHandler.ts
│   └── logrequest.ts # Colored request logger
├── modules/          # Feature modules
│   ├── auth/
│   │   └── tokenService.ts
│   ├── chat/
│   │   ├── chatModel.ts
│   │   ├── chatRepository.ts
│   │   ├── chatRoute.ts
│   │   ├── chatService.ts
│   │   └── chatWebSocket.ts  # WebSocket handlers
│   ├── chatRequest/
│   │   ├── chatRequestModel.ts
│   │   ├── chatRequestRepository.ts
│   │   ├── chatRequestRoute.ts
│   │   └── chatRequestService.ts
│   ├── token/
│   │   └── refreshTokenRepository.ts
│   └── user/
│       ├── userModel.ts
│       ├── userRepository.ts
│       ├── userRoute.ts
│       └── userService.ts
├── scripts/          # Utility scripts
├── utils/            # Utility functions
│   └── response.ts   # Standardized API responses
└── index.ts          # App entry point
```

## 🔐 Security Features

- **Password Hashing**: SHA256 → bcrypt (double hashing)
- **JWT Authentication**: Access token (15m) + Refresh token (7d)
- **HTTP-only Cookies**: Refresh token stored securely
- **Request Validation**: Zod schema validation
- **Rate Limiting**: Cooldown on rejected chat requests
- **WebSocket Auth**: JWT token required for WS connection

## 🛠️ Libraries

### Core Libraries

```typescript
// PostgreSQL with transaction support
import {executeInTransaction, query} from './databases/postgres';

// RabbitMQ
import * as rabbit from './lib/rabbitmq';

await rabbit.connect(url);
await rabbit.publish('exchange', 'routing.key', payload);
await rabbit.consume('queue', handler);

// WebSocket
import * as ws from './lib/websocket';

ws.initialize(httpServer, config);
ws.on('event', handler);
ws.emitToRoom(room, event, data);

// Password
import * as password from './lib/password';

const hashed = await password.hash('password');
const valid = await password.compare('password', hashed);
```

Full documentation:

- [RabbitMQ Usage](./docs/RABBITMQ_USAGE.md)
- [WebSocket Usage](./docs/WEBSOCKET_USAGE.md)
- [WebSocket Client Examples](./docs/WEBSOCKET_CLIENT.md)

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 📊 Monitoring

```bash
# Check health
curl http://localhost:3003/api/health

# WebSocket stats (in code)
import * as ws from './lib/websocket';
console.log('Connected:', ws.getConnectedCount());
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL
npm run db:check

# Verify connection string
psql -h localhost -U postgres -d chatapp
```

### RabbitMQ Connection Issues

```bash
# Check RabbitMQ
rabbitmq-diagnostics status

# Management UI
http://localhost:15672
```

### Migration Issues

```bash
# Check migration status
npm run migrate:up

# Reset database (⚠️ destructive)
npm run migrate:down
npm run migrate:up
```

## 🚀 Deployment

1. Build the app:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Run migrations:
   ```bash
   npm run migrate:up
   ```

4. Start the app:
   ```bash
   npm start
   ```

## 📝 License

MIT

## 👥 Contributors

Your team name here

