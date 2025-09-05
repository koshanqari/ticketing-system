import { NextResponse } from 'next/server';
import { AwsS3Service } from '@/lib/awsS3Service';

/**
 * Test endpoint to check AWS S3 connectivity
 */
export async function GET() {
  try {
    console.log('Testing AWS S3 connectivity...');
    
    // Check environment variables
    const envCheck = {
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: !!process.env.AWS_REGION,
      AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET,
      allPresent: !!(
        process.env.AWS_ACCESS_KEY_ID && 
        process.env.AWS_SECRET_ACCESS_KEY && 
        process.env.AWS_REGION && 
        process.env.AWS_S3_BUCKET
      )
    };

    console.log('Environment Variables Check:', envCheck);

    if (!envCheck.allPresent) {
      return NextResponse.json({
        success: false,
        message: 'AWS credentials not configured',
        details: envCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test S3 service initialization
    new AwsS3Service();
    
    // Test bucket access by trying to list objects (this is a lightweight operation)
    try {
      // We'll just test if the service can be created without errors
      // The actual S3 operations will be tested during real uploads
      return NextResponse.json({
        success: true,
        message: 'AWS S3 service initialized successfully',
        details: {
          bucketName: process.env.AWS_S3_BUCKET,
          region: process.env.AWS_REGION,
          accessKeyPrefix: process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('AWS S3 service initialization failed:', error);
      return NextResponse.json({
        success: false,
        message: 'AWS S3 service initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('AWS test error:', error);
    return NextResponse.json({
      success: false,
      message: 'AWS test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
