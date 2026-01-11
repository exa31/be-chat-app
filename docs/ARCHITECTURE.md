# Project Architecture & Code Organization

Dokumentasi untuk memahami struktur, design patterns, dan best practices dalam project.

## 📐 Project Structure

```
chatApp/BE/
├── src/
│   ├── config/                 # Configuration management
│   ├── databases/              # Database connections & migrations
│   ├── errors/                 # Custom error classes
│   ├── lib/                    # External libraries integrations
│   ├── middleware/             # Express middlewares
│   ├── modules/                # Feature modules (domain-driven)
│   ├── scripts/                # Utility scripts
│   ├── utils/                  # Utility functions & helpers
│   └── index.ts               # Application entry point
├── migrations/                 # Database migration files
├── docs/                       # Documentation
└── node_modules/              # Dependencies
```

## 🏗️ Architecture Layers

### 1. **Controller/Route Layer** (`modules/*/route`)

Entry point for HTTP requests. Validates input and orchestrates services.

```typescript
// modules/user/userRoute.ts
router.post('/register', asyncHandler(async (req, res) => {
    const validated = RegisterSchema.parse(req.body);
    const result = await userService.register(validated);
    res.status(201).json(createResponse(result, 'User registered'));
}));
```

**Responsibilities**:

- Route definition
- Input validation
- Response formatting
- Error handling (via asyncHandler)

---

### 2. **Service Layer** (`modules/*/Service`)

Business logic and data orchestration.

```typescript
// modules/user/userService.ts
export async function register(input: RegisterInput): Promise<UserRow & { access_token: string }> {
    // 1. Validate input
    // 2. Hash password
    // 3. Create user via repository
    // 4. Generate tokens
    // 5. Return formatted response
}
```

**Responsibilities**:

- Business logic
- Data validation & transformation
- Service orchestration
- Transaction management
- Error handling

---

### 3. **Repository Layer** (`modules/*/Repository`)

Data access and database operations.

```typescript
// modules/user/userRepository.ts
export async function createUser(
    client: PoolClient,
    user: { name: string; email: string; password: string; avatar?: string }
): Promise<UserRow> {
    const result = await client.query<UserRow>(
        `INSERT INTO users (name, email, password, avatar) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [user.name, user.email, user.password, user.avatar]
    );
    return result.rows[0];
}
```

**Responsibilities**:

- SQL queries
- Data formatting
- ORM/database abstraction
- Query parameter handling

---

### 4. **Model/Schema Layer** (`modules/*/Model`)

Type definitions dan validation schemas (Zod).

```typescript
// modules/user/userModel.ts
export const RegisterSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
```

**Responsibilities**:

- Type definitions
- Validation schemas
- Request/Response types
- Database row types

---

## 🔄 Data Flow

```
HTTP Request
    ↓
Route Handler (Controller)
    ↓
Input Validation (Zod Schema)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Database)
    ↓
Response Formatting
    ↓
HTTP Response
```

**Example: User Registration**

```typescript
// 1. Route receives request
POST / api / users / register
{
    "name"
:
    "John", "email"
:
    "john@example.com", "password"
:
    "pass123"
}

// 2. Validate with schema
RegisterSchema.parse(req.body) // throws if invalid

// 3. Call service
userService.register(validated)

// 4. Service orchestrates operations
// - Hash password
// - Call repository.createUser()
// - Generate tokens
// - Store refresh token

// 5. Repository executes query
INSERT
INTO
users(...)
VALUES(...)

// 6. Return formatted response
{
    success: true,
        data
:
    {
        id, name, email, access_token, refresh_token
    }
,
    message: "User registered successfully"
}
```

---

## 📦 Module Structure

Setiap feature module memiliki struktur standard:

```
modules/user/
├── userModel.ts          # Types & schemas
├── userRepository.ts     # Database access
├── userService.ts        # Business logic
└── userRoute.ts         # HTTP endpoints
```

### Module Files Explanation

#### Model (`userModel.ts`)

```typescript
// Input validation schema
export const RegisterSchema = z.object({...});
export type RegisterInput = z.infer<typeof RegisterSchema>;

// Database row type
export const UserRowSchema = z.object({...});
export type UserRow = z.infer<typeof UserRowSchema>;

// Response type
export type UserResponse = Omit<UserRow, 'password'>;
```

---

#### Repository (`userRepository.ts`)

```typescript
// Low-level database operations
export async function createUser(
    client: PoolClient,
    user: CreateUserInput
): Promise<UserRow> {
    // Direct SQL query with parameters
}

export async function findByEmail(email: string): Promise<UserRow | null> {
    // Query to find user
}

export async function update(
    client: PoolClient,
    id: string,
    data: Partial<UserRow>
): Promise<UserRow> {
    // Update query
}
```

**Key Points**:

- Takes `PoolClient` untuk transactions
- Returns typed data
- Parameter binding untuk SQL safety
- Error thrown dari database (caught by service)

---

#### Service (`userService.ts`)

```typescript
export async function register(input: RegisterInput) {
    return executeInTransaction(async (client) => {
        // 1. Validate
        if (await findByEmail(input.email)) {
            throw new HttpError(409, 'email_already_exists');
        }

        // 2. Hash password
        const hashedPassword = await hashPassword(input.password);

        // 3. Create user via repository
        const user = await userRepository.createUser(client, {
            name: input.name,
            email: input.email,
            password: hashedPassword,
        });

        // 4. Generate tokens
        const {token: accessToken} = signAccessToken({...});
        const {token: refreshToken, expiresAt} =
            await createRefreshToken(user.id, client);

        // 5. Return response
        return {
            ...user,
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    });
}
```

**Key Points**:

- Uses `executeInTransaction` untuk atomic operations
- Business logic & validation
- Calls repositories untuk data access
- Transforms data untuk response
- Throws `HttpError` untuk errors

---

#### Route (`userRoute.ts`)

```typescript
const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
    // 1. Validate input
    const input = RegisterSchema.parse(req.body);

    // 2. Call service
    const result = await userService.register(input);

    // 3. Send response
    res.status(201).json(
        createResponse(result, 'User registered successfully')
    );
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
        throw new HttpError(404, 'User not found');
    }
    res.json(createResponse(user));
}));

export default router;
```

**Key Points**:

- Wraps handler dengan `asyncHandler` untuk error handling
- Validates dengan Zod schema
- Calls service layer
- Uses `createResponse()` utility
- Throws `HttpError` untuk HTTP errors

---

## 🔐 Error Handling

### Custom Error Class

```typescript
// errors/HttpError.ts
export class HttpError extends Error {
    constructor(
        public statusCode: number,
        message: string
    ) {
        super(message);
        this.name = 'HttpError';
    }
}
```

### asyncHandler Middleware

```typescript
// middleware/asyncHandler.ts
export const asyncHandler = (fn: RequestHandler) => (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
```

Automatically catches errors dan pass ke error handler.

### Global Error Handler

```typescript
// middleware/errorHandler.ts
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof HttpError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            data: null,
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            data: null,
        });
    }
};
```

### Usage in Services

```typescript
if (!user) {
    throw new HttpError(404, 'User not found');
}

if (await existsEmail(email)) {
    throw new HttpError(409, 'Email already registered');
}

if (await checkChatExists(user1Id, user2Id)) {
    throw new HttpError(409, 'Chat already exists');
}
```

---

## 💾 Transaction Management

### Database Transactions

Semua database operations yang multi-step menggunakan transaction:

```typescript
import {executeInTransaction} from '../databases/postgres';

export async function register(input: RegisterInput) {
    return executeInTransaction(async (client) => {
        // Multiple operations dalam transaction
        const user = await userRepository.createUser(client, {...});
        const token = await refreshTokenRepository.save(client, {...});

        // Jika ada error, automatic ROLLBACK
        // Jika sukses, automatic COMMIT
        return {user, token};
    });
}
```

### Manual Transaction

```typescript
import {getClient} from '../databases/postgres';

const client = await getClient();
try {
    await client.query('BEGIN');

    // Operation 1
    await client.query('INSERT ...');

    // Operation 2
    const result = await client.query('SELECT ...');

    await client.query('COMMIT');
    return result.rows;
} catch (err) {
    await client.query('ROLLBACK');
    throw err;
} finally {
    client.release();
}
```

---

## 🔄 Middleware Pipeline

Request flow melalui middlewares:

```
Incoming Request
    ↓
CORS middleware
    ↓
Express JSON parser
    ↓
Cookie parser
    ↓
Request logger (logRequest)
    ↓
Route Handler
├─ Auth middleware (jika needed)
├─ Input validation
├─ Service logic
    ↓
Error handler (jika error)
    ↓
Response
```

### Custom Middleware Example

```typescript
// middleware/auth.ts
export const authenticate = asyncHandler(async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        throw new HttpError(401, 'Token required');
    }

    try {
        const payload = verifyAccessToken(token);
        (req as any).user = payload;
        next();
    } catch (err) {
        throw new HttpError(401, 'Invalid token');
    }
});

// Usage in routes
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
    const userId = (req as any).user.id;
    const user = await userService.getUserById(userId);
    res.json(createResponse(user));
}));
```

---

## 📝 Response Format Standard

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Payload
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "data": null,
  "timestamp": "2026-01-12T10:00:00Z"
}
```

### Helper Function

```typescript
// utils/response.ts
export function createResponse<T>(
    data: T,
    message: string = 'Success',
    success: boolean = true
) {
    return {
        success,
        message,
        data,
        timestamp: new Date().toISOString(),
    };
}

// Usage
res.json(createResponse(user, 'User found'));
res.status(201).json(createResponse(newUser, 'User created'));
res.status(400).json(createResponse(null, 'Validation failed', false));
```

---

## 🧪 Testing Strategy

### Unit Tests (Service Layer)

```typescript
describe('UserService', () => {
    it('should register user successfully', async () => {
        const input: RegisterInput = {
            name: 'John',
            email: 'john@example.com',
            password: 'pass123'
        };

        const result = await userService.register(input);

        expect(result.email).toBe('john@example.com');
        expect(result.access_token).toBeDefined();
    });

    it('should throw if email exists', async () => {
        await expect(
            userService.register({...})
        ).rejects.toThrow('email_already_exists');
    });
});
```

### Integration Tests (API Routes)

```typescript
describe('POST /api/users/register', () => {
    it('should return 201 with user data', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({
                name: 'John',
                email: 'john@example.com',
                password: 'pass123'
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
    });
});
```

---

## 🔌 Database Connection Pool

### Initialization

```typescript
// src/index.ts
await initPostgres({
    // Optional: override defaults
    host: 'localhost',
    port: 5432,
}, {
    retries: 5,           // Retry attempts
    initialDelayMs: 200,  // Initial retry delay
    factor: 2,           // Exponential backoff factor
});
```

### Pool Configuration

```typescript
// src/databases/postgres.ts
const poolConfig = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'chatapp',
    max: 10,                        // Max connections
    idleTimeoutMillis: 30000,      // Idle timeout
    connectionTimeoutMillis: 2000, // Connection timeout
};
```

### Connection Lifecycle

```
Client connects
    ↓
Query executed
    ↓
Client returns to pool (idle)
    ↓
Wait for timeout or reuse
    ↓
Client released (connection closed)
```

---

## 🔐 Dependency Injection Pattern

Project tidak menggunakan external DI framework. Menggunakan:

### Module Pattern

```typescript
// modules/user/index.ts
export * as userService from './userService';
export * as userRepository from './userRepository';

// Usage
import {userService} from './modules/user';

const user = await userService.register(input);
```

### Factory Pattern (untuk databases)

```typescript
// databases/postgres.ts
let pool: Pool | null = null;

export async function initPostgres() {
    pool = new Pool(buildPoolConfig());
}

export async function query<T>(...) {
    if (!pool) throw new Error('Not initialized');
    return pool.query<T>(...);
}
```

---

## 📚 Best Practices Implemented

1. **Single Responsibility**: Setiap file/function memiliki satu tanggung jawab
2. **Separation of Concerns**: Route → Service → Repository layers
3. **Type Safety**: Gunakan TypeScript dan Zod untuk validation
4. **Error Handling**: Custom error class + global handler
5. **Transaction Safety**: Automatic rollback pada error
6. **Connection Pooling**: Reuse database connections
7. **Async/Await**: Modern async pattern
8. **Input Validation**: Zod schemas di setiap input
9. **Response Consistency**: Standard response format
10. **Code Organization**: Feature-based module structure

---

## 🚀 Scaling Considerations

### For Future Scaling:

1. **Caching Layer**: Redis untuk frequently accessed data
2. **Message Queue**: RabbitMQ untuk async operations
3. **Logging**: Winston untuk structured logging
4. **Metrics**: Prometheus/Grafana untuk monitoring
5. **Load Balancing**: Multiple instances behind load balancer
6. **Database Replication**: Master-slave setup
7. **Microservices**: Split into separate services per domain
8. **API Gateway**: Kong/Nginx for routing

Currently implemented:

- ✅ Redis connection
- ✅ RabbitMQ connection
- ✅ Winston logging
- ✅ Connection pooling
- ✅ Transaction support

---

## 📖 References

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

