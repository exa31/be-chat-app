# MinIO Client Library Documentation

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Basic Usage](#basic-usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)

---

## Installation

```bash
npm install minio
```

## Configuration

Add the following environment variables to your `.env` file:

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost           # MinIO server endpoint
MINIO_PORT=9000                    # MinIO server port
MINIO_USE_SSL=false                # Use HTTPS (true) or HTTP (false)
MINIO_ACCESS_KEY=your_access_key   # MinIO access key
MINIO_SECRET_KEY=your_secret_key   # MinIO secret key
MINIO_REGION=us-east-1             # MinIO region (optional)
```

Update `nuxt.config.ts`:

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

---

## Basic Usage

### Import the Library

```typescript
import {getMinioClient} from '~/server/lib/minio'
```

### Initialize Client

```typescript
const minioClient = getMinioClient()
```

---

## API Reference

### 1. `uploadFile()`

Upload a file from buffer.

**Signature:**

```typescript
uploadFile(
    bucketName
:
string,
    objectName
:
string,
    buffer
:
Buffer,
    contentType
:
string,
    metadata ? : Record<string, string>
):
Promise<string>
```

**Parameters:**

- `bucketName` - Name of the bucket
- `objectName` - Path/name of the file in MinIO
- `buffer` - File buffer
- `contentType` - MIME type (e.g., 'image/jpeg', 'application/pdf')
- `metadata` - Optional metadata object

**Returns:** Public URL of the uploaded file

**Example:**

```typescript
const buffer = await readFile('image.jpg')
const url = await minioClient.uploadFile(
    'images',
    'users/profile.jpg',
    buffer,
    'image/jpeg',
    {userId: '123', uploadedBy: 'admin'}
)
console.log('Uploaded:', url)
// Output: http://localhost:9000/images/users/profile.jpg
```

---

### 2. `uploadStream()`

Upload a file from stream (useful for large files).

**Signature:**

```typescript
uploadStream(
    bucketName
:
string,
    objectName
:
string,
    stream
:
NodeJS.ReadableStream,
    size
:
number,
    contentType
:
string,
    metadata ? : Record<string, string>
):
Promise<string>
```

**Example:**

```typescript
import {createReadStream} from 'fs'
import {stat} from 'fs/promises'

const stream = createReadStream('large-file.mp4')
const stats = await stat('large-file.mp4')

const url = await minioClient.uploadStream(
    'videos',
    'uploads/video.mp4',
    stream,
    stats.size,
    'video/mp4'
)
```

---

### 3. `downloadFile()`

Download a file as buffer.

**Signature:**

```typescript
downloadFile(bucketName
:
string, objectName
:
string
):
Promise<Buffer>
```

**Example:**

```typescript
const buffer = await minioClient.downloadFile('images', 'users/profile.jpg')
await writeFile('downloaded.jpg', buffer)
```

---

### 4. `deleteFile()`

Delete a single file.

**Signature:**

```typescript
deleteFile(bucketName
:
string, objectName
:
string
):
Promise<void>
```

**Example:**

```typescript
await minioClient.deleteFile('images', 'users/old-profile.jpg')
console.log('File deleted successfully')
```

---

### 5. `deleteFiles()`

Delete multiple files at once.

**Signature:**

```typescript
deleteFiles(bucketName
:
string, objectNames
:
string[]
):
Promise<void>
```

**Example:**

```typescript
await minioClient.deleteFiles('images', [
    'users/profile-1.jpg',
    'users/profile-2.jpg',
    'users/banner.jpg'
])
```

---

### 6. `fileExists()`

Check if a file exists.

**Signature:**

```typescript
fileExists(bucketName
:
string, objectName
:
string
):
Promise<boolean>
```

**Example:**

```typescript
const exists = await minioClient.fileExists('images', 'users/profile.jpg')
if (exists) {
    console.log('File exists!')
} else {
    console.log('File not found')
}
```

---

### 7. `getFileStats()`

Get file metadata and statistics.

**Signature:**

```typescript
getFileStats(bucketName
:
string, objectName
:
string
):
Promise<BucketItemStat>
```

**Example:**

```typescript
const stats = await minioClient.getFileStats('images', 'users/profile.jpg')
console.log('Size:', stats.size, 'bytes')
console.log('Last Modified:', stats.lastModified)
console.log('Content-Type:', stats.metaData['content-type'])
console.log('ETag:', stats.etag)
```

---

### 8. `getPresignedUrl()`

Generate temporary download URL (useful for private files).

**Signature:**

```typescript
getPresignedUrl(bucketName
:
string, objectName
:
string, expiry ? : number
):
Promise<string>
```

**Parameters:**

- `expiry` - URL validity in seconds (default: 7200 = 2 hours)

**Example:**

```typescript
// Generate URL valid for 1 hour
const url = await minioClient.getPresignedUrl('private-docs', 'invoice.pdf', 3600)

// Send URL to user (valid for 1 hour)
console.log('Download link:', url)
// Output: http://localhost:9000/private-docs/invoice.pdf?X-Amz-Algorithm=...
```

---

### 9. `listFiles()`

List all files in a bucket.

**Signature:**

```typescript
listFiles(bucketName
:
string, prefix ? : string, recursive ? : boolean
):
Promise<BucketItem[]>
```

**Example:**

```typescript
// List all files
const allFiles = await minioClient.listFiles('images')

// List files in a folder
const userFiles = await minioClient.listFiles('images', 'users/', true)

// List only top-level files (non-recursive)
const topLevel = await minioClient.listFiles('images', '', false)

allFiles.forEach(file => {
    console.log('Name:', file.name)
    console.log('Size:', file.size, 'bytes')
    console.log('Last Modified:', file.lastModified)
})
```

---

### 10. `copyFile()`

Copy file from one location to another.

**Signature:**

```typescript
copyFile(
    sourceBucket
:
string,
    sourceObject
:
string,
    destBucket
:
string,
    destObject
:
string
):
Promise<void>
```

**Example:**

```typescript
// Copy within same bucket
await minioClient.copyFile(
    'images',
    'temp/upload.jpg',
    'images',
    'users/profile.jpg'
)

// Copy to different bucket
await minioClient.copyFile(
    'uploads',
    'temp.pdf',
    'documents',
    'final/report.pdf'
)
```

---

### 11. `ensureBucket()`

Create bucket if it doesn't exist.

**Signature:**

```typescript
ensureBucket(bucketName
:
string, region ? : string
):
Promise<void>
```

**Example:**

```typescript
await minioClient.ensureBucket('my-new-bucket')
// Bucket created or already exists
```

---

### 12. `getPublicUrl()`

Get public URL (assumes bucket is public).

**Signature:**

```typescript
getPublicUrl(bucketName
:
string, objectName
:
string
):
string
```

**Example:**

```typescript
const url = minioClient.getPublicUrl('images', 'users/profile.jpg')
console.log(url)
// Output: http://localhost:9000/images/users/profile.jpg
```

---

## Examples

### Example 1: Upload Endpoint

```typescript
// server/api/upload.post.ts
import { getMinioClient } from '~/server/lib/minio'

export default defineEventHandler(async (event) => {
  try {
    // Parse multipart form data
    const form = await readMultipartFormData(event)
    const file = form?.find(item => item.name === 'file')

    if (!file || !file.data) {
      throw new Error('No file provided')
    }

    const minioClient = getMinioClient()

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.filename}`
    const objectName = `uploads/${filename}`

    // Upload to MinIO
    const url = await minioClient.uploadFile(
      'images',
      objectName,
      file.data,
      file.type || 'application/octet-stream'
    )

    return {
      success: true,
      url,
      filename: file.filename,
      size: file.data.length
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Upload failed'
    })
  }
})
```

---

### Example 2: Delete Old Files

```typescript
// Delete files older than 30 days
async function cleanupOldFiles() {
    const minioClient = getMinioClient()
    const files = await minioClient.listFiles('temp-uploads')

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const filesToDelete = files
        .filter(file => file.lastModified < thirtyDaysAgo)
        .map(file => file.name)

    if (filesToDelete.length > 0) {
        await minioClient.deleteFiles('temp-uploads', filesToDelete)
        console.log(`Deleted ${filesToDelete.length} old files`)
    }
}
```

---

### Example 3: Image Processing

```typescript
import sharp from 'sharp'
import { getMinioClient } from '~/server/lib/minio'

export default defineEventHandler(async (event) => {
  const minioClient = getMinioClient()

  // Download original image
  const buffer = await minioClient.downloadFile('images', 'original.jpg')

  // Resize image
  const thumbnail = await sharp(buffer)
    .resize(200, 200, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer()

  // Upload thumbnail
  const url = await minioClient.uploadFile(
    'images',
    'thumbnails/thumb.jpg',
    thumbnail,
    'image/jpeg'
  )

  return { url }
})
```

---

### Example 4: Private File Download

```typescript
// server/api/download/[id].get.ts
import { getMinioClient } from '~/server/lib/minio'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  // Verify user has access (implement your auth logic)
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const minioClient = getMinioClient()

  // Generate presigned URL (valid for 5 minutes)
  const url = await minioClient.getPresignedUrl(
    'private-files',
    `documents/${id}.pdf`,
    300
  )

  // Redirect to presigned URL
  return sendRedirect(event, url)
})
```

---

### Example 5: Batch Upload

```typescript
async function uploadMultipleFiles(files: Array<{ buffer: Buffer, name: string, type: string }>) {
    const minioClient = getMinioClient()
    const results = []

    for (const file of files) {
        try {
            const url = await minioClient.uploadFile(
                'images',
                `batch/${file.name}`,
                file.buffer,
                file.type
            )
            results.push({success: true, name: file.name, url})
        } catch (error) {
            results.push({success: false, name: file.name, error: (error as Error).message})
        }
    }

    return results
}
```

---

## Best Practices

### 1. **Bucket Organization**

```typescript
// Good: Organize files in folders
'images/users/123/profile.jpg'
'images/products/456/thumbnail.jpg'
'documents/invoices/2024/invoice-001.pdf'

// Bad: All files in root
'profile.jpg'
'thumbnail.jpg'
'invoice.pdf'
```

### 2. **File Naming**

```typescript
// Use timestamps and unique IDs
const filename = `${Date.now()}-${generateUUID()}-${originalName}`

// Or hash-based
import {createHash} from 'crypto'

const hash = createHash('sha256').update(buffer).digest('hex')
const filename = `${hash}.jpg`
```

### 3. **Error Handling**

```typescript
try {
    const url = await minioClient.uploadFile(...)
    return {success: true, url}
} catch (error) {
    console.error('Upload failed:', error)

    // Check specific error types
    if (error.code === 'NoSuchBucket') {
        // Handle missing bucket
    } else if (error.code === 'AccessDenied') {
        // Handle permission error
    }

    return {success: false, error: error.message}
}
```

### 4. **Memory Management**

```typescript
// For large files, use streams instead of buffers
const stream = createReadStream('large-video.mp4')
await minioClient.uploadStream('videos', 'video.mp4', stream, fileSize, 'video/mp4')

// Don't load entire file into memory
// ❌ const buffer = await readFile('10GB-file.zip')
// ✅ Use stream instead
```

### 5. **Cleanup Old Files**

```typescript
// Schedule cleanup job
import {CronJob} from 'cron'

const cleanupJob = new CronJob('0 0 * * *', async () => {
    // Run daily at midnight
    await cleanupOldFiles()
})

cleanupJob.start()
```

---

## Error Handling

### Common Errors

| Error Code          | Description          | Solution                                |
|---------------------|----------------------|-----------------------------------------|
| `NoSuchBucket`      | Bucket doesn't exist | Use `ensureBucket()` or create manually |
| `NoSuchKey`         | File doesn't exist   | Check file path, use `fileExists()`     |
| `AccessDenied`      | Permission denied    | Check credentials and bucket policy     |
| `EntityTooLarge`    | File too large       | Increase size limit or use stream       |
| `InvalidBucketName` | Invalid bucket name  | Use lowercase, no special chars         |

### Example Error Handler

```typescript
async function safeUpload(bucket: string, name: string, buffer: Buffer, type: string) {
  const minioClient = getMinioClient()

  try {
    return await minioClient.uploadFile(bucket, name, buffer, type)
  } catch (error: any) {
    console.error('Upload error:', error)

    switch (error.code) {
      case 'NoSuchBucket':
        await minioClient.ensureBucket(bucket)
        return await minioClient.uploadFile(bucket, name, buffer, type)
      
      case 'EntityTooLarge':
        throw new Error('File too large. Maximum size is 5MB')
      
      case 'AccessDenied':
        throw new Error('Permission denied. Check MinIO credentials')
      
      default:
        throw new Error(`Upload failed: ${error.message}`)
    }
  }
}
```

---

## Advanced Usage

### Direct Client Access

For advanced operations not covered by the wrapper:

```typescript
const minioClient = getMinioClient()
const rawClient = minioClient.getRawClient()

// Use native MinIO methods
const buckets = await rawClient.listBuckets()
const bucketPolicy = await rawClient.getBucketPolicy('my-bucket')
```

### Custom Bucket Policies

```typescript
// Make bucket public for read
const policy = {
    Version: '2012-10-17',
    Statement: [{
        Effect: 'Allow',
        Principal: {AWS: ['*']},
        Action: ['s3:GetObject'],
        Resource: ['arn:aws:s3:::images/*']
    }]
}

await minioClient.setBucketPolicy('images', JSON.stringify(policy))
```

---

## Testing

```typescript
// test/minio.test.ts
import {describe, it, expect, beforeAll} from 'vitest'
import {getMinioClient} from '~/server/lib/minio'

describe('MinIO Client', () => {
    let client: ReturnType<typeof getMinioClient>

    beforeAll(() => {
        client = getMinioClient()
    })

    it('should upload file', async () => {
        const buffer = Buffer.from('test content')
        const url = await client.uploadFile('test', 'test.txt', buffer, 'text/plain')
        expect(url).toContain('test/test.txt')
    })

    it('should check file exists', async () => {
        const exists = await client.fileExists('test', 'test.txt')
        expect(exists).toBe(true)
    })

    it('should delete file', async () => {
        await client.deleteFile('test', 'test.txt')
        const exists = await client.fileExists('test', 'test.txt')
        expect(exists).toBe(false)
    })
})
```

---

## Troubleshooting

### Issue: Connection Refused

**Cause:** MinIO server not running or wrong endpoint

**Solution:**

```bash
# Check MinIO is running
docker ps | grep minio

# Start MinIO
docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
```

### Issue: Access Denied

**Cause:** Invalid credentials

**Solution:**

- Check `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY`
- Verify credentials in MinIO console
- Check bucket permissions

### Issue: Bucket Not Found

**Cause:** Bucket doesn't exist

**Solution:**

```typescript
// Always ensure bucket exists
await minioClient.ensureBucket('my-bucket')
```

---

## References

- [MinIO Documentation](https://docs.min.io/)
- [MinIO JavaScript Client SDK](https://docs.min.io/docs/javascript-client-quickstart-guide.html)
- [S3 API Compatibility](https://docs.min.io/docs/minio-server-configuration-guide.html)

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**License:** MIT

