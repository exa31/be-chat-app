# PostgreSQL Database Library

Dokumentasi lengkap untuk PostgreSQL connection pool library yang type-safe dan reusable.

## 📦 Overview

PostgreSQL library menyediakan:

- Connection pooling dengan automatic retry
- Type-safe query execution
- Transaction management dengan automatic rollback
- Graceful shutdown handling
- Configurable connection parameters

## 🔧 Initialization

### Basic Setup

```typescript
// src/index.ts
import {initPostgres, shutdownPostgres} from './databases/postgres';

async function start() {
    try {
        // Initialize dengan default config dari environment variables
        await initPostgres();

        console.log('Database connected');
    } catch (err) {
        console.error('Failed to connect:', err);
        process.exit(1);
    }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
    await shutdownPostgres();
    process.exit(0);
});
```

### Advanced Setup dengan Custom Config

```typescript
// Override default configuration
await initPostgres({
    host: 'db.example.com',
    port: 5432,
    user: 'chatapp_user',
    password: 'secure_password',
    database: 'chatapp_prod',
    max: 20,                    // Increase pool size
    idleTimeoutMillis: 60000,   // 1 minute idle timeout
    connectionTimeoutMillis: 5000, // 5 seconds connection timeout
}, {
    retries: 10,              // Retry 10 times
    initialDelayMs: 500,      // Start with 500ms delay
    factor: 1.5,              // Exponential backoff factor
});
```

## ⚙️ Configuration

### PostgresConfig Type

```typescript
type PostgresConfig = {
    host?: string;                 // PostgreSQL host (default: localhost)
    port?: number;                 // PostgreSQL port (default: 5432)
    user?: string;                 // Database user (default: postgres)
    password?: string;             // Database password (default: undefined)
    database?: string;             // Database name (default: chatapp)
    max?: number;                  // Max connections (default: 10)
    idleTimeoutMillis?: number;    // Idle timeout (default: 30000)
    connectionTimeoutMillis?: number; // Connection timeout (default: 2000)
    ssl?: boolean | object;        // SSL configuration (default: false)
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
# Database connection
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=chatapp

# Connection pool
PG_MAX=10
PG_IDLE_TIMEOUT_MS=30000
PG_CONNECTION_TIMEOUT_MS=2000

# SSL (optional)
PG_SSL=false
```

## 🚀 Usage

### Simple Query

**Query tanpa parameters:**

```typescript
import {query} from './databases/postgres';

const result = await query('SELECT * FROM users');
console.log(result.rows);
```

**Query dengan parameters (safe dari SQL injection):**

```typescript
const email = 'john@example.com';
const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
);

if (result.rows.length > 0) {
    console.log('User found:', result.rows[0]);
} else {
    console.log('User not found');
}
```

### Type-Safe Queries

Gunakan generic type untuk type safety:

```typescript
import {query, QueryResult} from './databases/postgres';
import type {UserRow} from '../modules/user/userModel';

// Explicitly specify return type
const result: QueryResult<UserRow> = await query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
);

const user = result.rows[0];
console.log(user.name); // Type-safe: TS knows user has 'name' property
```

### Insert Data

```typescript
import {query} from './databases/postgres';
import type {UserRow} from '../modules/user/userModel';

const userData: Omit<UserRow, 'id' | 'created_at'> = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password',
    status: 'offline',
};

const result = await query<UserRow>(
    `INSERT INTO users (name, email, password, status) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [userData.name, userData.email, userData.password, userData.status]
);

const newUser = result.rows[0];
console.log('User created:', newUser.id);
```

### Update Data

```typescript
const result = await query<UserRow>(
    `UPDATE users 
     SET name = $1, status = $2 
     WHERE id = $3 
     RETURNING *`,
    ['Jane Doe', 'online', userId]
);

if (result.rows.length === 0) {
    throw new Error('User not found');
}

const updatedUser = result.rows[0];
```

### Delete Data

```typescript
const result = await query(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [userId]
);

if (result.rowCount === 0) {
    throw new Error('User not found');
}

console.log('Deleted user:', result.rows[0].id);
```

### Pagination Query

```typescript
const limit = 20;
const offset = 40; // Page 3: (page - 1) * limit

const result = await query<UserRow>(
    `SELECT * FROM users 
     ORDER BY created_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
);

const countResult = await query('SELECT COUNT(*) FROM users');
const total = parseInt(countResult.rows[0].count, 10);

console.log({
    users: result.rows,
    total,
    limit,
    offset,
});
```

## 💾 Transactions

### Using executeInTransaction (Recommended)

```typescript
import {executeInTransaction} from './databases/postgres';
import type {PoolClient} from './databases/postgres';

export async function createChatWithMembers(
    chatData: CreateChatInput,
    memberIds: string[]
) {
    return executeInTransaction(async (client: PoolClient) => {
        // Step 1: Create chat
        const chatResult = await client.query<ChatRow>(
            `INSERT INTO chats (type, title, created_by) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [chatData.type, chatData.title, chatData.created_by]
        );
        const chat = chatResult.rows[0];

        // Step 2: Add members
        for (const memberId of memberIds) {
            await client.query(
                `INSERT INTO chat_members (chat_id, user_id, role) 
                 VALUES ($1, $2, $3)`,
                [chat.id, memberId, 'member']
            );
        }

        // Step 3: Return result
        return chat;

        // Jika ada error dalam transaction:
        // - ROLLBACK automatic ke client.query('ROLLBACK')
        // - Error di-throw untuk di-handle di service layer
    });
}
```

**Features:**

- ✅ Automatic ROLLBACK pada error
- ✅ Automatic COMMIT jika sukses
- ✅ Client di-release setelah selesai
- ✅ Error propagated untuk di-handle

### Using withTransaction (Alias)

```typescript
import {withTransaction} from './databases/postgres';

const result = await withTransaction(async (client) => {
    // Multiple operations
});
```

### Manual Transaction (Advanced)

```typescript
import {getClient} from './databases/postgres';

const client = await getClient();
try {
    await client.query('BEGIN');

    // Query 1
    const user = await client.query(
        'INSERT INTO users (...) VALUES (...) RETURNING *',
        [...]
    );

    // Query 2
    await client.query(
        'INSERT INTO user_logs (...) VALUES (...)',
        [user.rows[0].id, 'created']
    );

    // Query 3
    const result = await client.query('SELECT * FROM users WHERE id = $1', [user.rows[0].id]);

    await client.query('COMMIT');
    return result.rows;
} catch (err) {
    try {
        await client.query('ROLLBACK');
    } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
    }
    throw err;
} finally {
    client.release(); // Always release back to pool
}
```

## 🔌 Getting Raw Client

Untuk operations yang tidak bisa di-abstract:

```typescript
import {getClient} from './databases/postgres';

const client = await getClient();
try {
    // Use client for any operation
    const result = await client.query('SELECT * FROM users');
    return result.rows;
} finally {
    client.release(); // Must release!
}
```

## 📋 API Reference

### initPostgres()

Initialize database pool.

```typescript
export async function initPostgres(
    cfg?: Partial<PostgresConfig>,
    options?: {
        retries?: number;
        initialDelayMs?: number;
        factor?: number;
    }
): Promise<void>
```

**Parameters:**

- `cfg`: Custom configuration (merges with environment config)
- `options`: Retry/backoff options

**Throws:**

- Error jika tidak bisa connect setelah retries

**Example:**

```typescript
await initPostgres(undefined, {
    retries: 5,
    initialDelayMs: 200,
    factor: 2,
});
```

---

### query<T>()

Execute SQL query dengan type safety.

```typescript
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>>
```

**Parameters:**

- `text`: SQL query dengan $1, $2 placeholders
- `params`: Query parameters (array)

**Returns:**

- `QueryResult<T>`:
    - `rows: T[]` - Result rows
    - `rowCount: number` - Number of affected rows
    - `command: string` - SQL command type (SELECT, INSERT, etc)

**Throws:**

- Error jika query fails

**Example:**

```typescript
const result = await query<UserRow>(
    'SELECT * FROM users WHERE email = $1',
    ['john@example.com']
);
```

---

### getClient()

Get raw database client dari pool.

```typescript
export async function getClient(): Promise<PoolClient>
```

**Returns:**

- PoolClient untuk manual operations

**Important:**

- ⚠️ Must call `client.release()` setelah selesai
- Better menggunakan `executeInTransaction()` untuk safety

**Example:**

```typescript
const client = await getClient();
try {
    const result = await client.query('SELECT ...');
} finally {
    client.release();
}
```

---

### withTransaction() / executeInTransaction()

Execute function dalam transaction dengan automatic commit/rollback.

```typescript
export async function withTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
): Promise<T>

export const executeInTransaction = withTransaction; // Alias
```

**Parameters:**

- `fn`: Async function yang receive PoolClient

**Returns:**

- Result dari function

**Throws:**

- Error dari function (transaction automatic rollback)

**Example:**

```typescript
const newChat = await executeInTransaction(async (client) => {
    const chat = await client.query(...);
    await client.query(...);
    return chat.rows[0];
});
```

---

### shutdownPostgres()

Graceful shutdown dari pool.

```typescript
export async function shutdownPostgres(timeoutMs?: number): Promise<void>
```

**Parameters:**

- `timeoutMs`: Timeout untuk shutdown (default: 5000ms)

**Behavior:**

- Waits untuk all clients di-release
- Closes all connections
- Logs shutdown message

**Example:**

```typescript
// Call saat aplikasi shutdown
process.on('SIGINT', async () => {
    await shutdownPostgres();
    process.exit(0);
});
```

---

## 🔄 Connection Pool Lifecycle

```
┌─────────────────────────────────────────┐
│  initPostgres() called                  │
└──────────────┬──────────────────────────┘
               │
    ┌──────────▼──────────┐
    │ Create Pool Instance │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────────────────┐
    │ Try to connect (with retries)   │
    └──────────┬──────────────────────┘
               │
    ┌──────────▼──────────┐
    │ Pool Ready          │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────────────────┐
    │ Serve queries from pool         │
    │ (Reuse connections)             │
    └──────────┬──────────────────────┘
               │
    ┌──────────▼──────────┐
    │ shutdownPostgres()  │
    │ Called              │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────────────────┐
    │ End all connections             │
    │ (Wait for clients to release)   │
    └─────────────────────────────────┘
```

## ⚡ Performance Tips

### 1. Connection Pool Size

```typescript
// Default: 10 connections
// Untuk high traffic: increase
await initPostgres({
    max: 20, // or 30
});
```

**Guideline:**

- Small app: 5-10
- Medium app: 10-20
- Large app: 20-50

### 2. Idle Timeout

```typescript
// Default: 30 seconds
await initPostgres({
    idleTimeoutMillis: 60000, // 1 minute
});
```

**Guideline:**

- Short-lived connections: 30-60 seconds
- Long-running app: 60-300 seconds

### 3. Connection Timeout

```typescript
// Default: 2 seconds
await initPostgres({
    connectionTimeoutMillis: 5000, // 5 seconds
});
```

**Guideline:**

- Local database: 1-2 seconds
- Remote database: 5-10 seconds

### 4. Use Indexes

```sql
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_chat_members_user_id ON chat_members (user_id);
```

### 5. Avoid N+1 Queries

❌ Bad:

```typescript
const users = await query('SELECT * FROM users');
for (const user of users.rows) {
    const chats = await query('SELECT * FROM chats WHERE created_by = $1', [user.id]);
    // N+1 queries!
}
```

✅ Good:

```typescript
const result = await query(`
    SELECT u.*, c.* FROM users u
    LEFT JOIN chats c ON c.created_by = u.id
`);
```

### 6. Use Batch Operations

❌ Bad:

```typescript
for (const userId of userIds) {
    await query('INSERT INTO ... VALUES (...)', [userId]);
}
```

✅ Good:

```typescript
const values = userIds.map((id, i) => `($${i + 1})`).join(',');
await query(
    `INSERT INTO chat_members (user_id) VALUES ${values}`,
    userIds
);
```

## 🧪 Testing

### Mock Database

```typescript
jest.mock('../databases/postgres', () => ({
    query: jest.fn(),
    executeInTransaction: jest.fn(),
}));

import {query} from '../databases/postgres';

describe('UserService', () => {
    it('should fetch user', async () => {
        (query as jest.Mock).mockResolvedValue({
            rows: [{id: '123', name: 'John'}],
            rowCount: 1,
        });

        const result = await someFunction();
        expect(result.name).toBe('John');
    });
});
```

### Integration Test

```typescript
describe('Database Integration', () => {
    beforeAll(async () => {
        await initPostgres();
    });

    afterAll(async () => {
        await shutdownPostgres();
    });

    it('should insert and retrieve user', async () => {
        const result = await query<UserRow>(
            'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
            ['John', 'john@example.com']
        );

        const user = result.rows[0];
        expect(user.name).toBe('John');
    });
});
```

## ❌ Common Errors & Fixes

### Error: "Postgres pool not initialized"

**Cause**: `initPostgres()` belum dipanggil

**Fix**:

```typescript
// src/index.ts
await initPostgres();
```

---

### Error: "Client is not pooled"

**Cause**: Menggunakan connection dari pool setelah shutdown

**Fix**: Ensure server shutdown gracefully

---

### Error: "Connection timeout"

**Cause**: Database tidak respond dalam `connectionTimeoutMillis`

**Fix**:

```typescript
await initPostgres({
    connectionTimeoutMillis: 10000, // Increase timeout
});
// Check database is running
```

---

### Error: "Too many connections"

**Cause**: Pool size melebihi max_connections database

**Fix**:

```typescript
// Decrease pool size
await initPostgres({
    max: 10, // was 20
});

// Or increase database limit (PostgreSQL)
// psql -U postgres -c "ALTER SYSTEM SET max_connections = 200;"
```

---

### Error: "relation does not exist"

**Cause**: Table tidak ada (belum migrate)

**Fix**:

```bash
npm run migrate:up
```

---

## 📚 SQL Parameter Binding

Selalu gunakan parameters untuk prevent SQL injection:

```typescript
// ❌ DANGEROUS - SQL Injection!
const email = req.body.email;
await query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ SAFE - Parameter binding
await query('SELECT * FROM users WHERE email = $1', [email]);
```

**Parameter Syntax:**

```typescript
// Single parameter
await query('SELECT * FROM users WHERE id = $1', [id]);

// Multiple parameters
await query(
    'INSERT INTO users (name, email) VALUES ($1, $2)',
    [name, email]
);

// Array of parameters
const params = [userId, status];
await query('UPDATE users SET status = $2 WHERE id = $1', params);
```

## 🔐 Security Best Practices

1. **Never log sensitive data:**

```typescript
// ❌ BAD
console.log('Query params:', params); // might contain passwords

// ✅ GOOD
console.log('Executing query:', text); // only log query structure
```

2. **Use environment variables:**

```typescript
// ❌ BAD
const password = 'hardcoded_password';

// ✅ GOOD
const password = process.env.PG_PASSWORD;
```

3. **Validate input:**

```typescript
import {z} from 'zod';

const EmailSchema = z.string().email();
const email = EmailSchema.parse(userInput.email); // throws if invalid

await query('SELECT * FROM users WHERE email = $1', [email]);
```

4. **Use transactions untuk consistency:**

```typescript
// Prevents partial updates
await executeInTransaction(async (client) => {
    await client.query('UPDATE ...');
    await client.query('UPDATE ...');
    // Both succeed or both rollback
});
```

## 📖 References

- [pg (node-postgres) Documentation](https://node-postgres.com/)
- [PostgreSQL SQL Commands](https://www.postgresql.org/docs/current/sql-commands.html)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

