import { AwsS3Service } from './awsS3Service';
import { UuidService } from './uuidService';
import { S3Attachment } from '@/types';

export interface FileUploadResult {
  uuid: string;
  originalName: string;
  s3Key: string;
  s3Url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface FileUploadOptions {
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
}

/**
 * S3-based file upload service
 */
export class S3FileUploadService {
  private s3Service: AwsS3Service;
  private defaultOptions: FileUploadOptions = {
    maxFileSize: 50 * 1024 * 1024, // 50MB (increased for videos)
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxFiles: 5,
  };

  constructor() {
    this.s3Service = new AwsS3Service();
  }

  /**
   * Upload a single file to S3
   * @param file - File to upload
   * @param options - Upload options
   */
  async uploadFile(file: File, options: FileUploadOptions = {}): Promise<FileUploadResult> {
    const opts = { ...this.defaultOptions, ...options };

    // Validate file
    this.validateFile(file, opts);

    // Generate UUID for the file
    const uuid = UuidService.generate();
    const s3Key = `uploads/${uuid}`;

    try {
      // Upload to S3
      const s3Url = await this.s3Service.uploadFile(file, s3Key, file.type);

      // Return file metadata
      return {
        uuid,
        originalName: file.name,
        s3Key,
        s3Url,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple files to S3
   * @param files - Array of files to upload
   * @param options - Upload options
   */
  async uploadFiles(files: File[], options: FileUploadOptions = {}): Promise<FileUploadResult[]> {
    const opts = { ...this.defaultOptions, ...options };

    // Validate files
    if (files.length > opts.maxFiles!) {
      throw new Error(`Maximum ${opts.maxFiles} files allowed`);
    }

    // Upload files in parallel
    const uploadPromises = files.map(file => this.uploadFile(file, opts));
    
    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading files:', error);
      throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get download URL for a file
   * @param s3Key - S3 object key
   * @param expiresIn - URL expiration time in seconds
   */
  async getDownloadUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await this.s3Service.getDownloadUrl(s3Key, expiresIn);
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw new Error(`Failed to get download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get presigned download URLs for multiple files
   * @param attachments - Array of attachment objects
   * @param expiresIn - URL expiration time in seconds
   */
  async getDownloadUrls(attachments: S3Attachment[], expiresIn: number = 3600): Promise<S3Attachment[]> {
    try {
      console.log('Getting download URLs for attachments:', attachments);
      
      const urls = await Promise.all(
        attachments.map(async (attachment) => {
          console.log('Processing attachment:', attachment);
          
          // Parse attachment if it's a JSON string
          let parsedAttachment: S3Attachment = attachment;
          if (typeof attachment === 'string') {
            try {
              parsedAttachment = JSON.parse(attachment) as S3Attachment;
              console.log('Parsed attachment from string:', parsedAttachment);
            } catch (e) {
              console.error('Failed to parse attachment string:', e);
              return {
                uuid: '',
                originalName: 'Unknown File',
                s3Key: '',
                s3Url: attachment,
                size: 0,
                type: 'unknown',
                uploadedAt: new Date().toISOString(),
                downloadUrl: attachment, // Fallback to original string
                viewUrl: attachment // Fallback to original string
              } as S3Attachment;
            }
          }
          
          // Check if s3Key exists, if not, try to construct it from s3Url
          let s3Key = parsedAttachment.s3Key;
          if (!s3Key && parsedAttachment.s3Url) {
            // Extract key from S3 URL
            const urlParts = parsedAttachment.s3Url.split('/');
            s3Key = urlParts.slice(3).join('/'); // Remove bucket name and region
            console.log('Extracted s3Key from URL:', s3Key);
          }
          
          if (!s3Key) {
            console.error('No s3Key found for attachment:', parsedAttachment);
            return {
              ...parsedAttachment,
              downloadUrl: parsedAttachment.s3Url, // Fallback to original URL
              viewUrl: parsedAttachment.s3Url // Fallback to original URL
            } as S3Attachment;
          }
          
          // Generate both download and view URLs
          const [downloadUrl, viewUrl] = await Promise.all([
            this.getDownloadUrl(s3Key, expiresIn),
            this.getViewUrl(s3Key, expiresIn)
          ]);
          
          return {
            ...parsedAttachment,
            downloadUrl,
            viewUrl
          } as S3Attachment;
        })
      );
      return urls;
    } catch (error) {
      console.error('Error getting download URLs:', error);
      throw new Error(`Failed to get download URLs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a presigned URL for file viewing (inline display)
   * @param s3Key - S3 object key
   * @param expiresIn - URL expiration time in seconds
   */
  async getViewUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      console.log('Getting view URL for s3Key:', s3Key);
      return await this.s3Service.getViewUrl(s3Key, expiresIn);
    } catch (error) {
      console.error('Error getting view URL:', error);
      throw new Error(`Failed to get view URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file from S3
   * @param s3Key - S3 object key
   */
  async deleteFile(s3Key: string): Promise<void> {
    try {
      await this.s3Service.deleteFile(s3Key);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete multiple files from S3
   * @param s3Keys - Array of S3 object keys
   */
  async deleteFiles(s3Keys: string[]): Promise<void> {
    try {
      const deletePromises = s3Keys.map(key => this.deleteFile(key));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting files:', error);
      throw new Error(`Failed to delete files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a file before upload
   * @param file - File to validate
   * @param options - Validation options
   */
  private validateFile(file: File, options: FileUploadOptions): void {
    // Check file size
    if (file.size > options.maxFileSize!) {
      throw new Error(`File size must be less than ${this.formatFileSize(options.maxFileSize!)}`);
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Check file name
    if (!file.name || file.name.trim() === '') {
      throw new Error('File name is required');
    }
  }

  /**
   * Format file size in human-readable format
   * @param bytes - File size in bytes
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Test S3 connection
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.s3Service.testConnection();
    } catch (error) {
      console.error('S3 connection test failed:', error);
      return false;
    }
  }
}
