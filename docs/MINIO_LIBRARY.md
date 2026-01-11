# MinIO Library Documentation

Dokumentasi lengkap untuk MinIO object storage library yang type-safe dan mudah digunakan.

## 📦 Overview

MinIO library menyediakan:

- File upload & download (buffer atau stream)
- Bucket management (create, list, policy)
- File management (copy, delete, list)
- Presigned URLs untuk temporary access
- Public URL generation
- Metadata & file stats
- Type-safe operations

## 🔧 Installation & Setup

### Install MinIO

#### Docker (Recommended)

```bash
# Run MinIO server
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  -v minio_data:/data \
  quay.io/minio/minio server /data --console-address ":9001"

# Access Console: http://localhost:9001
# Access API: http://localhost:9000
```

#### Windows

1. Download dari [min.io/download](https://min.io/download)
2. Extract dan jalankan `minio.exe server D:\minio-data`

#### Linux/macOS

```bash
# Download
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio

# Run
./minio server /mnt/data --console-address ":9001"
```

### Environment Variables

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_REGION=us-east-1

# For production
MINIO_ENDPOINT=minio.example.com
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
```

## 🚀 Usage

### Initialize Client

```typescript
import { getMinioClient } from './lib/minio';

// Get singleton instance
const minioClient = getMinioClient();
```

### File Upload

#### Upload from Buffer

```typescript
import { getMinioClient } from './lib/minio';
import { readFile } from 'fs/promises';

const minioClient = getMinioClient();

// Read file into buffer
const buffer = await readFile('path/to/image.jpg');

// Upload file
const url = await minioClient.uploadFile(
    'images',              // bucket name
    'user/profile.jpg',    // object name/path
    buffer,                // file buffer
    'image/jpeg',          // content type
    {                      // optional metadata
        userId: 'user-123',
        uploadedBy: 'admin'
    }
);

console.log('File URL:', url);
// Output: http://localhost:9000/images/user/profile.jpg
```

#### Upload from Stream

```typescript
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

const minioClient = getMinioClient();

// Create read stream
const stream = createReadStream('path/to/document.pdf');
const stats = await stat('path/to/document.pdf');

// Upload stream
const url = await minioClient.uploadStream(
    'documents',
    'reports/annual-report.pdf',
    stream,
    stats.size,
    'application/pdf'
);

console.log('Document uploaded:', url);
```

#### Upload from Express Request

```typescript
import multer from 'multer';
import { asyncHandler } from '../middleware/asyncHandler';

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
    const minioClient = getMinioClient();
    
    if (!req.file) {
        throw new HttpError(400, 'No file uploaded');
    }

    const objectName = `uploads/${Date.now()}-${req.file.originalname}`;
    
    const url = await minioClient.uploadFile(
        'uploads',
        objectName,
        req.file.buffer,
        req.file.mimetype
    );

    res.json({
        success: true,
        data: { url, filename: req.file.originalname },
        message: 'File uploaded successfully'
    });
}));
```

---

### File Download

```typescript
const minioClient = getMinioClient();

// Download file as buffer
const buffer = await minioClient.downloadFile('images', 'user/profile.jpg');

// Save to disk
import { writeFile } from 'fs/promises';
await writeFile('downloaded-profile.jpg', buffer);

// Or send as response
app.get('/download/:filename', asyncHandler(async (req, res) => {
    const buffer = await minioClient.downloadFile('images', req.params.filename);
    
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    res.send(buffer);
}));
```

---

### File Management

#### Check if File Exists

```typescript
const exists = await minioClient.fileExists('images', 'user/profile.jpg');

if (exists) {
    console.log('File exists');
} else {
    console.log('File not found');
}
```

#### Get File Stats

```typescript
const stats = await minioClient.getFileStats('images', 'user/profile.jpg');

console.log('Size:', stats.size);
console.log('Last Modified:', stats.lastModified);
console.log('ETag:', stats.etag);
console.log('Content-Type:', stats.metaData['content-type']);
```

#### Copy File

```typescript
// Copy file within same bucket
await minioClient.copyFile(
    'images',              // source bucket
    'temp/upload.jpg',     // source object
    'images',              // destination bucket
    'user/profile.jpg'     // destination object
);

// Copy between buckets
await minioClient.copyFile(
    'temp-uploads',
    'image123.jpg',
    'permanent-storage',
    'user/123/profile.jpg'
);
```

#### Delete File

```typescript
// Delete single file
await minioClient.deleteFile('images', 'user/old-profile.jpg');
console.log('File deleted');

// Delete multiple files
await minioClient.deleteFiles('images', [
    'user/profile1.jpg',
    'user/profile2.jpg',
    'user/banner.jpg'
]);
console.log('Multiple files deleted');
```

#### List Files

```typescript
// List all files in bucket
const allFiles = await minioClient.listFiles('images');

allFiles.forEach(file => {
    console.log('Name:', file.name);
    console.log('Size:', file.size);
    console.log('Last Modified:', file.lastModified);
});

// List files with prefix (folder)
const userFiles = await minioClient.listFiles('images', 'user/123/');

// List files non-recursively (only top level)
const topLevelFiles = await minioClient.listFiles('images', '', false);
```

---

### Bucket Management

#### Create/Ensure Bucket

```typescript
// Create bucket if doesn't exist
await minioClient.ensureBucket('my-new-bucket', 'us-east-1');

// Multiple buckets
const buckets = ['images', 'documents', 'videos'];
for (const bucket of buckets) {
    await minioClient.ensureBucket(bucket);
}
```

#### Set Bucket Policy

Make bucket public for read access:

```typescript
const bucketName = 'public-images';

const policy = {
    Version: '2012-10-17',
    Statement: [
        {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
        }
    ]
};

await minioClient.setBucketPolicy(
    bucketName,
    JSON.stringify(policy)
);

console.log('Bucket is now public');
```

---

### Presigned URLs

#### Generate Download URL

```typescript
// Generate temporary download URL (valid for 2 hours)
const downloadUrl = await minioClient.getPresignedUrl(
    'images',
    'user/profile.jpg',
    7200  // 2 hours in seconds
);

console.log('Download link:', downloadUrl);
// Share this URL with users

// Send via email or return in API
res.json({
    success: true,
    data: { downloadUrl },
    message: 'Download link generated'
});
```

#### Generate Upload URL (Direct Browser Upload)

```typescript
// Generate presigned POST policy for direct upload from browser
const uploadPolicy = await minioClient.getPresignedPostPolicy(
    'uploads',
    'user/${filename}',
    3600  // 1 hour
);

// Return to frontend
res.json({
    success: true,
    data: {
        postURL: uploadPolicy.postURL,
        formData: uploadPolicy.formData
    }
});

// Frontend can now upload directly to MinIO:
// const formData = new FormData();
// Object.entries(policy.formData).forEach(([key, val]) => {
//     formData.append(key, val);
// });
// formData.append('file', fileBlob);
// await fetch(policy.postURL, { method: 'POST', body: formData });
```

---

### Public URLs

```typescript
// Get public URL (assumes bucket is public)
const publicUrl = minioClient.getPublicUrl('images', 'user/profile.jpg');

console.log(publicUrl);
// Output: http://localhost:9000/images/user/profile.jpg

// Store in database
await db.query(
    'UPDATE users SET avatar = $1 WHERE id = $2',
    [publicUrl, userId]
);
```

---

## 📋 API Reference

### getMinioClient()

Get singleton MinIO client wrapper instance.

```typescript
export function getMinioClient(): MinioClientWrapper
```

**Returns:**

- MinioClientWrapper instance

**Example:**

```typescript
const minioClient = getMinioClient();
```

---

### uploadFile()

Upload file from buffer.

```typescript
async uploadFile(
    bucketName: string,
    objectName: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
): Promise<string>
```

**Parameters:**

- `bucketName`: Bucket name
- `objectName`: Object path (e.g., 'user/profile.jpg')
- `buffer`: File buffer
- `contentType`: MIME type (e.g., 'image/jpeg')
- `metadata`: Optional metadata object

**Returns:**

- Public URL of uploaded file

**Throws:**

- Error if upload fails

---

### uploadStream()

Upload file from stream.

```typescript
async uploadStream(
    bucketName: string,
    objectName: string,
    stream: NodeJS.ReadableStream,
    size: number,
    contentType: string,
    metadata?: Record<string, string>
): Promise<string>
```

**Parameters:**

- `bucketName`: Bucket name
- `objectName`: Object path
- `stream`: Readable stream
- `size`: File size in bytes
- `contentType`: MIME type
- `metadata`: Optional metadata

**Returns:**

- Public URL

---

### downloadFile()

Download file as buffer.

```typescript
async downloadFile(
    bucketName: string,
    objectName: string
): Promise<Buffer>
```

**Returns:**

- File buffer

**Throws:**

- Error if file not found

---

### deleteFile()

Delete single file.

```typescript
async deleteFile(
    bucketName: string,
    objectName: string
): Promise<void>
```

---

### deleteFiles()

Delete multiple files.

```typescript
async deleteFiles(
    bucketName: string,
    objectNames: string[]
): Promise<void>
```

**Parameters:**

- `bucketName`: Bucket name
- `objectNames`: Array of object paths

---

### fileExists()

Check if file exists.

```typescript
async fileExists(
    bucketName: string,
    objectName: string
): Promise<boolean>
```

**Returns:**

- true if exists, false otherwise

---

### getFileStats()

Get file metadata and stats.

```typescript
async getFileStats(
    bucketName: string,
    objectName: string
): Promise<Minio.BucketItemStat>
```

**Returns:**

- Object containing:
    - `size`: File size in bytes
    - `etag`: ETag
    - `lastModified`: Last modified date
    - `metaData`: Metadata object

---

### copyFile()

Copy file from one location to another.

```typescript
async copyFile(
    sourceBucket: string,
    sourceObject: string,
    destBucket: string,
    destObject: string
): Promise<void>
```

---

### listFiles()

List files in bucket.

```typescript
async listFiles(
    bucketName: string,
    prefix?: string,
    recursive?: boolean
): Promise<Minio.BucketItem[]>
```

**Parameters:**

- `bucketName`: Bucket name
- `prefix`: Filter by prefix (default: '')
- `recursive`: List recursively (default: true)

**Returns:**

- Array of objects containing:
    - `name`: Object name
    - `size`: File size
    - `etag`: ETag
    - `lastModified`: Last modified date

---

### ensureBucket()

Create bucket if doesn't exist.

```typescript
async ensureBucket(
    bucketName: string,
    region?: string
): Promise<void>
```

**Parameters:**

- `bucketName`: Bucket name
- `region`: AWS region (default: 'us-east-1')

---

### getPresignedUrl()

Generate temporary download URL.

```typescript
async getPresignedUrl(
    bucketName: string,
    objectName: string,
    expiry?: number
): Promise<string>
```

**Parameters:**

- `bucketName`: Bucket name
- `objectName`: Object path
- `expiry`: Expiry time in seconds (default: 7200 = 2 hours)

**Returns:**

- Presigned URL string

---

### getPresignedPostPolicy()

Generate presigned POST policy for direct browser upload.

```typescript
async getPresignedPostPolicy(
    bucketName: string,
    objectName: string,
    expiry?: number
): Promise<{ postURL: string; formData: Record<string, string> }>
```

**Returns:**

- Object with `postURL` and `formData`

---

### getPublicUrl()

Get public URL for object (assumes bucket is public).

```typescript
getPublicUrl(
    bucketName: string,
    objectName: string
): string
```

**Returns:**

- Public URL string

---

### setBucketPolicy()

Set bucket policy (e.g., make public).

```typescript
async setBucketPolicy(
    bucketName: string,
    policy: string
): Promise<void>
```

**Parameters:**

- `bucketName`: Bucket name
- `policy`: JSON policy string

---

### getRawClient()

Get raw MinIO client for advanced operations.

```typescript
getRawClient(): Minio.Client
```

**Example:**

```typescript
const client = minioClient.getRawClient();
const buckets = await client.listBuckets();
```

---

## 💡 Common Patterns

### 1. User Avatar Upload

```typescript
// Route handler
app.post('/users/:id/avatar', upload.single('avatar'), asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const minioClient = getMinioClient();
    
    if (!req.file) {
        throw new HttpError(400, 'No file uploaded');
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const objectName = `avatars/${userId}/avatar-${Date.now()}${ext}`;
    
    // Upload to MinIO
    const url = await minioClient.uploadFile(
        'user-assets',
        objectName,
        req.file.buffer,
        req.file.mimetype,
        { userId }
    );

    // Update database
    await db.query('UPDATE users SET avatar = $1 WHERE id = $2', [url, userId]);

    res.json({
        success: true,
        data: { avatarUrl: url },
        message: 'Avatar updated'
    });
}));
```

### 2. Temporary Download Links

```typescript
app.get('/files/:id/download', asyncHandler(async (req, res) => {
    const fileId = req.params.id;
    const userId = (req as any).user.id;

    // Get file info from database
    const file = await db.query(
        'SELECT * FROM files WHERE id = $1 AND user_id = $2',
        [fileId, userId]
    );

    if (!file.rows[0]) {
        throw new HttpError(404, 'File not found');
    }

    const minioClient = getMinioClient();
    
    // Generate temporary URL (1 hour)
    const downloadUrl = await minioClient.getPresignedUrl(
        file.rows[0].bucket,
        file.rows[0].object_name,
        3600
    );

    res.json({
        success: true,
        data: { downloadUrl },
        message: 'Download link generated (valid for 1 hour)'
    });
}));
```

### 3. Batch File Upload

```typescript
app.post('/upload/batch', upload.array('files', 10), asyncHandler(async (req, res) => {
    const minioClient = getMinioClient();
    const userId = (req as any).user.id;
    
    if (!req.files || req.files.length === 0) {
        throw new HttpError(400, 'No files uploaded');
    }

    const uploadPromises = (req.files as Express.Multer.File[]).map(async (file) => {
        const objectName = `uploads/${userId}/${Date.now()}-${file.originalname}`;
        
        const url = await minioClient.uploadFile(
            'user-uploads',
            objectName,
            file.buffer,
            file.mimetype,
            { userId, originalName: file.originalname }
        );

        // Save to database
        await db.query(
            'INSERT INTO files (user_id, filename, url, size) VALUES ($1, $2, $3, $4)',
            [userId, file.originalname, url, file.size]
        );

        return { filename: file.originalname, url };
    });

    const results = await Promise.all(uploadPromises);

    res.json({
        success: true,
        data: { files: results },
        message: `${results.length} files uploaded`
    });
}));
```

### 4. File Cleanup on Delete

```typescript
app.delete('/users/:id', asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const minioClient = getMinioClient();

    // Get user files
    const files = await db.query(
        'SELECT object_name FROM files WHERE user_id = $1',
        [userId]
    );

    // Delete from MinIO
    if (files.rows.length > 0) {
        const objectNames = files.rows.map(f => f.object_name);
        await minioClient.deleteFiles('user-uploads', objectNames);
    }

    // Delete from database
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({
        success: true,
        message: 'User and files deleted'
    });
}));
```

### 5. Image Processing Pipeline

```typescript
import sharp from 'sharp';

app.post('/upload/image', upload.single('image'), asyncHandler(async (req, res) => {
    const minioClient = getMinioClient();
    
    if (!req.file) {
        throw new HttpError(400, 'No image uploaded');
    }

    const userId = (req as any).user.id;
    const timestamp = Date.now();

    // Process image variants
    const variants = [
        { name: 'original', width: null, height: null },
        { name: 'large', width: 1920, height: 1080 },
        { name: 'medium', width: 1280, height: 720 },
        { name: 'thumbnail', width: 320, height: 180 },
    ];

    const uploadPromises = variants.map(async (variant) => {
        let buffer = req.file!.buffer;

        // Resize if needed
        if (variant.width && variant.height) {
            buffer = await sharp(buffer)
                .resize(variant.width, variant.height, { fit: 'inside' })
                .jpeg({ quality: 90 })
                .toBuffer();
        }

        const objectName = `images/${userId}/${timestamp}-${variant.name}.jpg`;
        
        const url = await minioClient.uploadFile(
            'processed-images',
            objectName,
            buffer,
            'image/jpeg',
            { userId, variant: variant.name }
        );

        return { variant: variant.name, url };
    });

    const results = await Promise.all(uploadPromises);

    res.json({
        success: true,
        data: { images: results },
        message: 'Image uploaded and processed'
    });
}));
```

---

## ⚡ Performance Tips

### 1. Use Streams for Large Files

```typescript
// ❌ Bad: Load entire file into memory
const buffer = await readFile('large-video.mp4');
await minioClient.uploadFile('videos', 'video.mp4', buffer, 'video/mp4');

// ✅ Good: Use stream
const stream = createReadStream('large-video.mp4');
const stats = await stat('large-video.mp4');
await minioClient.uploadStream('videos', 'video.mp4', stream, stats.size, 'video/mp4');
```

### 2. Batch Operations

```typescript
// ❌ Bad: Delete files one by one
for (const file of files) {
    await minioClient.deleteFile('bucket', file);
}

// ✅ Good: Batch delete
await minioClient.deleteFiles('bucket', files);
```

### 3. Check Existence Before Operations

```typescript
// Avoid errors by checking existence
const exists = await minioClient.fileExists('bucket', 'file.jpg');

if (exists) {
    await minioClient.deleteFile('bucket', 'file.jpg');
} else {
    console.log('File already deleted');
}
```

### 4. Use Presigned URLs for Direct Access

```typescript
// ❌ Bad: Proxy download through backend
app.get('/download/:id', async (req, res) => {
    const buffer = await minioClient.downloadFile('bucket', req.params.id);
    res.send(buffer); // Uses server bandwidth
});

// ✅ Good: Generate presigned URL
app.get('/download/:id', async (req, res) => {
    const url = await minioClient.getPresignedUrl('bucket', req.params.id, 3600);
    res.json({ downloadUrl: url }); // Client downloads directly from MinIO
});
```

---

## 🔐 Security Best Practices

### 1. Validate File Types

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
    throw new HttpError(400, 'Invalid file type');
}
```

### 2. Limit File Size

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (req.file.size > MAX_FILE_SIZE) {
    throw new HttpError(400, 'File too large');
}
```

### 3. Sanitize Filenames

```typescript
import path from 'path';

const sanitizeFilename = (filename: string): string => {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .substring(0, 255);
};

const safeFilename = sanitizeFilename(req.file.originalname);
```

### 4. Use UUID for Object Names

```typescript
import { v4 as uuidv4 } from 'uuid';

const objectName = `uploads/${uuidv4()}-${safeFilename}`;
```

### 5. Set Bucket Policies Carefully

```typescript
// Don't make sensitive data buckets public
// Only make public buckets for assets that should be accessible
```

---

## 🧪 Testing

### Mock MinIO

```typescript
jest.mock('../lib/minio', () => ({
    getMinioClient: jest.fn(() => ({
        uploadFile: jest.fn().mockResolvedValue('http://minio/bucket/file.jpg'),
        downloadFile: jest.fn().mockResolvedValue(Buffer.from('test')),
        deleteFile: jest.fn().mockResolvedValue(undefined),
    })),
}));

import { getMinioClient } from '../lib/minio';

describe('File Upload', () => {
    it('should upload file', async () => {
        const minioClient = getMinioClient();
        const url = await minioClient.uploadFile('test', 'file.jpg', Buffer.from('test'), 'image/jpeg');
        expect(url).toBe('http://minio/bucket/file.jpg');
    });
});
```

---

## ❌ Common Errors & Fixes

### Error: "Bucket does not exist"

**Cause**: Bucket not created

**Fix**:

```typescript
await minioClient.ensureBucket('my-bucket');
```

---

### Error: "Connection refused"

**Cause**: MinIO server not running

**Fix**:

```bash
docker start minio
# or
docker run -d -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
```

---

### Error: "Access Denied"

**Cause**: Invalid credentials

**Fix**:

```env
MINIO_ACCESS_KEY=correct_access_key
MINIO_SECRET_KEY=correct_secret_key
```

---

### Error: "The specified key does not exist"

**Cause**: File not found

**Fix**:

```typescript
const exists = await minioClient.fileExists('bucket', 'file.jpg');
if (!exists) {
    throw new HttpError(404, 'File not found');
}
```

---

## 📚 References

- [MinIO Documentation](https://min.io/docs/)
- [MinIO JavaScript Client](https://min.io/docs/minio/linux/developers/javascript/minio-javascript.html)
- [S3 API Compatibility](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)

---

**Last Updated**: January 12, 2026

