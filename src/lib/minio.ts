import * as Minio from 'minio';

/**
 * MinIO Client Wrapper
 *
 * A utility class for interacting with MinIO object storage.
 * Provides methods for uploading, downloading, deleting files, and managing buckets.
 *
 * @example
 * ```typescript
 * const minioClient = getMinioClient()
 *
 * // Upload a file
 * const url = await minioClient.uploadFile('my-bucket', 'file.jpg', buffer, 'image/jpeg')
 *
 * // Delete a file
 * await minioClient.deleteFile('my-bucket', 'file.jpg')
 * ```
 */

// Configuration interface
interface MinioConfig {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    region?: string;
}

// Get configuration from environment variables
const getMinioConfig = (): MinioConfig => {
    return {
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true' || false,
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        region: process.env.MINIO_REGION || 'us-east-1',
    };
};

// Create MinIO client instance
let minioClient: Minio.Client | null = null;

/**
 * Get or create MinIO client instance (Singleton pattern)
 *
 * @returns {Minio.Client} MinIO client instance
 *
 * @example
 * ```typescript
 * const client = getMinioClientInstance()
 * const buckets = await client.listBuckets()
 * ```
 */
export const getMinioClientInstance = (): Minio.Client => {
    if (!minioClient) {
        const config = getMinioConfig();
        minioClient = new Minio.Client(config);
    }
    return minioClient;
};

/**
 * MinIO Client Wrapper Class
 * Provides high-level methods for common MinIO operations
 */
class MinioClientWrapper {
    private client: Minio.Client;
    private publicUrl: string;

    constructor() {
        this.client = getMinioClientInstance();
        const config = getMinioConfig();
        const protocol = config.useSSL ? 'https' : 'http';
        const port = config.port === 80 || config.port === 443 ? '' : `:${config.port}`;
        this.publicUrl = `${protocol}://${config.endPoint}${port}`;
    }

    /**
     * Ensure bucket exists, create if not
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} [region='us-east-1'] - Region for the bucket
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await minioClient.ensureBucket('my-bucket')
     * ```
     */
    async ensureBucket(bucketName: string, region: string = 'us-east-1'): Promise<void> {
        try {
            const exists = await this.client.bucketExists(bucketName);
            if (!exists) {
                await this.client.makeBucket(bucketName, region);
                console.log(`[minio] Bucket "${bucketName}" created successfully`);
            }
        } catch (error) {
            console.error(`[minio] Error ensuring bucket "${bucketName}":`, error);
            throw error;
        }
    }

    /**
     * Upload a file to MinIO
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} objectName - Name/path of the object in MinIO
     * @param {Buffer} buffer - File buffer
     * @param {string} contentType - MIME type of the file
     * @param {Record<string, string>} [metadata={}] - Optional metadata
     * @returns {Promise<string>} URL of the uploaded file
     *
     * @example
     * ```typescript
     * const buffer = await readFile('path/to/file.jpg')
     * const url = await minioClient.uploadFile(
     *   'images',
     *   'user/profile.jpg',
     *   buffer,
     *   'image/jpeg',
     *   { userId: '123' }
     * )
     * console.log('File uploaded:', url)
     * ```
     */
    async uploadFile(
        bucketName: string,
        objectName: string,
        buffer: Buffer,
        contentType: string,
        metadata: Record<string, string> = {}
    ): Promise<string> {
        try {
            // Ensure bucket exists
            await this.ensureBucket(bucketName);

            // Upload file
            const metaData = {
                'Content-Type': contentType,
                ...metadata,
            };

            await this.client.putObject(bucketName, objectName, buffer, buffer.length, metaData);

            // Return public URL
            return this.getPublicUrl(bucketName, objectName);
        } catch (error) {
            console.error(`[minio] Error uploading file to "${bucketName}/${objectName}":`, error);
            throw error;
        }
    }

    /**
     * Upload file from stream
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} objectName - Name/path of the object
     * @param {NodeJS.ReadableStream} stream - Readable stream
     * @param {number} size - Size of the file
     * @param {string} contentType - MIME type
     * @param {Record<string, string>} [metadata={}] - Optional metadata
     * @returns {Promise<string>} URL of the uploaded file
     *
     * @example
     * ```typescript
     * const stream = createReadStream('file.pdf')
     * const stats = await stat('file.pdf')
     * const url = await minioClient.uploadStream(
     *   'documents',
     *   'report.pdf',
     *   stream,
     *   stats.size,
     *   'application/pdf'
     * )
     * ```
     */
    async uploadStream(
        bucketName: string,
        objectName: string,
        stream: NodeJS.ReadStream,
        size: number,
        contentType: string,
        metadata: Record<string, string> = {}
    ): Promise<string> {
        try {
            await this.ensureBucket(bucketName)

            const metaData = {
                'Content-Type': contentType,
                ...metadata,
            }

            await this.client.putObject(bucketName, objectName, stream, size, metaData)
            return this.getPublicUrl(bucketName, objectName)
        } catch (error) {
            console.error(`Error uploading stream to "${bucketName}/${objectName}":`, error)
            throw error
        }
    }

    /**
     * Download a file from MinIO
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} objectName - Name/path of the object
     * @returns {Promise<Buffer>} File buffer
     *
     * @example
     * ```typescript
     * const buffer = await minioClient.downloadFile('images', 'user/profile.jpg')
     * await writeFile('downloaded.jpg', buffer)
     * ```
     */
    async downloadFile(bucketName: string, objectName: string): Promise<Buffer> {
        try {
            const chunks: Buffer[] = []
            const stream = await this.client.getObject(bucketName, objectName)

            return new Promise((resolve, reject) => {
                stream.on('data', (chunk: Buffer<ArrayBufferLike>) => chunks.push(chunk))
                stream.on('end', () => resolve(Buffer.concat(chunks)))
                stream.on('error', reject)
            })
        } catch (error) {
            console.error(`Error downloading file "${bucketName}/${objectName}":`, error)
            throw error
        }
    }

    /**
     * Delete a file from MinIO
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} objectName - Name/path of the object
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await minioClient.deleteFile('images', 'user/profile.jpg')
     * console.log('File deleted successfully')
     * ```
     */
    async deleteFile(bucketName: string, objectName: string): Promise<void> {
        try {
            await this.client.removeObject(bucketName, objectName)
        } catch (error) {
            console.error(`Error deleting file "${bucketName}/${objectName}":`, error)
            throw error
        }
    }

    /**
     * Delete multiple files from MinIO
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string[]} objectNames - Array of object names/paths
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await minioClient.deleteFiles('images', [
     *   'user/profile.jpg',
     *   'user/banner.jpg'
     * ])
     * ```
     */
    async deleteFiles(bucketName: string, objectNames: string[]): Promise<void> {
        try {
            await this.client.removeObjects(bucketName, objectNames)
        } catch (error) {
            console.error(`Error deleting files from "${bucketName}":`, error)
            throw error
        }
    }

    /**
     * Check if file exists
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} objectName - Name/path of the object
     * @returns {Promise<boolean>} True if file exists
     *
     * @example
     * ```typescript
     * const exists = await minioClient.fileExists('images', 'user/profile.jpg')
     * if (exists) {
     *   console.log('File exists')
     * }
     * ```
     */
    async fileExists(bucketName: string, objectName: string): Promise<boolean> {
        try {
            await this.client.statObject(bucketName, objectName)
            return true
        } catch (error: any) {
            if (error.code === 'NotFound') {
                return false
            }
            throw error
        }
    }

    /**
     * Get file metadata/stats
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} objectName - Name/path of the object
     * @returns {Promise<Minio.BucketItemStat>} File stats
     *
     * @example
     * ```typescript
     * const stats = await minioClient.getFileStats('images', 'user/profile.jpg')
     * console.log('Size:', stats.size)
     * console.log('Last Modified:', stats.lastModified)
     * console.log('Content-Type:', stats.metaData['content-type'])
     * ```
     */
    async getFileStats(bucketName: string, objectName: string): Promise<Minio.BucketItemStat> {
        try {
            return await this.client.statObject(bucketName, objectName)
        } catch (error) {
            console.error(`Error getting stats for "${bucketName}/${objectName}":`, error)
            throw error
        }
    }

    /**
     * Generate presigned URL for temporary access
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} objectName - Name/path of the object
     * @param {number} [expiry=7200] - URL expiry in seconds (default: 2 hours)
     * @returns {Promise<string>} Presigned URL
     *
     * @example
     * ```typescript
     * // Generate URL valid for 1 hour
     * const url = await minioClient.getPresignedUrl('images', 'user/profile.jpg', 3600)
     * console.log('Download link:', url)
     * ```
     */
    async getPresignedUrl(bucketName: string, objectName: string, expiry: number = 7200): Promise<string> {
        try {
            return await this.client.presignedGetObject(bucketName, objectName, expiry)
        } catch (error) {
            console.error(`Error generating presigned URL for "${bucketName}/${objectName}":`, error)
            throw error
        }
    }

    /**
     * Generate presigned POST policy for direct browser upload
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} objectName - Name/path of the object
     * @param {number} [expiry=7200] - Policy expiry in seconds
     * @returns {Promise<Minio.PostPolicy>} Presigned POST policy
     *
     * @example
     * ```typescript
     * const policy = await minioClient.getPresignedPostPolicy('images', 'upload/${filename}', 3600)
     * // Use policy.postURL and policy.formData in frontend
     * ```
     */
    async getPresignedPostPolicy(bucketName: string, objectName: string, expiry: number = 7200): Promise<any> {
        try {
            const policy = this.client.newPostPolicy()
            policy.setBucket(bucketName)
            policy.setKey(objectName)
            const expires = new Date()
            expires.setSeconds(expires.getSeconds() + expiry)
            policy.setExpires(expires)

            return await this.client.presignedPostPolicy(policy)
        } catch (error) {
            console.error(`Error generating presigned POST policy:`, error)
            throw error
        }
    }

    /**
     * List all files in a bucket
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} [prefix=''] - Filter by prefix
     * @param {boolean} [recursive=true] - List recursively
     * @returns {Promise<Minio.BucketItem[]>} Array of bucket items
     *
     * @example
     * ```typescript
     * // List all files
     * const files = await minioClient.listFiles('images')
     *
     * // List files in a folder
     * const userFiles = await minioClient.listFiles('images', 'user/')
     *
     * files.forEach(file => {
     *   console.log('File:', file.name, 'Size:', file.size)
     * })
     * ```
     */
    async listFiles(bucketName: string, prefix: string = '', recursive: boolean = true): Promise<Minio.BucketItem[]> {
        try {
            const files: Minio.BucketItem[] = []
            const stream = this.client.listObjects(bucketName, prefix, recursive)

            return new Promise((resolve, reject) => {
                stream.on('data', (obj: any) => files.push(obj))
                stream.on('end', () => resolve(files))
                stream.on('error', reject)
            })
        } catch (error) {
            console.error(`Error listing files in "${bucketName}":`, error)
            throw error
        }
    }

    /**
     * Copy file from one location to another
     *
     * @param {string} sourceBucket - Source bucket name
     * @param {string} sourceObject - Source object name/path
     * @param {string} destBucket - Destination bucket name
     * @param {string} destObject - Destination object name/path
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * await minioClient.copyFile(
     *   'images',
     *   'temp/upload.jpg',
     *   'images',
     *   'user/profile.jpg'
     * )
     * ```
     */
    async copyFile(sourceBucket: string, sourceObject: string, destBucket: string, destObject: string): Promise<void> {
        try {
            await this.ensureBucket(destBucket)
            const conds = new Minio.CopyConditions()
            await this.client.copyObject(destBucket, destObject, `/${sourceBucket}/${sourceObject}`, conds)
        } catch (error) {
            console.error(`Error copying file:`, error)
            throw error
        }
    }

    /**
     * Get public URL for an object (assumes bucket is public)
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} objectName - Name/path of the object
     * @returns {string} Public URL
     *
     * @example
     * ```typescript
     * const url = minioClient.getPublicUrl('images', 'user/profile.jpg')
     * console.log('Public URL:', url)
     * ```
     */
    getPublicUrl(bucketName: string, objectName: string): string {
        return `${this.publicUrl}/${bucketName}/${objectName}`
    }

    /**
     * Set bucket policy (make bucket public or private)
     *
     * @param {string} bucketName - Name of the bucket
     * @param {string} policy - Policy JSON string
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * // Make bucket public for read
     * const policy = {
     *   Version: '2012-10-17',
     *   Statement: [{
     *     Effect: 'Allow',
     *     Principal: { AWS: ['*'] },
     *     Action: ['s3:GetObject'],
     *     Resource: [`arn:aws:s3:::${bucketName}/*`]
     *   }]
     * }
     * await minioClient.setBucketPolicy('images', JSON.stringify(policy))
     * ```
     */
    async setBucketPolicy(bucketName: string, policy: string): Promise<void> {
        try {
            await this.client.setBucketPolicy(bucketName, policy)
        } catch (error) {
            console.error(`Error setting bucket policy for "${bucketName}":`, error)
            throw error
        }
    }

    /**
     * Get raw MinIO client for advanced operations
     *
     * @returns {Minio.Client} Raw MinIO client
     *
     * @example
     * ```typescript
     * const client = minioClient.getRawClient()
     * // Use native MinIO methods
     * const buckets = await client.listBuckets()
     * ```
     */
    getRawClient(): Minio.Client {
        return this.client
    }
}

// Export singleton instance
let wrapperInstance: MinioClientWrapper | null = null

/**
 * Get MinIO client wrapper instance (Singleton)
 *
 * @returns {MinioClientWrapper} MinIO client wrapper
 *
 * @example
 * ```typescript
 * const minioClient = getMinioClient()
 * const url = await minioClient.uploadFile('bucket', 'file.jpg', buffer, 'image/jpeg')
 * ```
 */
export const getMinioClient = (): MinioClientWrapper => {
    if (!wrapperInstance) {
        wrapperInstance = new MinioClientWrapper()
    }
    return wrapperInstance
}

// Export types
export type {MinioConfig}
export {MinioClientWrapper}

