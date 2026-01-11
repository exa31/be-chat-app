# Chat App Backend

Backend API untuk aplikasi chat real-time yang dibangun dengan Express.js, TypeScript, PostgreSQL, Redis, dan WebSocket.

## 📋 Daftar Isi

- [Instalasi & Setup](#instalasi--setup)
- [Struktur Project](#struktur-project)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Database & Migrations](#database--migrations)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [WebSocket](#websocket)
- [Redis](#redis)
- [RabbitMQ](#rabbitmq)
- [Development](#development)

## 🚀 Instalasi & Setup

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6
- RabbitMQ >= 3.8

### Install Dependencies

```bash
npm install
```

### Environment Variables

Buat file `.env` di root directory:

```env
# Server
PORT=3003
NODE_ENV=development

# PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_USER=your_user
PG_PASSWORD=your_password
PG_DATABASE=chatapp
PG_SSL=false

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost

# JWT & Security
SECRET_KEY=your_secret_key_min_32_chars_long

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Token Expiry
REFRESH_TOKEN_EXPIRES_DAYS=30
REFRESH_ROTATE_THRESHOLD_DAYS=7

# Client
CLIENT_URL=http://localhost:3000
```

### Database Setup

```bash
# Jalankan migrations
npm run migrate:up

# Check PostgreSQL connection
npm run db:check
```

### Running the Server

**Development Mode:**

```bash
npm run dev
```

**Production Mode:**

```bash
npm run build
npm start
```

## 📁 Struktur Project

```
src/
├── config/                 # Configuration files
│   └── index.ts           # Config loader dari environment variables
├── databases/             # Database connections
│   ├── postgres.ts        # PostgreSQL pool setup & helpers
│   └── redis.ts           # Redis client setup & helpers
├── errors/                # Custom error classes
│   └── HttpError.ts       # Standard HTTP error
├── lib/                   # Libraries & utilities
│   ├── rabbitmq.ts        # RabbitMQ connection & helpers
│   └── websocket.ts       # WebSocket (Socket.IO) setup
├── middleware/            # Express middlewares
│   ├── auth.ts            # JWT authentication middleware
│   ├── asyncHandler.ts    # Async error handling wrapper
│   ├── errorHandler.ts    # Global error handler
│   └── logrequest.ts      # Request logging
├── modules/               # Feature modules
│   ├── auth/              # Authentication
│   │   └── tokenService.ts
│   ├── user/              # User management
│   │   ├── userModel.ts
│   │   ├── userRepository.ts
│   │   ├── userService.ts
│   │   └── userRoute.ts
│   ├── chat/              # Chat management
│   │   ├── chatModel.ts
│   │   ├── chatRepository.ts
│   │   ├── chatService.ts
│   │   ├── chatRoute.ts
│   │   └── chatWebSocket.ts
│   ├── chatRequest/       # Chat request management
│   │   ├── chatRequestModel.ts
│   │   ├── chatRequestRepository.ts
│   │   ├── chatRequestService.ts
│   │   └── chatRequestRoute.ts
│   └── token/             # Refresh token management
│       └── refreshTokenRepository.ts
├── scripts/               # Utility scripts
│   └── check-postgres.ts
├── utils/                 # Utility functions
│   └── response.ts
└── index.ts              # Application entry point

migrations/               # Database migrations
docs/                    # Documentation
```

## 🔧 Konfigurasi Environment

Semua konfigurasi dimuat dari environment variables di `src/config/index.ts`.

| Variable       | Default                | Description                |
|----------------|------------------------|----------------------------|
| `PORT`         | 3003                   | Server port                |
| `NODE_ENV`     | development            | Environment mode           |
| `PG_*`         | localhost:5432         | PostgreSQL connection      |
| `REDIS_URL`    | redis://localhost:6379 | Redis URL                  |
| `RABBITMQ_URL` | amqp://localhost       | RabbitMQ URL               |
| `SECRET_KEY`   | -                      | JWT secret (required)      |
| `CLIENT_URL`   | *                      | Frontend origin untuk CORS |

## 🗄️ Database & Migrations

### Schema Overview

**users**

- id (UUID, PK)
- name (VARCHAR)
- email (VARCHAR, UNIQUE)
- password (VARCHAR, hashed)
- avatar (VARCHAR)
- status (ENUM: online, offline, away)
- last_seen (TIMESTAMP)
- created_at (TIMESTAMP)

**chats**

- id (UUID, PK)
- type (ENUM: private, group)
- title (VARCHAR, optional)
- created_by (UUID, FK)
- created_at (TIMESTAMP)

**chat_members**

- id (UUID, PK)
- chat_id (UUID, FK)
- user_id (UUID, FK)
- role (ENUM: admin, member)
- joined_at (TIMESTAMP)
- last_read_message_id (UUID, FK, nullable)

**chat_requests**

- id (UUID, PK)
- sender_id (UUID, FK)
- receiver_id (UUID, FK)
- status (ENUM: pending, accepted, rejected, blocked)
- created_at (TIMESTAMP)
- responded_at (TIMESTAMP, nullable)

**refresh_tokens**

- id (UUID, PK)
- user_id (UUID, FK)
- token_hash (VARCHAR)
- expires_at (TIMESTAMP)
- created_at (TIMESTAMP)

### Menjalankan Migrations

```bash
# Up (forward)
npm run migrate:up

# Down (rollback)
npm run migrate:down

# Create migration baru
npm run migrate:create --name <name>
```

## 🔐 Authentication

### JWT Token

Project menggunakan JWT untuk authentication. Ada 2 tipe token:

**Access Token**

- Expires: 15 menit
- Gunakan untuk API requests
- Header: `Authorization: Bearer <access_token>`

**Refresh Token**

- Expires: 30 hari (configurable)
- Disimpan di HTTP-only cookie: `refreshToken`
- Gunakan untuk mendapatkan access token baru

### Login & Registration

```bash
POST /api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123",
  "avatar": "https://example.com/avatar.jpg" (optional)
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "access_token": "eyJ...",
    "refresh_token": "eyJ..."
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

```bash
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepass123"
}

Response: (sama seperti register)
```

### Token Refresh

```bash
POST /api/users/refresh-token

Response:
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ..." (di-rotate jika mendekati expiry)
  }
}
```

### Password Security

- Password di-hash menggunakan bcrypt (10 rounds)
- Sebelum di-hash, password di-hash dengan SHA256
- Flow: Raw Password → SHA256 → Bcrypt

Lihat: `src/modules/auth/tokenService.ts`

## 📡 WebSocket

Project menggunakan Socket.IO untuk real-time communication.

### Setup

WebSocket sudah terintegrasi dan ter-initialize di `src/index.ts`.

```typescript
ws.useAuth((socket, next) => {
    // Validate JWT token
});

ws.initialize(httpServer, {
    cors: { origin: Config.CLIENT_URL },
    pingTimeout: 60000,
    pingInterval: 25000,
});
```

### Events

#### Chat Events

**send_message**

```typescript
socket.emit('chat:send_message', {
  chatId: 'uuid',
  content: 'Hello!',
  type: 'text' // 'text' | 'image' | 'file'
});
```

**user_typing**

```typescript
socket.emit('chat:typing', {
  chatId: 'uuid',
  isTyping: true
});

// Receive
socket.on('chat:user_typing', (data) => {
  // { userId, chatId, isTyping }
});
```

**user_online/offline**

```typescript
socket.on('chat:user_online', (data) => {
  // { userId, status }
});
```

Lihat: `docs/WEBSOCKET_USAGE.md` untuk dokumentasi lengkap.

## 🔴 Redis

Redis digunakan untuk:

- Session caching
- Real-time presence
- Rate limiting
- Message queue

### Inisialisasi

```typescript
import { initRedis } from './databases/redis';

await initRedis();
```

### Usage

```typescript
import { set, get, del, setJson, getJson } from './databases/redis';

// Basic operations
await set('key', 'value', 3600); // dengan expiry
await get('key');
await del('key');

// JSON operations
await setJson('user:123', { name: 'John', age: 30 });
const user = await getJson('user:123');

// Direct client access
import { getRedisClient } from './databases/redis';
const client = getRedisClient();
await client.hSet('hash:key', { field1: 'value1' });
```

Lihat: `docs/REDIS_USAGE.md` untuk dokumentasi lengkap.

## 🐰 RabbitMQ

RabbitMQ digunakan untuk async messaging dan background jobs.

### Setup

```typescript
import * as rabbit from './lib/rabbitmq';

await rabbit.connect(Config.RABBITMQ_URL, {
    retries: 5,
    useConfirmChannel: true,
});
```

### Usage

```typescript
// Publish message
await rabbit.publish('queue_name', {
    action: 'send_email',
    email: 'user@example.com'
});

// Subscribe to queue
await rabbit.subscribe('queue_name', async (msg) => {
    console.log('Message:', msg);
});
```

Lihat: `docs/RABBITMQ_USAGE.md` untuk dokumentasi lengkap.

## 📌 API Endpoints

### User Endpoints

| Method | Endpoint                    | Auth | Description          |
|--------|-----------------------------|------|----------------------|
| POST   | `/api/users/register`       | -    | Register user baru   |
| POST   | `/api/users/login`          | -    | Login user           |
| POST   | `/api/users/refresh-token`  | -    | Refresh access token |
| POST   | `/api/users/logout`         | ✅    | Logout user          |
| GET    | `/api/users/:id`            | ✅    | Get user profile     |
| PUT    | `/api/users/:id`            | ✅    | Update user profile  |
| GET    | `/api/users`                | ✅    | List all users       |
| GET    | `/api/users/search?q=query` | ✅    | Search users         |

### Chat Endpoints

| Method | Endpoint                         | Auth | Description             |
|--------|----------------------------------|------|-------------------------|
| POST   | `/api/chats`                     | ✅    | Create chat             |
| GET    | `/api/chats`                     | ✅    | List user's chats       |
| GET    | `/api/chats/:id`                 | ✅    | Get chat details        |
| PUT    | `/api/chats/:id`                 | ✅    | Update chat             |
| DELETE | `/api/chats/:id`                 | ✅    | Delete chat             |
| POST   | `/api/chats/:id/members`         | ✅    | Add member ke chat      |
| DELETE | `/api/chats/:id/members/:userId` | ✅    | Remove member dari chat |

### Chat Request Endpoints

| Method | Endpoint                        | Auth | Description                  |
|--------|---------------------------------|------|------------------------------|
| POST   | `/api/chat-requests`            | ✅    | Send chat request            |
| GET    | `/api/chat-requests`            | ✅    | List chat requests           |
| PUT    | `/api/chat-requests/:id/accept` | ✅    | Accept request & create chat |
| PUT    | `/api/chat-requests/:id/reject` | ✅    | Reject request               |

## 🧪 Development

### Scripts

```bash
# Development mode (watch)
npm run dev

# Build TypeScript
npm run build

# Production start
npm start

# Database check
npm run db:check

# Migrations
npm run migrate:up
npm run migrate:down
npm run migrate:create
```

### Logging

Project menggunakan `winston` untuk logging:

- Info: Normal operations
- Warn: Warnings
- Error: Errors
- Debug: Development debugging

Logs ditulis ke console dan file (jika configured).

### Error Handling

Semua route errors ditangani dengan `asyncHandler` middleware dan global error handler:

```typescript
import { asyncHandler } from '../middleware/asyncHandler';

app.get('/route', asyncHandler(async (req, res) => {
    // errors akan automatically caught & handled
    throw new Error('Something went wrong');
}));
```

### Response Format

Semua API responses mengikuti format standard:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* payload */ },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

## 📚 Additional Documentation

- [WebSocket Usage](./docs/WEBSOCKET_USAGE.md)
- [Redis Setup](./docs/REDIS_USAGE.md)
- [RabbitMQ Setup](./docs/RABBITMQ_USAGE.md)
- [WebSocket Client](./docs/WEBSOCKET_CLIENT.md)

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit PR

## 📝 License

MIT

