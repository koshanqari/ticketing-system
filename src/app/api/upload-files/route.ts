import { NextRequest, NextResponse } from 'next/server';
import { S3FileUploadService } from '@/lib/s3FileUpload';

/**
 * API route for uploading files to S3
 */
export async function POST(request: NextRequest) {
  console.log('Upload API called at:', new Date().toISOString());
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  
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
      allPresent: hasAwsCredentials,
      environment: process.env.NODE_ENV
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
    
    console.log('FormData processing:', {
      formDataKeys: Array.from(formData.keys()),
      filesCount: files.length,
      filesDetails: files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      }))
    });
    
    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No files provided',
      }, { status: 400 });
    }

    console.log(`Uploading ${files.length} files to S3...`);
    const s3Service = new S3FileUploadService();
    
    // Upload files - now optimized for single file uploads from frontend
    const results = [];
    for (let i = 0; i < files.length; i++) {
      console.log(`Uploading file ${i + 1}/${files.length}: ${files[i].name} (${(files[i].size / 1024).toFixed(1)} KB)`);
      try {
        const result = await s3Service.uploadFile(files[i]);
        results.push(result);
        console.log(`File ${i + 1} uploaded successfully:`, result.uuid);
      } catch (error) {
        console.error(`Failed to upload file ${i + 1}:`, error);
        throw new Error(`Failed to upload file ${files[i].name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
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
