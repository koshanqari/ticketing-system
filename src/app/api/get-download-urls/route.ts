import { NextRequest, NextResponse } from 'next/server';
import { S3FileUploadService } from '@/lib/s3FileUpload';

/**
 * API route for getting presigned download URLs for attachments
 */
export async function POST(request: NextRequest) {
  try {
    const { attachments } = await request.json();
    
    if (!attachments || !Array.isArray(attachments)) {
      return NextResponse.json({
        success: false,
        message: 'Attachments array is required',
      }, { status: 400 });
    }

    const s3Service = new S3FileUploadService();
    const attachmentsWithUrls = await s3Service.getDownloadUrls(attachments);
    
    return NextResponse.json({
      success: true,
      message: 'Download URLs generated successfully',
      data: attachmentsWithUrls,
    });
  } catch (error) {
    console.error('Get download URLs error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
