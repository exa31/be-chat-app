# Database Setup & Configuration

Dokumentasi lengkap untuk setup dan konfigurasi PostgreSQL dan Redis.

## PostgreSQL

### Installation

#### Windows

1. Download installer dari [postgresql.org](https://www.postgresql.org/download/windows/)
2. Jalankan installer dan ikuti setup wizard
3. Remember the password untuk `postgres` user
4. Default port adalah `5432`

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

#### macOS

```bash
brew install postgresql@14
brew services start postgresql@14
```

### Initial Setup

#### 1. Connect to PostgreSQL

```bash
# Using psql command line
psql -U postgres
```

#### 2. Create Database & User

```sql
-- Create database
CREATE
DATABASE chatapp OWNER postgres;

-- Create user (optional, recommended for production)
CREATE
USER chatapp_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE
chatapp TO chatapp_user;

-- Connect to database
\c
chatapp

-- Grant schema privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO chatapp_user;
GRANT ALL PRIVILEGES ON ALL
TABLES IN SCHEMA public TO chatapp_user;
GRANT ALL PRIVILEGES ON ALL
SEQUENCES IN SCHEMA public TO chatapp_user;
```

#### 3. Verify Connection

```bash
psql -U postgres -d chatapp -h localhost
```

### Environment Variables

```env
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_secure_password
PG_DATABASE=chatapp
PG_SSL=false
PG_MAX=10
PG_IDLE_TIMEOUT_MS=30000
PG_CONNECTION_TIMEOUT_MS=2000
```

### Running Migrations

```bash
# View all migrations
npm run migrate:up -- --dry-run

# Apply all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Create new migration
npm run migrate:create -- --name add_new_feature
```

### Connection Pooling

Project menggunakan `pg` library dengan connection pooling:

**Configuration** (`src/databases/postgres.ts`):

- **max**: 10 connections (configurable via `PG_MAX`)
- **idleTimeoutMillis**: 30 seconds (configurable via `PG_IDLE_TIMEOUT_MS`)
- **connectionTimeoutMillis**: 2 seconds (configurable via `PG_CONNECTION_TIMEOUT_MS`)

**Connection Pool Features:**

- Automatic retry with exponential backoff
- Connection timeout handling
- Graceful shutdown
- Transaction support

### Usage Examples

#### Simple Query

```typescript
import {query} from '../databases/postgres';

const result = await query(
    'SELECT * FROM users WHERE email = $1',
    ['john@example.com']
);

console.log(result.rows);
```

#### Type-Safe Query

```typescript
import {query, QueryResult} from '../databases/postgres';
import {UserRow} from '../modules/user/userModel';

const result: QueryResult<UserRow> = await query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
);

const user = result.rows[0];
```

#### Transaction

```typescript
import {withTransaction} from '../databases/postgres';

const result = await withTransaction(async (client) => {
    // Query 1
    await client.query('INSERT INTO users (...) VALUES (...)', [...]);

    // Query 2
    const result = await client.query('SELECT * FROM users', []);

    // Jika error, automatic rollback
    return result.rows;
});
```

#### Get Client

```typescript
import {getClient} from '../databases/postgres';

const client = await getClient();
try {
    const result = await client.query('SELECT * FROM users');
    console.log(result.rows);
} finally {
    client.release();
}
```

## Redis

### Installation

#### Windows

1. Download dari [redis.io/download](https://redis.io/download)
2. Atau gunakan Windows Subsystem for Linux (WSL):

```bash
wsl
sudo apt install redis-server
redis-server
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### macOS

```bash
brew install redis
brew services start redis
```

#### Docker

```bash
docker run -d -p 6379:6379 redis:latest
```

### Verify Installation

```bash
redis-cli ping
# Should return: PONG
```

### Environment Variables

```env
REDIS_URL=redis://localhost:6379
```

Atau custom configuration:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password
```

### Usage Examples

#### Basic Operations

```typescript
import {set, get, del} from '../databases/redis';

// Set string value
await set('user:123:name', 'John Doe');

// Set with expiry (in seconds)
await set('session:abc', 'token-value', 3600);

// Get value
const name = await get('user:123:name');
console.log(name); // 'John Doe'

// Delete key
await del('user:123:name');
```

#### JSON Operations

```typescript
import {setJson, getJson} from '../databases/redis';

const userData = {name: 'John', email: 'john@example.com', age: 30};

// Store JSON
await setJson('user:123', userData, 3600);

// Retrieve JSON
const user = await getJson('user:123');
console.log(user.name); // 'John'
```

#### Increment/Decrement

```typescript
import {increment, decrement} from '../databases/redis';

await set('counter', '0');
await increment('counter'); // 1
await increment('counter'); // 2
await decrement('counter'); // 1
```

#### Expiry Management

```typescript
import {expire, ttl, exists} from '../databases/redis';

// Set expiry on existing key
await expire('user:123', 3600); // expire in 1 hour

// Get remaining TTL
const secondsLeft = await ttl('user:123');

// Check existence
const exists = await exists('user:123');
```

#### Direct Client Access

```typescript
import {getRedisClient} from '../databases/redis';

const client = getRedisClient();

// Hash operations
await client.hSet('user:profile:123', {
    name: 'John',
    email: 'john@example.com'
});

const profile = await client.hGetAll('user:profile:123');

// List operations
await client.lPush('notifications:456', 'You have a new message');
const notifications = await client.lRange('notifications:456', 0, -1);

// Set operations
await client.sAdd('online_users', 'user:123');
const onlineUsers = await client.sMembers('online_users');
```

### Connection Options

```typescript
import {initRedis} from '../databases/redis';

await initRedis({
    url: 'redis://localhost:6379',
    socket: {
        host: 'localhost',
        port: 6379,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    },
    database: 0,
});
```

### Advanced: Pub/Sub

```typescript
import {getRedisClient} from '../databases/redis';

const client = getRedisClient();

// Subscribe
const subscriber = client.duplicate();
await subscriber.subscribe('notifications', (message) => {
    console.log('Received:', message);
});

// Publish
await client.publish('notifications', 'New message!');
```

## Data Types Reference

### PostgreSQL Data Types

| Type                       | Description                   | Example                                |
|----------------------------|-------------------------------|----------------------------------------|
| `uuid`                     | Universally unique identifier | `550e8400-e29b-41d4-a716-446655440000` |
| `varchar(n)`               | Variable-length string        | `varchar(255)`                         |
| `text`                     | Unlimited-length string       | User bios, descriptions                |
| `timestamp with time zone` | Date/time with timezone       | `2026-01-12 10:00:00+00`               |
| `boolean`                  | True/False                    | `true`, `false`                        |
| `integer`                  | Whole number                  | `-2147483648` to `2147483647`          |
| `bigint`                   | Large whole number            | `9223372036854775807`                  |
| `numeric(p,s)`             | Decimal number                | `numeric(10,2)`                        |
| `json`                     | JSON data                     | `{"key": "value"}`                     |
| `uuid[]`                   | Array of UUIDs                | `'{uuid1, uuid2}'`                     |

### Enums Used in Project

```sql
-- User status
CREATE TYPE user_status AS ENUM ('online', 'offline', 'away');

-- Chat type
CREATE TYPE chat_type AS ENUM ('private', 'group');

-- Chat member role
CREATE TYPE member_role AS ENUM ('admin', 'member');

-- Message type
CREATE TYPE message_type AS ENUM ('text', 'image', 'file');

-- Chat request status
CREATE TYPE chat_request_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
```

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Force new connection
psql --host=localhost --port=5432 --user=postgres

# View connection info
psql -l  # list databases
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Check Redis info
redis-cli info

# Monitor commands
redis-cli monitor

# Clear all data (be careful!)
redis-cli FLUSHALL
```

### Common Errors

**"FATAL: role 'postgres' does not exist"**

- Create the role: `createuser postgres`
- Or use default user in your system

**"could not translate host name to address"**

- Check PG_HOST is correct
- Verify firewall allows connections
- Try `localhost` instead of `127.0.0.1`

**"Connection timeout"**

- Increase `PG_CONNECTION_TIMEOUT_MS` in env
- Check PostgreSQL is running: `pg_isready`
- Check network connectivity

## Performance Tips

### PostgreSQL

1. **Create indexes** on frequently queried columns

```sql
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_chat_members_user_id ON chat_members (user_id);
```

2. **Use EXPLAIN ANALYZE** untuk check query performance

```sql
EXPLAIN
ANALYZE
SELECT *
FROM users
WHERE email = 'test@example.com';
```

3. **Connection pooling** sudah configured, jangan buat manual connections

### Redis

1. **Set appropriate TTLs** untuk prevent memory bloat
2. **Use pipelines** untuk multiple commands
3. **Monitor memory usage**: `redis-cli info memory`

## Backup & Recovery

### PostgreSQL Backup

```bash
# Full backup
pg_dump -U postgres chatapp > backup.sql

# Restore
psql -U postgres chatapp < backup.sql

# Backup with compression
pg_dump -U postgres chatapp | gzip > backup.sql.gz

# Restore from compressed
gunzip -c backup.sql.gz | psql -U postgres chatapp
```

### Redis Backup

```bash
# Manual save
redis-cli BGSAVE

# View backup files
ls /var/lib/redis/  # Linux/Mac
# Windows: check redis installation directory
```

## Security Best Practices

1. **Use strong passwords** untuk database users
2. **Enable SSL/TLS** untuk production:
   ```env
   PG_SSL=true
   ```

3. **Restrict database access** via firewall rules
4. **Use environment variables** untuk credentials, jangan hardcode
5. **Enable Redis authentication** untuk production
6. **Rotate refresh tokens** secara berkala
7. **Monitor database logs** untuk suspicious activities

## Monitoring

### PostgreSQL Queries

```sql
-- View active connections
SELECT datname, usename, application_name, state
FROM pg_stat_activity;

-- View slow queries (if log_min_duration_statement is set)
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

### Redis Monitoring

```bash
redis-cli --stat    # Show real-time stats
redis-cli --bigkeys # Show big keys
redis-cli info      # Full server info
```

