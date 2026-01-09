# Redis Connection Setup

## Overview

Redis connection module with automatic retry logic, connection pooling, and graceful shutdown support.

## Configuration

Set the following environment variables in your `.env` file:

```env
REDIS_URL=redis://localhost:6379
# OR specify individual connection parameters:
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

## Initialization

Redis is automatically initialized in `src/index.ts` during application startup:

```typescript
import {initRedis, shutdownRedis} from './databases/redis';

// Initialize connection
await initRedis();

// Graceful shutdown
await shutdownRedis();
```

## Usage Examples

### Basic Operations

```typescript
import {set, get, del} from './databases/redis';

// Set a value
await set('user:123', 'John Doe');

// Set with expiry (in seconds)
await set('session:abc', 'token-value', 3600); // expires in 1 hour

// Get a value
const value = await get('user:123');
console.log(value); // 'John Doe'

// Delete a key
await del('user:123');
```

### JSON Operations

```typescript
import {setJson, getJson} from './databases/redis';

// Store JSON objects
await setJson('user:123', {name: 'John', age: 30});

// With expiry
await setJson('cache:data', {result: [1, 2, 3]}, 300); // 5 minutes

// Retrieve JSON objects
const user = await getJson<{ name: string; age: number }>('user:123');
console.log(user?.name); // 'John'
```

### Advanced Operations

```typescript
import {exists, expire, ttl, getRedisClient} from './databases/redis';

// Check if key exists
const keyExists = await exists('user:123'); // returns 1 if exists, 0 otherwise

// Set expiration on existing key
await expire('user:123', 3600); // expire in 1 hour

// Get time-to-live
const secondsLeft = await ttl('user:123'); // returns remaining seconds

// Direct client access for advanced operations
const client = getRedisClient();
await client.hSet('user:profile:123', {name: 'John', email: 'john@example.com'});
const profile = await client.hGetAll('user:profile:123');
```

## Connection Options

You can customize the connection behavior:

```typescript
import {initRedis} from './databases/redis';

await initRedis(
    {
        url: 'redis://localhost:6379',
        // OR
        socket: {
            host: 'localhost',
            port: 6379,
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    return new Error('Max retries reached');
                }
                return Math.min(retries * 50, 500);
            },
        },
    },
    {
        retries: 5,
        initialDelayMs: 200,
        factor: 2,
    }
);
```

## Common Use Cases

### Session Management

```typescript
// Store user session
await setJson(`session:${sessionId}`, {
    userId: '123',
    email: 'user@example.com',
    createdAt: Date.now(),
}, 86400); // 24 hours

// Retrieve session
const session = await getJson<SessionData>(`session:${sessionId}`);
if (!session) {
    throw new Error('Session expired');
}
```

### Caching

```typescript
// Cache database query results
const cacheKey = `user:profile:${userId}`;
let profile = await getJson(cacheKey);

if (!profile) {
    profile = await fetchUserProfileFromDB(userId);
    await setJson(cacheKey, profile, 300); // cache for 5 minutes
}

return profile;
```

### Rate Limiting

```typescript
const client = getRedisClient();
const key = `ratelimit:${userId}:${endpoint}`;

const current = await client.incr(key);
if (current === 1) {
    await client.expire(key, 60); // 1 minute window
}

if (current > 100) {
    throw new Error('Rate limit exceeded');
}
```

## Error Handling

The Redis module includes automatic retry logic with exponential backoff. If connection fails after all retries, an
error is thrown:

```typescript
try {
    await initRedis();
} catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    process.exit(1);
}
```

## API Reference

### Core Functions

- `initRedis(config?, options?)` - Initialize Redis connection with retry logic
- `shutdownRedis(timeoutMs?)` - Gracefully shutdown Redis connection
- `getRedisClient()` - Get the raw Redis client for advanced operations

### String Operations

- `set(key, value, expiryInSeconds?)` - Set a string value
- `get(key)` - Get a string value
- `del(key)` - Delete a key

### JSON Operations

- `setJson<T>(key, value, expiryInSeconds?)` - Store JSON object
- `getJson<T>(key)` - Retrieve JSON object

### Utility Functions

- `exists(key)` - Check if key exists
- `expire(key, seconds)` - Set expiration on a key
- `ttl(key)` - Get time-to-live for a key

## Events

The Redis client emits several events that are automatically logged:

- `connect` - Connection is being established
- `ready` - Client is ready to accept commands
- `error` - An error occurred
- `reconnecting` - Client is attempting to reconnect
- `end` - Connection has closed

