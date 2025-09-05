import { supabase, isSupabaseAvailable } from './supabase'
import { FileUploadProgress } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/avi', 'video/mov', 'video/wmv']

export class FileUploadService {
  private bucketName = 'ticket-attachments'

  // Validate file before upload
  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB` }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'File type not supported. Please upload images or videos.' }
    }

    return { valid: true }
  }

  // Upload single file to Supabase Storage
  async uploadFile(file: File, ticketId: string): Promise<string> {
    try {
      // Check if Supabase is available
      if (!isSupabaseAvailable()) {
        // Simulate upload for development
        await new Promise(resolve => setTimeout(resolve, 1000))
        return `https://example.com/simulated-upload/${ticketId}/${file.name}`
      }

      // Create unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${ticketId}/${timestamp}_${Math.random().toString(36).substring(2)}.${fileExtension}`

      // Upload to Supabase Storage
      const { error } = await supabase!.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase!.storage
        .from(this.bucketName)
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error) {
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Upload multiple files with progress tracking
  async uploadMultipleFiles(files: File[], ticketId: string, onProgress?: (progress: FileUploadProgress[]) => void): Promise<string[]> {
    const uploadPromises = files.map(async (file) => {
      const progress: FileUploadProgress = {
        file,
        progress: 0,
        status: 'uploading'
      }

      try {
        // Validate file first
        const validation = this.validateFile(file)
        if (!validation.valid) {
          progress.status = 'error'
          progress.error = validation.error
          onProgress?.([...Array(files.length).fill(progress)])
          return null
        }

        // Simulate progress (Supabase doesn't provide real-time progress)
        const progressInterval = setInterval(() => {
          progress.progress = Math.min(progress.progress + Math.random() * 20, 90)
          onProgress?.([...Array(files.length).fill(progress)])
        }, 200)

        // Upload file
        const fileUrl = await this.uploadFile(file, ticketId)
        
        clearInterval(progressInterval)
        progress.progress = 100
        progress.status = 'completed'
        onProgress?.([...Array(files.length).fill(progress)])

        return fileUrl
      } catch (error) {
        progress.status = 'error'
        progress.error = error instanceof Error ? error.message : 'Upload failed'
        onProgress?.([...Array(files.length).fill(progress)])
        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    return results.filter((url): url is string => url !== null)
  }

  // Delete file from Supabase Storage
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Check if Supabase is available
      if (!isSupabaseAvailable()) {
        console.log('Simulating file deletion:', fileUrl)
        return
      }

      const fileName = fileUrl.split('/').pop()
      if (!fileName) throw new Error('Invalid file URL')

      const { error } = await supabase!.storage
        .from(this.bucketName)
        .remove([fileName])

      if (error) {
        throw new Error(`Delete failed: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get file preview URL (for images)
  getPreviewUrl(fileUrl: string): string {
    return fileUrl
  }

  // Check if file is an image
  isImage(file: File): boolean {
    return file.type.startsWith('image/')
  }

  // Check if file is a video
  isVideo(file: File): boolean {
    return file.type.startsWith('video/')
  }
}

export const fileUploadService = new FileUploadService()
