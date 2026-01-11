# Redis Library Documentation

Dokumentasi lengkap untuk Redis client library yang type-safe dan reusable.

## 📦 Overview

Redis library menyediakan:

- Redis client dengan automatic reconnection
- Type-safe operations
- JSON serialization/deserialization
- Graceful shutdown handling
- Configurable connection parameters

## 🔧 Initialization

### Basic Setup

```typescript
// src/index.ts
import {initRedis, shutdownRedis} from './databases/redis';

async function start() {
    try {
        // Initialize dengan default config dari environment variables
        await initRedis();

        console.log('Redis connected');
    } catch (err) {
        console.error('Failed to connect:', err);
        process.exit(1);
    }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
    await shutdownRedis();
    process.exit(0);
});
```

### Advanced Setup dengan Custom Config

```typescript
// Override default configuration
await initRedis({
    url: 'redis://user:password@redis.example.com:6379',
    socket: {
        host: 'redis.example.com',
        port: 6379,
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 50, 500);
        },
    },
}, {
    retries: 10,
    initialDelayMs: 500,
    factor: 1.5,
});
```

## ⚙️ Configuration

### RedisConfig Type

```typescript
type RedisConfig = {
    url?: string;              // Redis URL (e.g., redis://localhost:6379)
    socket?: {
        host?: string;         // Redis host (default: localhost)
        port?: number;         // Redis port (default: 6379)
        reconnectStrategy?: (retries: number) => number | Error;
    };
};
```

### Retry Options

```typescript
type RetryOptions = {
    retries?: number;           // Number of retry attempts (default: 5)
    initialDelayMs?: number;    // Initial retry delay (default: 200ms)
    factor?: number;            // Exponential backoff factor (default: 2)
};
```

### Environment Variables

```env
# Redis connection
REDIS_URL=redis://localhost:6379

# Or specify components
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

## 🚀 Usage

### String Operations

#### Set Value

```typescript
import {set} from './databases/redis';

// Without expiry
await set('username:123', 'john_doe');

// With expiry (seconds)
await set('session:abc', 'token-value', 3600); // expires in 1 hour
```

#### Get Value

```typescript
import {get} from './databases/redis';

const value = await get('username:123');
console.log(value); // 'john_doe'

// Non-existent key returns null
const missing = await get('non-existent');
console.log(missing); // null
```

#### Delete Value

```typescript
import {del} from './databases/redis';

const deletedCount = await del('username:123');
console.log(deletedCount); // 1 (number of keys deleted)

// Delete non-existent key
const deleted = await del('non-existent');
console.log(deleted); // 0
```

### JSON Operations

#### Store JSON

```typescript
import {setJson} from './databases/redis';

const userData = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'online',
};

// Without expiry
await setJson('user:123', userData);

// With expiry
await setJson('user:123', userData, 3600); // expires in 1 hour
```

#### Retrieve JSON

```typescript
import {getJson} from './databases/redis';

type User = {
    id: string;
    name: string;
    email: string;
    status: 'online' | 'offline' | 'away';
};

const user = await getJson<User>('user:123');

if (user) {
    console.log(user.name);   // 'John Doe'
    console.log(user.status); // 'online'
} else {
    console.log('User not found');
}
```

**Type Safety:**

```typescript
// Properly typed retrieval
const userOption: User | null = await getJson<User>('user:123');

// TypeScript knows all properties
if (userOption) {
    console.log(userOption.email); // ✅ Type-safe
    console.log(userOption.unknown); // ❌ Error: property doesn't exist
}
```

### Key Expiry

#### Check if Key Exists

```typescript
import {exists} from './databases/redis';

const keyExists = await exists('user:123');
console.log(keyExists); // 1 if exists, 0 if not
```

#### Set Expiry on Existing Key

```typescript
import {expire} from './databases/redis';

// Set expire after 1 hour (3600 seconds)
const setExpiry = await expire('user:123', 3600);
console.log(setExpiry); // true if key exists, false otherwise
```

#### Get Time-To-Live

```typescript
import {ttl} from './databases/redis';

const secondsLeft = await ttl('user:123');

if (secondsLeft > 0) {
    console.log(`Key expires in ${secondsLeft} seconds`);
} else if (secondsLeft === -1) {
    console.log('Key exists with no expiry');
} else if (secondsLeft === -2) {
    console.log('Key does not exist');
}
```

### Direct Client Access

Untuk operations yang tidak bisa di-abstract:

```typescript
import {getRedisClient} from './databases/redis';

const client = getRedisClient();

// Hash operations
await client.hSet('user:profile:123', {
    name: 'John',
    email: 'john@example.com',
    age: 30,
});

const profile = await client.hGetAll('user:profile:123');
console.log(profile); // { name: 'John', email: 'john@example.com', age: 30 }

// List operations
await client.lPush('notifications:user:123', 'You have a new message');
const notifications = await client.lRange('notifications:user:123', 0, -1);

// Set operations
await client.sAdd('online_users', 'user:123');
await client.sAdd('online_users', 'user:456');
const onlineUsers = await client.sMembers('online_users');

// Increment/Decrement
await client.set('counter', '0');
await client.incr('counter'); // 1
await client.incr('counter'); // 2
await client.decr('counter'); // 1
```

## 📋 API Reference

### initRedis()

Initialize Redis client.

```typescript
export async function initRedis(
    cfg?: Partial<RedisConfig>,
    options?: {
        retries?: number;
        initialDelayMs?: number;
        factor?: number;
    }
): Promise<void>
```

**Parameters:**

- `cfg`: Custom configuration
- `options`: Retry/backoff options

**Throws:**

- Error jika tidak bisa connect setelah retries

**Example:**

```typescript
await initRedis({
    url: 'redis://localhost:6379'
}, {
    retries: 5,
    initialDelayMs: 200,
    factor: 2,
});
```

---

### getRedisClient()

Get Redis client instance untuk custom operations.

```typescript
export function getRedisClient(): RedisClientType
```

**Returns:**

- RedisClientType instance

**Throws:**

- Error jika client not initialized

**Example:**

```typescript
const client = getRedisClient();
await client.hSet('key', {field: 'value'});
```

---

### set()

Set string value dengan optional expiry.

```typescript
export async function set(
    key: string,
    value: string,
    expiryInSeconds?: number
): Promise<void>
```

**Parameters:**

- `key`: Redis key
- `value`: String value
- `expiryInSeconds`: Optional expiry time in seconds

**Example:**

```typescript
await set('session:abc123', 'user-id-here', 3600); // 1 hour
```

---

### get()

Get string value.

```typescript
export async function get(key: string): Promise<string | null>
```

**Returns:**

- String value atau null jika key tidak ada

**Example:**

```typescript
const token = await get('session:abc123');
if (token) {
    // Use token
}
```

---

### del()

Delete key(s).

```typescript
export async function del(key: string): Promise<number>
```

**Returns:**

- Number of deleted keys

**Example:**

```typescript
const deleted = await del('session:abc123');
console.log(`Deleted ${deleted} key(s)`);
```

---

### exists()

Check if key exists.

```typescript
export async function exists(key: string): Promise<number>
```

**Returns:**

- 1 if key exists, 0 otherwise

**Example:**

```typescript
const exists = await exists('user:123');
if (exists) {
    console.log('User cached');
}
```

---

### expire()

Set expiry on existing key.

```typescript
export async function expire(
    key: string,
    seconds: number
): Promise<boolean>
```

**Returns:**

- true if key exists and expiry set, false otherwise

**Example:**

```typescript
const success = await expire('cache:key', 3600);
if (!success) {
    console.log('Key does not exist');
}
```

---

### ttl()

Get time-to-live remaining.

```typescript
export async function ttl(key: string): Promise<number>
```

**Returns:**

- Seconds remaining, -1 if no expiry, -2 if doesn't exist

**Example:**

```typescript
const ttl = await ttl('user:123');
if (ttl > 0) {
    console.log(`${ttl} seconds remaining`);
}
```

---

### setJson<T>()

Set JSON value dengan optional expiry.

```typescript
export async function setJson<T = any>(
    key: string,
    value: T,
    expiryInSeconds?: number
): Promise<void>
```

**Parameters:**

- `key`: Redis key
- `value`: Object to serialize
- `expiryInSeconds`: Optional expiry time in seconds

**Example:**

```typescript
interface UserCache {
    id: string;
    name: string;
    status: 'online' | 'offline';
}

const user: UserCache = {
    id: 'user-123',
    name: 'John',
    status: 'online'
};

await setJson('user:123', user, 3600);
```

---

### getJson<T>()

Get JSON value dengan type safety.

```typescript
export async function getJson<T = any>(
    key: string
): Promise<T | null>
```

**Type Parameters:**

- `T`: Type of stored object

**Returns:**

- Parsed object atau null jika tidak ada

**Example:**

```typescript
interface UserCache {
    id: string;
    name: string;
}

const user = await getJson<UserCache>('user:123');
if (user) {
    console.log(user.name); // Type-safe
}
```

---

### shutdownRedis()

Graceful shutdown dari Redis client.

```typescript
export async function shutdownRedis(timeoutMs?: number): Promise<void>
```

**Parameters:**

- `timeoutMs`: Timeout untuk shutdown (default: 5000ms)

**Example:**

```typescript
process.on('SIGINT', async () => {
    await shutdownRedis();
    process.exit(0);
});
```

---

## Connection Lifecycle

```
┌─────────────────────────────────────────┐
│  initRedis() called                     │
└──────────────┬──────────────────────────┘
               │
    ┌──────────▼──────────────────────┐
    │ Create Client Instance          │
    └──────────┬──────────────────────┘
               │
    ┌──────────▼──────────────────────┐
    │ Try to connect (with retries)   │
    └──────────┬──────────────────────┘
               │
    ┌──────────▼──────────┐
    │ Client Ready        │
    │ emit: 'ready'       │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────────────────┐
    │ Serve commands from client      │
    └──────────┬──────────────────────┘
               │
    ┌──────────▼──────────┐
    │ shutdownRedis()     │
    │ Called              │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ Graceful disconnect │
    └─────────────────────┘
```

## Events

Redis client emits events:

```typescript
const client = getRedisClient();

// Connection established
client.on('connect', () => {
    console.log('Connected to Redis');
});

// Ready to accept commands
client.on('ready', () => {
    console.log('Ready');
});

// Reconnecting after disconnect
client.on('reconnecting', () => {
    console.log('Reconnecting...');
});

// Error occurred
client.on('error', (err) => {
    console.error('Error:', err);
});

// Connection ended
client.on('end', () => {
    console.log('Connection closed');
});
```

## 💾 Use Cases

### 1. Session Caching

```typescript
import {setJson, getJson} from './databases/redis';

interface Session {
    userId: string;
    email: string;
    createdAt: number;
}

// Save session
const session: Session = {
    userId: 'user-123',
    email: 'john@example.com',
    createdAt: Date.now(),
};
await setJson(`session:${sessionId}`, session, 3600); // 1 hour

// Retrieve session
const cached = await getJson<Session>(`session:${sessionId}`);
```

### 2. User Status Tracking

```typescript
import {set, get} from './databases/redis';

// Update user status
await set(`user:${userId}:status`, 'online');

// Later, check status
const status = await get(`user:${userId}:status`);
```

### 3. Counter/Analytics

```typescript
const client = getRedisClient();

// Increment view counter
await client.incr(`views:post:${postId}`);

// Get current count
const views = await client.get(`views:post:${postId}`);
```

### 4. Rate Limiting

```typescript
import {incr, ttl} from './databases/redis';

const key = `rate_limit:${userId}:${minute}`;
const count = await incr(key);

if (count === 1) {
    // First request, set expiry
    await expire(key, 60); // 1 minute
}

if (count > 100) {
    throw new Error('Rate limit exceeded');
}
```

### 5. Pub/Sub

```typescript
const client = getRedisClient();

// Subscribe
const subscriber = client.duplicate();
await subscriber.subscribe('notifications', (message) => {
    console.log('Received:', message);
});

// Publish
await client.publish('notifications', 'New message!');
```

## ⚡ Performance Tips

### 1. Key Naming Convention

```typescript
// Good: Hierarchical naming
`user:${userId}:profile`
    `chat:${chatId}:messages`
    `session:${sessionId}`

// Avoid: Flat names
    `user_profile_123`
    `chatmessages456`
```

### 2. Use Appropriate Expiry

```typescript
// Sessions: 1 hour
await setJson('session:abc', data, 3600);

// Cache: 5 minutes
await setJson('cache:posts', data, 300);

// Temporary: 1 minute
await set('temp:key', value, 60);

// Persistent
await set('persistent:key', value);
```

### 3. Batch Operations with Client

```typescript
const client = getRedisClient();

// Bad: Multiple operations
for (const id of ids) {
    await set(`key:${id}`, value);
}

// Good: Use pipeline (faster)
const pipeline = client.multi();
for (const id of ids) {
    pipeline.set(`key:${id}`, value);
}
await pipeline.exec();
```

### 4. Monitor Memory Usage

```typescript
const client = getRedisClient();
const info = await client.info('memory');
console.log(info);
```

## 🧪 Testing

### Mock Redis

```typescript
jest.mock('../databases/redis', () => ({
    getRedisClient: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    getJson: jest.fn(),
    setJson: jest.fn(),
}));

import {getJson, setJson} from '../databases/redis';

describe('Cache Service', () => {
    it('should cache user', async () => {
        const mockUser = {id: '123', name: 'John'};
        (getJson as jest.Mock).mockResolvedValue(mockUser);

        const result = await someFunction();
        expect(result).toEqual(mockUser);
    });
});
```

### Integration Test

```typescript
describe('Redis Integration', () => {
    beforeAll(async () => {
        await initRedis();
    });

    afterAll(async () => {
        await shutdownRedis();
    });

    it('should store and retrieve data', async () => {
        const key = 'test:key';
        const value = {name: 'test'};

        await setJson(key, value);
        const retrieved = await getJson(key);

        expect(retrieved).toEqual(value);
    });
});
```

## ❌ Common Errors & Fixes

### Error: "Redis client not initialized"

**Cause**: `initRedis()` belum dipanggil

**Fix**:

```typescript
// src/index.ts
await initRedis();
```

---

### Error: "connect ECONNREFUSED 127.0.0.1:6379"

**Cause**: Redis server tidak running

**Fix**:

```bash
# Linux/Mac
redis-server

# Or Docker
docker run -d -p 6379:6379 redis:latest
```

---

### Error: "WRONGTYPE Operation against a key holding the wrong kind of value"

**Cause**: Trying to operate on wrong data type

**Fix**:

```typescript
// If you stored string, don't use hash operations
await set('key', 'value');
const value = await get('key'); // ✅ Correct

// Wrong:
const profile = await getRedisClient().hGetAll('key'); // ❌ Error
```

---

### Error: "Connection timeout"

**Cause**: Redis not responding in time

**Fix**:

```typescript
await initRedis({...}, {
    retries: 10,
    initialDelayMs: 1000,
});
```

---

## Security Best Practices

1. **Use PASSWORD** untuk production:

```env
REDIS_URL=redis://user:password@localhost:6379
```

2. **Use SSL/TLS**:

```typescript
await initRedis({
    url: 'rediss://user:password@redis.example.com:6379'
});
```

3. **Never log sensitive data**:

```typescript
// ❌ Bad
console.log('Storing:', key, value);

// ✅ Good
console.log('Storing key:', key);
```

4. **Validate data before storing**:

```typescript
import {z} from 'zod';

const UserSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
});

const validated = UserSchema.parse(userData);
await setJson('user:123', validated);
```

## References

- [Redis Documentation](https://redis.io/documentation)
- [Node Redis Client](https://github.com/luin/ioredis)
- [Redis Commands](https://redis.io/commands/)

