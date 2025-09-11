import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * AWS S3 Service for file operations
 */
export class AwsS3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'ampere-tickets-bucket';
    
    // Debug logging for Vercel
    console.log('AWS Configuration:', {
      bucketName: this.bucketName,
      region: process.env.AWS_REGION || 'ap-south-1',
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    });
    
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Upload a file to S3
   * @param file - File to upload
   * @param key - S3 object key (file path)
   * @param contentType - MIME type of the file
   */
  async uploadFile(file: File, key: string, contentType?: string): Promise<string> {
    try {
      console.log('Starting S3 upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        s3Key: key,
        bucketName: this.bucketName,
        region: process.env.AWS_REGION || 'ap-south-1',
        timestamp: new Date().toISOString()
      });

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Sanitize filename for S3 headers (remove invalid characters)
      const sanitizeFilename = (filename: string): string => {
        return filename
          .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII characters
          .replace(/[^\w\s.-]/g, '') // Keep only alphanumeric, spaces, dots, and hyphens
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/[^\w.-]/g, '') // Remove any remaining special characters except dots and hyphens
          .replace(/_{2,}/g, '_') // Replace multiple underscores with single underscore
          .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
          .substring(0, 100); // Limit length to prevent header size issues
      };

      const sanitizedOriginalName = sanitizeFilename(file.name);
      
      console.log('Filename sanitization:', {
        originalName: file.name,
        sanitizedName: sanitizedOriginalName,
        wasChanged: file.name !== sanitizedOriginalName
      });

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType || file.type,
        ContentDisposition: `attachment; filename="${sanitizedOriginalName}"`,
        Metadata: {
          originalName: sanitizedOriginalName,
          uploadedAt: new Date().toISOString(),
        },
      });

      console.log('Sending PutObjectCommand to S3...');
      await this.s3Client.send(command);
      console.log('S3 upload successful for key:', key);
      
      // Return the public URL
      const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
      console.log('Generated S3 URL:', url);
      return url;
    } catch (error) {
      console.error('S3 Upload Error Details:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode,
        errorName: (error as { name?: string })?.name,
        fileName: file.name,
        s3Key: key,
        bucketName: this.bucketName,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a presigned URL for file download
   * @param key - S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   */
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a presigned URL for file viewing (inline display)
   * @param key - S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   */
  async getViewUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentDisposition: 'inline', // This tells the browser to display instead of download
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating view URL:', error);
      throw new Error(`Failed to generate view URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file from S3
   * @param key - S3 object key
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a file exists in S3
   * @param key - S3 object key
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata from S3
   * @param key - S3 object key
   */
  async getFileMetadata(key: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
    metadata?: Record<string, string>;
  }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test S3 connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to list objects in the bucket (this will fail if credentials are wrong)
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: 'test-connection',
      });

      // This will fail, but it will tell us if credentials are valid
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      // If it's a "NoSuchKey" error, credentials are valid
      if (error instanceof Error && error.name === 'NoSuchKey') {
        return true;
      }
      // If it's an "AccessDenied" error, credentials are invalid
      if (error instanceof Error && error.name === 'AccessDenied') {
        return false;
      }
      // Other errors might be network issues
      console.error('S3 connection test error:', error);
      return false;
    }
  }
}
