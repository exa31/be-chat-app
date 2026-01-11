# Quick Reference Guide

Panduan cepat untuk operasi umum dalam Chat App Backend development.

## 🚀 Startup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi Anda

# Start PostgreSQL
docker run -d -p 5432:5432 postgres:14

# Start Redis
docker run -d -p 6379:6379 redis:latest

# Start RabbitMQ
docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:management

# Run migrations
npm run migrate:up

# Start development server
npm run dev
```

## 🗄️ Database Operations

### PostgreSQL

```typescript
// Query
import { query } from './databases/postgres';
const users = await query('SELECT * FROM users WHERE status = $1', ['online']);

// Transaction
import { executeInTransaction } from './databases/postgres';
await executeInTransaction(async (client) => {
    await client.query('INSERT INTO users ...');
    await client.query('INSERT INTO logs ...');
});
```

### Redis

```typescript
import { set, get, setJson, getJson } from './databases/redis';

// String
await set('key', 'value', 3600); // with expiry
const value = await get('key');

// JSON
await setJson('user:123', { name: 'John' }, 3600);
const user = await getJson('user:123');
```

## 🔌 WebSocket

```typescript
import * as ws from './lib/websocket';

// Register handler
ws.on<{ chatId: string; text: string }>('chat:message', async (socket, data) => {
    ws.emitToRoom(`chat:${data.chatId}`, 'message:new', {
        sender: (socket as any).userId,
        text: data.text,
    });
});

// Send to specific socket
ws.emitToSocket(socketId, 'event', data);

// Send to room
ws.emitToRoom(roomId, 'event', data);

// Broadcast
ws.broadcast('event', data);

// Room management
await ws.joinRoom(socket.id, `chat:${chatId}`);
await ws.leaveRoom(socket.id, `chat:${chatId}`);
```

## 🐰 RabbitMQ

```typescript
import * as rabbit from './lib/rabbitmq';

// Connect
await rabbit.connect(process.env.RABBITMQ_URL);

// Publish
await rabbit.publish('notifications', 'email.send', {
    to: 'user@example.com',
    subject: 'Hello',
});

// Consume
await rabbit.consume('email-queue', async (job) => {
    await sendEmail(job);
}, { prefetch: 5 });

// Queue setup
await rabbit.assertQueue('email-queue', { durable: true });
await rabbit.assertExchange('notifications', 'topic');
await rabbit.bindQueue('email-queue', 'notifications', 'email.*');
```

## 🔐 Authentication

```typescript
import { signAccessToken, verifyAccessToken, hashPassword, verifyPassword } from './modules/auth/tokenService';

// Hash password
const hashed = await hashPassword('raw-password');

// Verify password
const valid = await verifyPassword('raw-password', hashed);

// Sign token
const token = signAccessToken({ id: 'user-123', email: 'john@example.com' });

// Verify token
const payload = verifyAccessToken(token);
```

## 📁 Creating New Feature

### 1. Model (userModel.ts)

```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
    name: z.string(),
    email: z.string().email(),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

### 2. Repository (userRepository.ts)

```typescript
import { PoolClient } from 'pg';

export async function createUser(client: PoolClient, input: CreateUserInput) {
    const result = await client.query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [input.name, input.email]
    );
    return result.rows[0];
}
```

### 3. Service (userService.ts)

```typescript
import { executeInTransaction } from '../databases/postgres';

export async function createUser(input: CreateUserInput) {
    return executeInTransaction(async (client) => {
        return userRepository.createUser(client, input);
    });
}
```

### 4. Route (userRoute.ts)

```typescript
import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { CreateUserSchema } from './userModel';
import * as userService from './userService';

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
    const input = CreateUserSchema.parse(req.body);
    const user = await userService.createUser(input);
    res.status(201).json({
        success: true,
        data: user,
        message: 'User created',
        timestamp: new Date().toISOString(),
    });
}));

export default router;
```

## ✅ Error Handling

```typescript
import { HttpError } from '../errors/HttpError';
import { asyncHandler } from '../middleware/asyncHandler';

// Throw error
if (!user) {
    throw new HttpError(404, 'User not found');
}

// Caught by asyncHandler and passed to error handler
// Response automatically formatted
```

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Test Example

```typescript
describe('UserService', () => {
    it('should create user', async () => {
        const result = await userService.createUser({
            name: 'John',
            email: 'john@example.com',
        });
        expect(result.email).toBe('john@example.com');
    });
});
```

## 📡 API Testing

### Using cURL

```bash
# Register
curl -X POST http://localhost:3003/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:3003/api/users/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"john@example.com","password":"pass123"}'

# Get user (with token)
curl -X GET http://localhost:3003/api/users/123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# With cookie
curl -X POST http://localhost:3003/api/users/refresh-token \
  -b cookies.txt
```

### Using Postman

1. Create environment with `base_url` variable
2. Create request with `{{base_url}}/api/users/register`
3. Use Tests tab untuk extract token:

```javascript
pm.environment.set('access_token', pm.response.json().data.access_token);
```

4. Use token di requests lain: `Authorization: Bearer {{access_token}}`

## 🔍 Debugging

### Enable Debug Logging

```bash
DEBUG=* npm run dev
```

### Check Connections

```bash
# PostgreSQL
psql -U postgres -d chatapp

# Redis
redis-cli ping

# RabbitMQ
# Visit http://localhost:15672 (user: guest, pass: guest)
```

### Database Inspection

```bash
# Check tables
psql -U postgres -d chatapp -c "\dt"

# Check data
psql -U postgres -d chatapp -c "SELECT * FROM users;"

# Check migrations
psql -U postgres -d chatapp -c "SELECT * FROM pgmigrations;"
```

## 🌳 Common Patterns

### Transaction Pattern

```typescript
export async function transferFunds(from: string, to: string, amount: number) {
    return executeInTransaction(async (client) => {
        // Deduct from sender
        await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]);
        
        // Add to receiver
        await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, to]);
        
        // Log transaction
        await client.query('INSERT INTO transactions (from, to, amount) VALUES ($1, $2, $3)', [from, to, amount]);
    });
}
```

### Cache Pattern

```typescript
export async function getUserById(id: string) {
    // Check cache
    const cached = await getJson(`user:${id}`);
    if (cached) return cached;

    // Get from DB
    const user = await query('SELECT * FROM users WHERE id = $1', [id]);
    
    // Store in cache
    await setJson(`user:${id}`, user.rows[0], 3600);
    
    return user.rows[0];
}
```

### Async Job Pattern

```typescript
// In route
app.post('/send-email', asyncHandler(async (req, res) => {
    const job = { to: req.body.email, ... };
    
    // Queue job (non-blocking)
    await rabbit.publish('notifications', 'email.send', job);
    
    res.json({ success: true, message: 'Email queued' });
}));

// In consumer (separate process)
await rabbit.consume('email-queue', async (job) => {
    await sendEmail(job);
});
```

### Rate Limiting Pattern

```typescript
const key = `rate_limit:${userId}:${Date.now() / 60000}`;
const count = await getRedisClient().incr(key);

if (count === 1) {
    await expire(key, 60);
}

if (count > 100) {
    throw new HttpError(429, 'Rate limit exceeded');
}
```

## 📊 Monitoring

```bash
# Check PostgreSQL connections
psql -U postgres -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Check Redis memory
redis-cli info memory

# Check RabbitMQ queues
# Visit http://localhost:15672
```

## 🚢 Deployment Checklist

- [ ] Update .env untuk production
- [ ] Set `PG_SSL=true`
- [ ] Use strong `SECRET_KEY`
- [ ] Enable Redis authentication
- [ ] Setup SSL certificates
- [ ] Run migrations: `npm run migrate:up`
- [ ] Set `NODE_ENV=production`
- [ ] Build: `npm run build`
- [ ] Start: `npm start`
- [ ] Monitor logs
- [ ] Setup backups
- [ ] Setup monitoring

## 📚 Documentation Links

| Topic        | Link                                                     |
|--------------|----------------------------------------------------------|
| Full README  | [README.md](./README.md)                                 |
| Docs Index   | [docs/INDEX.md](./docs/INDEX.md)                         |
| Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)           |
| PostgreSQL   | [docs/POSTGRES_LIBRARY.md](./docs/POSTGRES_LIBRARY.md)   |
| Redis        | [docs/REDIS_LIBRARY.md](./docs/REDIS_LIBRARY.md)         |
| WebSocket    | [docs/WEBSOCKET_LIBRARY.md](./docs/WEBSOCKET_LIBRARY.md) |
| RabbitMQ     | [docs/RABBITMQ_LIBRARY.md](./docs/RABBITMQ_LIBRARY.md)   |
| Auth         | [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md)       |
| API Ref      | [docs/API_REFERENCE.md](./docs/API_REFERENCE.md)         |

## 🎯 Common Tasks

### Add New Endpoint

1. Create model (userModel.ts)
2. Create repository (userRepository.ts)
3. Create service (userService.ts)
4. Create route (userRoute.ts)
5. Register router di index.ts
6. Test dengan cURL/Postman
7. Update API_REFERENCE.md

### Add Database Table

1. Create migration: `npm run migrate:create -- --name add_table_name`
2. Edit migration file
3. Run: `npm run migrate:up`
4. Create model/schema
5. Create repository functions
6. Test queries

### Add Background Job

1. Define job interface
2. Add publisher di route/service
3. Create consumer
4. Add queue setup
5. Handle errors & retries
6. Monitor queue

### Add Real-time Feature

1. Register WebSocket handler
2. Emit events on action
3. Join/leave rooms as needed
4. Implement client listener
5. Test with dev tools

## 🆘 Help

```bash
# Check if services running
docker ps

# View logs
tail -f logs/error.log

# Rebuild
npm run build

# Reinstall
rm -rf node_modules
npm install
```

---

**Happy Coding! 🚀**

For more details, see [DOCUMENTATION_SUMMARY.md](./DOCUMENTATION_SUMMARY.md)

