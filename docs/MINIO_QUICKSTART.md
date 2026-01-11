# MinIO Quick Start Guide

## 🚀 Setup (5 menit)

### 1. Install Dependencies

```bash
npm install minio
```

### 2. Environment Variables

Tambahkan ke `.env`:

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_REGION=us-east-1
```

### 3. Update nuxt.config.ts

```typescript
export default defineNuxtConfig({
    runtimeConfig: {
        minioEndpoint: process.env.MINIO_ENDPOINT,
        minioPort: process.env.MINIO_PORT,
        minioUseSSL: process.env.MINIO_USE_SSL,
        minioAccessKey: process.env.MINIO_ACCESS_KEY,
        minioSecretKey: process.env.MINIO_SECRET_KEY,
        minioRegion: process.env.MINIO_REGION,
    }
})
```

### 4. Run MinIO (Docker)

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

Akses console: http://localhost:9001

---

## 📝 Common Use Cases

### Upload File

```typescript
import {getMinioClient} from '~/server/lib/minio'

const minioClient = getMinioClient()
const url = await minioClient.uploadFile(
    'images',           // bucket
    'user/photo.jpg',   // path
    buffer,             // file buffer
    'image/jpeg'        // content-type
)
```

### Download File

```typescript
const buffer = await minioClient.downloadFile('images', 'user/photo.jpg')
```

### Delete File

```typescript
await minioClient.deleteFile('images', 'user/photo.jpg')
```

### Check File Exists

```typescript
const exists = await minioClient.fileExists('images', 'user/photo.jpg')
```

### List Files

```typescript
const files = await minioClient.listFiles('images', 'user/')
```

### Get Temporary URL

```typescript
// Valid for 1 hour
const url = await minioClient.getPresignedUrl('private', 'doc.pdf', 3600)
```

---

## 🎯 Complete Example: File Upload API

```typescript
// server/api/upload.post.ts
import { getMinioClient } from '~/server/lib/minio'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  const file = form?.find(item => item.name === 'file')

  if (!file?.data) {
    throw createError({ statusCode: 400, message: 'No file' })
  }

  const minioClient = getMinioClient()
  const filename = `${Date.now()}-${file.filename}`

  const url = await minioClient.uploadFile(
    'uploads',
    filename,
    file.data,
    file.type || 'application/octet-stream'
  )

  return { success: true, url }
})
```

**Frontend Usage:**

```typescript
const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch('/api/upload', {
        method: 'POST',
        body: formData
    })

    console.log('Uploaded:', response.url)
}
```

---

## 🛠️ Helper Functions

### Generate Unique Filename

```typescript
import {randomUUID} from 'crypto'

const generateFilename = (originalName: string) => {
    const ext = originalName.split('.').pop()
    return `${Date.now()}-${randomUUID()}.${ext}`
}
```

### Validate File Type

```typescript
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']

if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type')
}
```

### Validate File Size

```typescript
const maxSize = 5 * 1024 * 1024 // 5MB

if (file.size > maxSize) {
    throw new Error('File too large')
}
```

---

## 📚 Full Documentation

For complete API reference and advanced usage, see [MINIO_DOCUMENTATION.md](./MINIO_DOCUMENTATION.md)

---

## 🐛 Troubleshooting

| Problem            | Solution                                  |
|--------------------|-------------------------------------------|
| Connection refused | Make sure MinIO is running: `docker ps`   |
| Access denied      | Check credentials in `.env`               |
| Bucket not found   | Use `ensureBucket()` or create in console |
| File too large     | Increase size limit or use stream         |

---

## 📖 Key Methods

| Method              | Description        | Example                                                     |
|---------------------|--------------------|-------------------------------------------------------------|
| `uploadFile()`      | Upload buffer      | `uploadFile('bucket', 'path', buffer, 'image/jpeg')`        |
| `uploadStream()`    | Upload stream      | `uploadStream('bucket', 'path', stream, size, 'video/mp4')` |
| `downloadFile()`    | Download as buffer | `downloadFile('bucket', 'path')`                            |
| `deleteFile()`      | Delete single file | `deleteFile('bucket', 'path')`                              |
| `deleteFiles()`     | Delete multiple    | `deleteFiles('bucket', ['path1', 'path2'])`                 |
| `fileExists()`      | Check if exists    | `fileExists('bucket', 'path')`                              |
| `getFileStats()`    | Get metadata       | `getFileStats('bucket', 'path')`                            |
| `listFiles()`       | List all files     | `listFiles('bucket', 'prefix/')`                            |
| `getPresignedUrl()` | Temporary URL      | `getPresignedUrl('bucket', 'path', 3600)`                   |
| `copyFile()`        | Copy file          | `copyFile('src', 'path', 'dst', 'path')`                    |
| `ensureBucket()`    | Create if needed   | `ensureBucket('bucket')`                                    |

---

**Happy Coding! 🎉**

