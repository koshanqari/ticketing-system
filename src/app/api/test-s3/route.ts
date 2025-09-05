import { NextRequest, NextResponse } from 'next/server';
import { S3FileUploadService } from '@/lib/s3FileUpload';

/**
 * Test S3 connection and file upload
 */
export async function GET() {
  try {
    const s3Service = new S3FileUploadService();
    const isConnected = await s3Service.testConnection();
    
    return NextResponse.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'S3 connection successful' : 'S3 connection failed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('S3 test error:', error);
    return NextResponse.json({
      success: false,
      connected: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Test file upload to S3
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        message: 'No file provided',
      }, { status: 400 });
    }

    const s3Service = new S3FileUploadService();
    const result = await s3Service.uploadFile(file);
    
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: result,
    });
  } catch (error) {
    console.error('File upload test error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
