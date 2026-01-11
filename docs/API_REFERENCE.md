# API Reference & Routes

Dokumentasi lengkap untuk semua endpoints dan routes di Chat App Backend.

## Base URL

```
http://localhost:3003/api
```

## Response Format

Semua API responses mengikuti format standard:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response payload
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

## Authentication

### Header-based (API calls)

```http
Authorization: Bearer <access_token>
```

### Cookie-based (Refresh token)

```
Cookie: refreshToken=<refresh_token>
```

## User Endpoints

### Register User

**Endpoint**: `POST /users/register`

**No Authentication Required**

**Request**:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123",
  "avatar": "https://example.com/avatar.jpg"
  (optional)
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "status": "offline",
    "created_at": "2026-01-12T10:00:00Z",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Errors**:

- `400 Bad Request`: Validation error
- `409 Conflict`: Email already exists

---

### Login User

**Endpoint**: `POST /users/login`

**No Authentication Required**

**Request**:

```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "status": "online",
    "last_seen": "2026-01-12T10:00:00Z",
    "created_at": "2026-01-12T09:50:00Z",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Errors**:

- `401 Unauthorized`: Invalid email or password
- `404 Not Found`: User not found

---

### Refresh Token

**Endpoint**: `POST /users/refresh-token`

**No Authentication Required** (uses cookie)

**Request**: (empty body)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    // if rotated
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Errors**:

- `401 Unauthorized`: Refresh token expired
- `403 Forbidden`: Refresh token not found

---

### Logout

**Endpoint**: `POST /users/logout`

**Authentication**: ✅ Required

**Request**: (empty body)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null,
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Errors**:

- `401 Unauthorized`: Invalid token

---

### Get User Profile

**Endpoint**: `GET /users/:id`

**Authentication**: ✅ Required

**URL Parameters**:

- `id` (UUID): User ID

**Response** (200 OK):

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "status": "online",
    "last_seen": "2026-01-12T10:00:00Z",
    "created_at": "2026-01-12T09:50:00Z"
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Errors**:

- `401 Unauthorized`: Invalid token
- `404 Not Found`: User not found

---

### Update User Profile

**Endpoint**: `PUT /users/:id`

**Authentication**: ✅ Required

**URL Parameters**:

- `id` (UUID): User ID (must be current user)

**Request**:

```json
{
  "name": "Jane Doe",
  "avatar": "https://example.com/new-avatar.jpg",
  "status": "away"
}
```

All fields are optional.

**Response** (200 OK):

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Jane Doe",
    "email": "john@example.com",
    "avatar": "https://example.com/new-avatar.jpg",
    "status": "away",
    "last_seen": "2026-01-12T10:05:00Z",
    "created_at": "2026-01-12T09:50:00Z"
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Errors**:

- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Cannot update other users
- `404 Not Found`: User not found

---

### List All Users

**Endpoint**: `GET /users`

**Authentication**: ✅ Required

**Query Parameters**:

- `limit` (number, default: 20): Items per page
- `offset` (number, default: 0): Pagination offset
- `search` (string, optional): Search by name or email

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "https://example.com/avatar.jpg",
        "status": "online",
        "last_seen": "2026-01-12T10:00:00Z",
        "created_at": "2026-01-12T09:50:00Z"
      }
    ],
    "total": 50,
    "limit": 20,
    "offset": 0
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

### Search Users

**Endpoint**: `GET /users/search`

**Authentication**: ✅ Required

**Query Parameters**:

- `q` (string, required): Search query
- `limit` (number, default: 10): Max results

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Search completed",
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com",
        "status": "online"
      }
    ]
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

## Chat Endpoints

### Create Chat

**Endpoint**: `POST /chats`

**Authentication**: ✅ Required

**Request**:

```json
{
  "type": "private",
  "title": "My Chat Group"
  (optional,
  required
  for
  group),
  "member_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ]
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "message": "Chat created successfully",
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "type": "private",
    "title": null,
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-01-12T10:00:00Z"
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Errors**:

- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid token
- `409 Conflict`: Chat already exists

---

### List User's Chats

**Endpoint**: `GET /chats`

**Authentication**: ✅ Required

**Query Parameters**:

- `limit` (number, default: 20): Items per page
- `offset` (number, default: 0): Pagination offset

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Chats retrieved successfully",
  "data": {
    "chats": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "type": "private",
        "title": null,
        "created_by": "550e8400-e29b-41d4-a716-446655440000",
        "created_at": "2026-01-12T10:00:00Z",
        "members": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "user_id": "550e8400-e29b-41d4-a716-446655440000",
            "role": "admin",
            "joined_at": "2026-01-12T10:00:00Z"
          }
        ]
      }
    ],
    "total": 10
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

### Get Chat Details

**Endpoint**: `GET /chats/:id`

**Authentication**: ✅ Required

**URL Parameters**:

- `id` (UUID): Chat ID

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Chat retrieved successfully",
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "type": "private",
    "title": null,
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-01-12T10:00:00Z",
    "members": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "role": "admin",
        "joined_at": "2026-01-12T10:00:00Z",
        "last_read_message_id": null
      }
    ]
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

### Update Chat

**Endpoint**: `PUT /chats/:id`

**Authentication**: ✅ Required

**URL Parameters**:

- `id` (UUID): Chat ID

**Request**:

```json
{
  "title": "Updated Chat Title"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Chat updated successfully",
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "type": "private",
    "title": "Updated Chat Title",
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-01-12T10:00:00Z"
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

### Delete Chat

**Endpoint**: `DELETE /chats/:id`

**Authentication**: ✅ Required

**URL Parameters**:

- `id` (UUID): Chat ID

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Chat deleted successfully",
  "data": null,
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

### Add Member to Chat

**Endpoint**: `POST /chats/:id/members`

**Authentication**: ✅ Required

**URL Parameters**:

- `id` (UUID): Chat ID

**Request**:

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "message": "Member added successfully",
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "chat_id": "770e8400-e29b-41d4-a716-446655440002",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "role": "member",
    "joined_at": "2026-01-12T10:05:00Z"
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

### Remove Member from Chat

**Endpoint**: `DELETE /chats/:id/members/:userId`

**Authentication**: ✅ Required

**URL Parameters**:

- `id` (UUID): Chat ID
- `userId` (UUID): User ID to remove

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Member removed successfully",
  "data": null,
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

## Chat Request Endpoints

### Send Chat Request

**Endpoint**: `POST /chat-requests`

**Authentication**: ✅ Required

**Request**:

```json
{
  "receiver_email": "john@example.com"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "message": "Chat request sent successfully",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "sender_id": "550e8400-e29b-41d4-a716-446655440000",
    "receiver_id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "pending",
    "created_at": "2026-01-12T10:00:00Z"
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Errors**:

- `400 Bad Request`: Invalid receiver email
- `409 Conflict`: Chat already exists or request already sent
- `429 Too Many Requests`: Too many requests from same user

---

### List Chat Requests

**Endpoint**: `GET /chat-requests`

**Authentication**: ✅ Required

**Query Parameters**:

- `status` (string, optional): Filter by status (pending, accepted, rejected)
- `limit` (number, default: 20): Items per page
- `offset` (number, default: 0): Pagination offset

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Chat requests retrieved successfully",
  "data": {
    "requests": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "sender": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "John Doe",
          "email": "john@example.com",
          "avatar": "https://example.com/avatar.jpg"
        },
        "receiver": {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": "https://example.com/avatar.jpg"
        },
        "status": "pending",
        "created_at": "2026-01-12T10:00:00Z"
      }
    ],
    "total": 5
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

### Accept Chat Request

**Endpoint**: `PUT /chat-requests/:id/accept`

**Authentication**: ✅ Required

**URL Parameters**:

- `id` (UUID): Chat Request ID

**Request**: (empty body)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Chat request accepted",
  "data": {
    "chatId": "770e8400-e29b-41d4-a716-446655440002",
    "request": {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "status": "accepted",
      "responded_at": "2026-01-12T10:05:00Z"
    }
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

### Reject Chat Request

**Endpoint**: `PUT /chat-requests/:id/reject`

**Authentication**: ✅ Required

**URL Parameters**:

- `id` (UUID): Chat Request ID

**Request** (optional):

```json
{
  "reason": "Not interested"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Chat request rejected",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "status": "rejected",
    "responded_at": "2026-01-12T10:05:00Z",
    "rejected_reason": "Not interested"
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

---

## Health Check

**Endpoint**: `GET /health`

**No Authentication Required**

**Response** (200 OK):

```
OK
```

---

## Error Codes

| Code | Description                                   |
|------|-----------------------------------------------|
| 200  | OK - Request successful                       |
| 201  | Created - Resource created successfully       |
| 400  | Bad Request - Invalid input                   |
| 401  | Unauthorized - Invalid/missing authentication |
| 403  | Forbidden - Access denied                     |
| 404  | Not Found - Resource not found                |
| 409  | Conflict - Resource already exists            |
| 429  | Too Many Requests - Rate limit exceeded       |
| 500  | Internal Server Error - Server error          |

---

## Rate Limiting

Coming soon...

---

## Pagination

For endpoints that support pagination:

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

**Query Parameters**:

- `limit`: Items per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

**Calculation**:

- Page 1: `offset=0, limit=20`
- Page 2: `offset=20, limit=20`
- Page 3: `offset=40, limit=20`

---

## Testing Endpoints

### Using cURL

```bash
# Register
curl -X POST http://localhost:3003/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepass123"
  }'

# Login
curl -X POST http://localhost:3003/api/users/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'

# Get profile (with token)
curl -X GET http://localhost:3003/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <access_token>"

# Refresh token (with cookie)
curl -X POST http://localhost:3003/api/users/refresh-token \
  -b cookies.txt
```

### Using Postman

1. Create new collection "Chat App"
2. Create environment with variables:
    - `base_url`: `http://localhost:3003/api`
    - `access_token`: (auto-filled from response)
    - `user_id`: (auto-filled from response)

3. Create requests with pre-request scripts:

```javascript
// Auto-fill access token from previous response
if (pm.response.code === 200 || pm.response.code === 201) {
    const json = pm.response.json();
    if (json.data.access_token) {
        pm.environment.set('access_token', json.data.access_token);
    }
}
```

---

## WebSocket Integration

Chat messages are sent via WebSocket. See [WEBSOCKET_USAGE.md](./WEBSOCKET_USAGE.md) for details.

---

## References

- [REST API Best Practices](https://restfulapi.net/)
- [HTTP Status Codes](https://httpwg.org/specs/rfc7231.html#status.codes)

