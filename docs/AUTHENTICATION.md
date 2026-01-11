# Authentication & JWT

Dokumentasi lengkap untuk sistem authentication dan JWT token management.

## Overview

Project menggunakan JWT-based authentication dengan:

- **Access Token**: Short-lived (15 menit), untuk API requests
- **Refresh Token**: Long-lived (30 hari), untuk mendapatkan access token baru
- **Password Hashing**: SHA256 + Bcrypt (10 rounds)
- **HTTP-only Cookies**: Secure refresh token storage

## Password Security

### Hashing Flow

```
Raw Password
    ↓
SHA256 Hash (untuk pre-hashing)
    ↓
Bcrypt Hash (10 rounds) → Disimpan di Database
```

### Why Two-Step Hashing?

1. **SHA256**: Fast pre-hashing untuk password normalization
2. **Bcrypt**: Slow hashing dengan salt untuk security

Kombinasi ini memberikan:

- Strong password security
- Protection against rainbow tables
- Protection against brute force attacks
- Compliance dengan security best practices

### Code Example

```typescript
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

async function hashPassword(rawPassword: string): Promise<string> {
    // Step 1: SHA256
    const sha256Hash = crypto
        .createHash('sha256')
        .update(rawPassword)
        .digest('hex');
    
    // Step 2: Bcrypt
    const bcryptHash = await bcrypt.hash(sha256Hash, 10);
    
    return bcryptHash;
}

async function verifyPassword(rawPassword: string, hashedPassword: string): Promise<boolean> {
    // Step 1: SHA256
    const sha256Hash = crypto
        .createHash('sha256')
        .update(rawPassword)
        .digest('hex');
    
    // Step 2: Compare with bcrypt
    return bcrypt.compare(sha256Hash, hashedPassword);
}
```

## JWT Token Structure

### Access Token

**Type**: `access`
**Expires**: 15 menit
**Payload**:

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234568790,
  "typ": "access"
}
```

**Usage**:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh Token

**Type**: `refresh`
**Expires**: 30 hari (configurable)
**Payload**:

```json
{
  "sub": "user-uuid",
  "typ": "refresh",
  "jti": "unique-token-id",
  "iat": 1234567890,
  "exp": 1234567890 + (30 * 24 * 60 * 60)
}
```

**Storage**: HTTP-only cookie

```
Set-Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict
```

## Token Lifecycle

```
┌─────────────────────────────────────────────────┐
│         User Registration/Login                 │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Issue Access Token │ (15 min)
        └──────────┬──────────┘
                   │
        ┌──────────▼────────────────────┐
        │ Store Refresh Token in Cookie │ (30 days)
        └──────────┬────────────────────┘
                   │
        ┌──────────▼──────────────────────────┐
        │ Return Both Tokens to Client        │
        └──────────┬──────────────────────────┘
                   │
                   │ Client stores Access Token in Memory
                   │ (Browser automatically sends Cookie)
                   │
        ┌──────────▼──────────────────────────┐
        │ Access Token Expires (15 min)       │
        └──────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────────────────────┐
        │ Call POST /refresh-token            │
        │ (Cookie sent automatically)         │
        └──────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────────────────────┐
        │ Verify Refresh Token                │
        │ If < 7 days left: Rotate token      │
        └──────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────────────────────┐
        │ Issue New Access Token              │
        └──────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────────────────────┐
        │ Update Refresh Token (if rotated)   │
        └──────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────────────────────┐
        │ Return New Tokens to Client         │
        └─────────────────────────────────────┘
```

### Token Rotation

Refresh token di-rotate (replaced) ketika:

- Tersisa **7 hari** atau kurang sampai expiry (configurable via `REFRESH_ROTATE_THRESHOLD_DAYS`)
- User logout

Ini adalah security best practice untuk minimize damage jika token leaked.

## API Endpoints

### 1. Register

**Endpoint**: `POST /api/users/register`

**Request**:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123",
  "avatar": "https://example.com/avatar.jpg" (optional)
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Cookies Set**:

```
Set-Cookie: refreshToken=eyJ...; HttpOnly; Secure; Path=/; SameSite=Strict
```

**Validation Errors** (400 Bad Request):

- `name_required`: Name diperlukan
- `invalid_email`: Email format tidak valid
- `password_too_short`: Password minimal 6 karakter
- `email_already_exists`: Email sudah terdaftar

### 2. Login

**Endpoint**: `POST /api/users/login`

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
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Error Responses**:

- `401 Unauthorized`: Email atau password salah
- `404 Not Found`: User tidak ditemukan

### 3. Refresh Token

**Endpoint**: `POST /api/users/refresh-token`

**Headers**:

```
Cookie: refreshToken=eyJ...; 
```

**Request**: (empty body)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // if rotated
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Cookies Set** (jika token di-rotate):

```
Set-Cookie: refreshToken=eyJ...; HttpOnly; Secure; Path=/; SameSite=Strict
```

**Error Responses**:

- `401 Unauthorized`: Refresh token expired atau tidak valid
- `403 Forbidden`: Token tidak ditemukan

### 4. Logout

**Endpoint**: `POST /api/users/logout`

**Headers**:

```
Authorization: Bearer eyJ...
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null,
  "timestamp": "2026-01-12T10:00:00Z"
}
```

**Cookies Set**:

```
Set-Cookie: refreshToken=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

## Client Implementation

### JavaScript/TypeScript

```typescript
class AuthClient {
  private accessToken: string | null = null;

  async register(data: {
    name: string;
    email: string;
    password: string;
  }) {
    const response = await fetch('/api/users/register', {
      method: 'POST',
      credentials: 'include', // Include cookies
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    if (result.success) {
      this.accessToken = result.data.access_token;
      localStorage.setItem('accessToken', this.accessToken);
    }
    return result;
  }

  async login(email: string, password: string) {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      credentials: 'include', // Include cookies
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const result = await response.json();
    if (result.success) {
      this.accessToken = result.data.access_token;
      localStorage.setItem('accessToken', this.accessToken);
    }
    return result;
  }

  async refreshAccessToken() {
    const response = await fetch('/api/users/refresh-token', {
      method: 'POST',
      credentials: 'include', // Include cookies (refreshToken)
    });
    
    const result = await response.json();
    if (result.success) {
      this.accessToken = result.data.access_token;
      localStorage.setItem('accessToken', this.accessToken);
    }
    return result;
  }

  async logout() {
    const response = await fetch('/api/users/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
    
    this.accessToken = null;
    localStorage.removeItem('accessToken');
    return response.json();
  }

  async apiCall(url: string, options: RequestInit = {}) {
    const headers = options.headers as any || {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });

    // Jika 401, refresh token dan retry
    if (response.status === 401) {
      const refreshResult = await this.refreshAccessToken();
      if (refreshResult.success && this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url, {
          ...options,
          credentials: 'include',
          headers,
        });
      }
    }

    return response;
  }
}
```

### React Hook

```typescript
import { useState, useCallback } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch('/api/users/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    
    const data = await res.json();
    if (data.success) {
      setUser(data.data);
      setAccessToken(data.data.access_token);
      localStorage.setItem('accessToken', data.data.access_token);
    }
    return data;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/users/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await res.json();
    if (data.success) {
      setUser(data.data);
      setAccessToken(data.data.access_token);
      localStorage.setItem('accessToken', data.data.access_token);
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/users/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
  }, [accessToken]);

  return { user, accessToken, register, login, logout };
}
```

## Environment Variables

```env
# JWT Configuration
SECRET_KEY=your_super_secret_key_min_32_chars_long

# Token Expiry Configuration
REFRESH_TOKEN_EXPIRES_DAYS=30
REFRESH_ROTATE_THRESHOLD_DAYS=7

# Frontend URL (untuk CORS & redirect)
CLIENT_URL=http://localhost:3000
```

## Database Schema

### users table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,  -- Bcrypt hashed
  avatar VARCHAR(500),
  status user_status DEFAULT 'offline',
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### refresh_tokens table

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,  -- SHA256 hash of token
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

## Security Best Practices

1. **Always use HTTPS** di production
2. **Set `Secure` flag** pada refresh token cookie di production
3. **Set `HttpOnly` flag** untuk prevent XSS
4. **Set `SameSite=Strict`** untuk prevent CSRF
5. **Rotate refresh tokens** ketika password changed
6. **Implement rate limiting** pada login/register endpoints
7. **Use strong SECRET_KEY** (min 32 characters)
8. **Never expose tokens** di logs atau error messages
9. **Implement token blacklisting** untuk logout

## Troubleshooting

### "JWT_SECRET not set"

**Solution**:

```env
SECRET_KEY=your_secret_key_here
```

### Token expired ketika baru login

**Possible Causes**:

- Clock skew antara client dan server
- `ACCESS_TOKEN_EXPIRES_IN` terlalu pendek
- Server time tidak synchronized

**Solution**:

```bash
# Sync server time
ntpdate -s time.nist.gov  # Linux/Mac
# Windows: Settings > Time & Language > Sync now
```

### Refresh token tidak valid

**Possible Causes**:

- Refresh token sudah expired
- Token database entry tidak ditemukan
- Token hash tidak cocok

**Solution**:

1. Clear cookies dan login ulang
2. Check `refresh_tokens` table di database
3. Verify `token_hash` matches dengan stored value

### "Email already exists" pada register

**Solution**:

- Gunakan email berbeda
- Atau check apakah user sudah registered:

```bash
psql -U postgres -d chatapp -c "SELECT * FROM users WHERE email = 'email@example.com';"
```

## Testing

### Unit Test Example

```typescript
import { signAccessToken, verifyAccessToken, hashPassword, verifyPassword } from './tokenService';

describe('Token Service', () => {
  it('should sign and verify access token', () => {
    const token = signAccessToken({ id: 'user-123', email: 'test@example.com' });
    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe('user-123');
  });

  it('should hash and verify password', async () => {
    const password = 'securepass123';
    const hashed = await hashPassword(password);
    const verified = await verifyPassword(password, hashed);
    expect(verified).toBe(true);
  });

  it('should reject wrong password', async () => {
    const password = 'securepass123';
    const hashed = await hashPassword(password);
    const verified = await verifyPassword('wrongpass', hashed);
    expect(verified).toBe(false);
  });
});
```

## References

- [JWT.io](https://jwt.io) - JWT Introduction
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [bcryptjs Documentation](https://www.npmjs.com/package/bcryptjs)
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)

