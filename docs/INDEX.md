# Chat App Backend - Documentation Index

Selamat datang di dokumentasi Chat App Backend! Berikut adalah panduan lengkap untuk setup, development, dan deployment.

## 📚 Documentation Structure

### Getting Started

1. **[Main README](./README.md)** 📖
    - Overview project
    - Quick start guide
    - Installation & setup
    - Basic configuration
    - API overview
    - **START HERE jika baru pertama kali**

2. **[Database Setup Guide](./docs/DATABASE_SETUP.md)** 🗄️
    - PostgreSQL installation & setup
    - Redis installation & setup
    - Migrations
    - Connection pooling
    - Troubleshooting database issues

### Core Libraries & Systems

3. **[PostgreSQL Library](./docs/POSTGRES_LIBRARY.md)** 🐘
    - Connection pooling
    - Query execution (type-safe)
    - Transactions with automatic rollback
    - Performance optimization
    - Common patterns & examples

4. **[Redis Library](./docs/REDIS_LIBRARY.md)** 🔴
    - Redis client setup
    - String operations
    - JSON operations
    - Key expiry management
    - Use cases & patterns
    - Performance tips

5. **[MinIO Library](./docs/MINIO_LIBRARY.md)** 🗄️
    - Object storage setup
    - File upload & download
    - Bucket management
    - Presigned URLs
    - Stream handling
    - Image processing patterns

6. **[WebSocket Library](./docs/WEBSOCKET_LIBRARY.md)** 🔌
    - Socket.IO setup
    - Event handling (type-safe)
    - Authentication
    - Room management
    - Broadcasting
    - Complete examples

### Backend Features & Architecture

6. **[Authentication & JWT](./docs/AUTHENTICATION.md)** 🔐
    - JWT token flow
    - Password hashing (SHA256 + Bcrypt)
    - Token refresh mechanism
    - API endpoints
    - Client implementation
    - Security best practices

7. **[API Reference](./docs/API_REFERENCE.md)** 📡
    - Complete endpoint documentation
    - Request/Response examples
    - Error codes
    - Pagination
    - Testing endpoints with cURL/Postman

8. **[Project Architecture](./docs/ARCHITECTURE.md)** 🏗️
    - Layered architecture (Controller → Service → Repository)
    - Module structure
    - Design patterns
    - Error handling
    - Testing strategy
    - Scaling considerations

### Additional Documentation

9. **[WebSocket Usage](./docs/WEBSOCKET_USAGE.md)** 🎯
    - Client setup
    - Event examples
    - Real-time features

10. **[Redis Usage](./docs/REDIS_USAGE.md)** (old)
    - Basic operations
    - Advanced examples

11. **[RabbitMQ Usage](./docs/RABBITMQ_USAGE.md)** 🐰
    - Message queue setup
    - Publishing & subscribing
    - Background jobs

12. **[WebSocket Client](./docs/WEBSOCKET_CLIENT.md)** 💻
    - Browser implementation
    - React hooks
    - TypeScript types

## 🎯 Quick Navigation by Task

### I want to...

#### Setup & Installation

1. [Install project](./README.md#-instalasi--setup)
2. [Setup databases](./docs/DATABASE_SETUP.md)
3. [Configure environment](./README.md#konfigurasi-environment)
4. [Run migrations](./docs/DATABASE_SETUP.md#running-migrations)
5. [Start development server](./README.md#running-the-server)

#### Learn the Architecture

1. [Understand project structure](./docs/ARCHITECTURE.md#-project-structure)
2. [Learn data flow](./docs/ARCHITECTURE.md#-data-flow)
3. [Understand module structure](./docs/ARCHITECTURE.md#-module-structure)
4. [Learn error handling](./docs/ARCHITECTURE.md#-error-handling)

#### Build a New Feature

1. [Create model/schema](./docs/ARCHITECTURE.md#model-usermodelets) (with Zod)
2. [Create repository](./docs/ARCHITECTURE.md#repository-userrepositoryts) (database layer)
3. [Create service](./docs/ARCHITECTURE.md#service-userservicets) (business logic)
4. [Create route](./docs/ARCHITECTURE.md#route-userroutets) (HTTP endpoint)
5. [Add database migration](./docs/DATABASE_SETUP.md#running-migrations)

#### Work with Databases

#### Work with Databases

- **PostgreSQL**: [POSTGRES_LIBRARY.md](./docs/POSTGRES_LIBRARY.md)
    - [Simple queries](./docs/POSTGRES_LIBRARY.md#simple-query)
    - [Transactions](./docs/POSTGRES_LIBRARY.md#-transactions)
    - [Connection pooling](./docs/POSTGRES_LIBRARY.md#-connection-pool-lifecycle)

- **Redis**: [REDIS_LIBRARY.md](./docs/REDIS_LIBRARY.md)
    - [String operations](./docs/REDIS_LIBRARY.md#string-operations)
    - [JSON operations](./docs/REDIS_LIBRARY.md#json-operations)
    - [Use cases](./docs/REDIS_LIBRARY.md#-use-cases)

- **MinIO**: [MINIO_LIBRARY.md](./docs/MINIO_LIBRARY.md)
    - [File upload](./docs/MINIO_LIBRARY.md#file-upload)
    - [File download](./docs/MINIO_LIBRARY.md#file-download)
    - [Presigned URLs](./docs/MINIO_LIBRARY.md#presigned-urls)

#### Implement Real-time Features

1. [Setup WebSocket](./docs/WEBSOCKET_LIBRARY.md#-initialization)
2. [Register event handlers](./docs/WEBSOCKET_LIBRARY.md#event-handler-registration)
3. [Use rooms for targeting](./docs/WEBSOCKET_LIBRARY.md#room-management)
4. [Implement on client](./docs/WEBSOCKET_CLIENT.md)

#### Implement Authentication

1. [Understand JWT flow](./docs/AUTHENTICATION.md#jwt-token-structure)
2. [Register endpoint](./docs/API_REFERENCE.md#register-user)
3. [Login endpoint](./docs/API_REFERENCE.md#login-user)
4. [Refresh tokens](./docs/API_REFERENCE.md#refresh-token)
5. [Client implementation](./docs/AUTHENTICATION.md#client-implementation)

#### Test & Debug

1. [API testing with cURL](./docs/API_REFERENCE.md#using-curl)
2. [API testing with Postman](./docs/API_REFERENCE.md#using-postman)
3. [Database debugging](./docs/DATABASE_SETUP.md#troubleshooting)
4. [WebSocket debugging](./docs/WEBSOCKET_LIBRARY.md#troubleshooting)

#### Deploy to Production

- TBD (coming soon)

## 📊 Technology Stack

### Backend Framework

- **Express.js** - HTTP server
- **TypeScript** - Type safety
- **Zod** - Data validation

### Databases

- **PostgreSQL** - Primary database (relational)
- **Redis** - Caching & sessions
- **RabbitMQ** - Message queue

### Real-time Communication

- **Socket.IO** - WebSocket library
- **Node.js Events** - Internal event handling

### Authentication & Security

- **JWT** - Token-based authentication
- **Bcryptjs** - Password hashing
- **cookie-parser** - Cookie handling

### Utilities

- **Winston** - Logging
- **date-fns** - Date manipulation
- **nodemailer** - Email sending (optional)

## 🏛️ API Overview

### Main Routes

```
POST   /api/users/register          - Register user
POST   /api/users/login             - Login user
POST   /api/users/refresh-token     - Refresh access token
POST   /api/users/logout            - Logout user
GET    /api/users                   - List users
GET    /api/users/:id               - Get user profile
PUT    /api/users/:id               - Update user profile
GET    /api/users/search            - Search users

POST   /api/chats                   - Create chat
GET    /api/chats                   - List user's chats
GET    /api/chats/:id               - Get chat details
PUT    /api/chats/:id               - Update chat
DELETE /api/chats/:id               - Delete chat
POST   /api/chats/:id/members       - Add member
DELETE /api/chats/:id/members/:userId - Remove member

POST   /api/chat-requests           - Send chat request
GET    /api/chat-requests           - List requests
PUT    /api/chat-requests/:id/accept - Accept request
PUT    /api/chat-requests/:id/reject - Reject request

GET    /api/health                  - Health check
```

**WebSocket Events**

```
chat:join                           - Join chat room
chat:send_message                   - Send message
chat:typing                         - User typing indicator
user:online / user:offline          - User status
message:new                         - New message received
user:joined / user:left             - User joined/left chat
```

## 🗃️ Database Schema Overview

### Core Tables

- **users** - User accounts
- **chats** - Chat rooms/conversations
- **chat_members** - Chat membership
- **chat_requests** - Friend requests
- **refresh_tokens** - JWT refresh tokens

### Enums

- **user_status** - online, offline, away
- **chat_type** - private, group
- **member_role** - admin, member
- **message_type** - text, image, file
- **chat_request_status** - pending, accepted, rejected, blocked

## 🔐 Security Features

✅ **Implemented**

- JWT token-based authentication
- HTTP-only cookies untuk refresh tokens
- Password hashing (SHA256 + Bcrypt)
- CORS protection
- SQL injection prevention (parameterized queries)
- Connection pooling & connection limits
- Transaction support dengan automatic rollback

⚠️ **To Implement**

- Rate limiting
- Request validation middleware
- HTTPS/TLS
- Redis authentication (production)
- Database encryption
- API key rotation
- Audit logging

## 📈 Performance Considerations

### Connection Pooling

- PostgreSQL: max 10 connections (configurable)
- Redis: single connection with reconnect
- RabbitMQ: connection pooling

### Caching Strategy

- User profiles → Redis (1 hour)
- Chat metadata → Redis (5 minutes)
- Session tokens → Redis (30 days for refresh)

### Database Optimization

- Indexes on frequently queried columns
- Connection reuse via pooling
- Transaction batching untuk operations
- Query optimization dengan EXPLAIN ANALYZE

### Scaling Path

1. Add read replicas untuk PostgreSQL
2. Increase Redis for distributed caching
3. Split into microservices per domain
4. Add load balancer
5. Implement API gateway
6. Add CDN untuk static assets

## 🔄 Development Workflow

### Creating New Endpoint

```
1. Create Model (userModel.ts)
   └─ Define schema dengan Zod
   
2. Create Repository (userRepository.ts)
   └─ Database queries with PoolClient
   
3. Create Service (userService.ts)
   └─ Business logic & transactions
   
4. Create Route (userRoute.ts)
   └─ HTTP handlers & validation
   
5. Add Tests (userService.test.ts)
   └─ Unit & integration tests
   
6. Document (API_REFERENCE.md)
   └─ Update API docs
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/chat-messages

# Make changes
npm run dev

# Format & lint
npm run format
npm run lint

# Test
npm test

# Commit
git add .
git commit -m "feat: add chat messages"

# Push & create PR
git push origin feature/chat-messages
```

## 📞 Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript
npm start               # Run production build

# Database
npm run migrate:up      # Apply migrations
npm run migrate:down    # Rollback migration
npm run migrate:create  # Create new migration
npm run db:check        # Check PostgreSQL connection

# Testing
npm test                # Run tests
npm test -- --watch     # Watch mode

# Linting
npm run lint            # Run ESLint
npm run format          # Format code
```

## 🆘 Troubleshooting

### Connection Issues

- [PostgreSQL Connection](./docs/DATABASE_SETUP.md#troubleshooting)
- [Redis Connection](./docs/REDIS_LIBRARY.md#-common-errors--fixes)
- [WebSocket Connection](./docs/WEBSOCKET_LIBRARY.md#troubleshooting)

### Database Issues

- [Migration Errors](./docs/DATABASE_SETUP.md#troubleshooting)
- [Query Errors](./docs/POSTGRES_LIBRARY.md#-common-errors--fixes)

### Authentication Issues

- [Token Errors](./docs/AUTHENTICATION.md#troubleshooting)
- [CORS Issues](./README.md#cors-protection)

## 📖 Learning Resources

### TypeScript

- [Official Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Express.js

- [Official Guide](https://expressjs.com/en/guide/routing.html)
- [Middleware Pattern](https://expressjs.com/en/guide/using-middleware.html)

### Socket.IO

- [Documentation](https://socket.io/docs/)
- [Real-time Patterns](https://socket.io/docs/v4/rooms/)

### PostgreSQL

- [SQL Guide](https://www.postgresql.org/docs/current/sql.html)
- [Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)

### Redis

- [Commands](https://redis.io/commands/)
- [Data Types](https://redis.io/topics/data-types)

## 🚀 Getting Help

### Debug Mode

```bash
DEBUG=* npm run dev    # Enable verbose logging
```

### Check Logs

```bash
# Recent logs
tail -f logs/error.log

# Search logs
grep "ERROR" logs/error.log
```

### Community

- GitHub Issues
- Stack Overflow
- Redis Community
- Socket.IO Discussions

## 📝 Contributing

1. Read [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
2. Follow the code patterns
3. Write tests for new features
4. Update documentation
5. Ensure linting passes
6. Create pull request

## 📄 License

MIT

## 🎉 That's It!

Anda sekarang siap untuk:

- ✅ Setup development environment
- ✅ Understand project architecture
- ✅ Build new features
- ✅ Deploy to production
- ✅ Debug issues

**Happy coding! 🚀**

---

## Documentation Maintenance

Last Updated: January 12, 2026

Keep docs updated when:

- Adding new endpoints
- Changing database schema
- Adding new libraries
- Updating dependencies
- Fixing bugs

Update checklist:

- [ ] API_REFERENCE.md
- [ ] ARCHITECTURE.md
- [ ] README.md
- [ ] Library docs (if applicable)

