import { NextRequest, NextResponse } from 'next/server';
import { S3FileUploadService } from '@/lib/s3FileUpload';

/**
 * API route for uploading files to S3
 */
export async function POST(request: NextRequest) {
  try {
    // Check if AWS credentials are available
    const hasAwsCredentials = !!(
      process.env.AWS_ACCESS_KEY_ID && 
      process.env.AWS_SECRET_ACCESS_KEY && 
      process.env.AWS_REGION && 
      process.env.AWS_S3_BUCKET
    );

    console.log('AWS Credentials Check:', {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasRegion: !!process.env.AWS_REGION,
      hasBucket: !!process.env.AWS_S3_BUCKET,
      allPresent: hasAwsCredentials
    });

    if (!hasAwsCredentials) {
      return NextResponse.json({
        success: false,
        message: 'AWS credentials not configured. Please check environment variables.',
        details: 'Missing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, or AWS_S3_BUCKET'
      }, { status: 500 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No files provided',
      }, { status: 400 });
    }

    console.log(`Uploading ${files.length} files to S3...`);
    const s3Service = new S3FileUploadService();
    const results = await s3Service.uploadFiles(files);
    
    console.log('Upload successful:', results.length, 'files uploaded');
    return NextResponse.json({
      success: true,
      message: 'Files uploaded successfully',
      data: results,
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    // Return a more detailed error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : 'No stack trace available';
    
    return NextResponse.json({
      success: false,
      message: `File upload failed: ${errorMessage}`,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
