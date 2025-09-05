import { NextResponse } from 'next/server';

/**
 * Simple test endpoint to check response handling
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test response working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Test POST response working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}
