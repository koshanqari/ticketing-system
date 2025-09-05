import { NextRequest, NextResponse } from 'next/server';
import { S3FileUploadService } from '@/lib/s3FileUpload';

/**
 * API route for uploading files to S3
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No files provided',
      }, { status: 400 });
    }

    const s3Service = new S3FileUploadService();
    const results = await s3Service.uploadFiles(files);
    
    return NextResponse.json({
      success: true,
      message: 'Files uploaded successfully',
      data: results,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
