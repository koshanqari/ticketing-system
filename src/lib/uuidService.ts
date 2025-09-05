import { v4 as uuidv4 } from 'uuid';

/**
 * UUID Service for generating unique identifiers
 */
export class UuidService {
  /**
   * Generate a new UUID v4
   */
  static generate(): string {
    return uuidv4();
  }

  /**
   * Generate a UUID with a custom prefix
   * @param prefix - Custom prefix for the UUID
   */
  static generateWithPrefix(prefix: string): string {
    return `${prefix}-${uuidv4()}`;
  }

  /**
   * Generate a UUID for file uploads
   * @param originalName - Original file name
   */
  static generateForFile(originalName: string): string {
    const extension = this.getFileExtension(originalName);
    return `${uuidv4()}${extension ? `.${extension}` : ''}`;
  }

  /**
   * Get file extension from filename
   * @param filename - File name
   */
  private static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1).toLowerCase() : '';
  }

  /**
   * Validate if a string is a valid UUID
   * @param uuid - String to validate
   */
  static isValid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
