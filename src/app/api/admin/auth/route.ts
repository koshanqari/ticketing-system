import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseAvailable } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is available
    if (!isSupabaseAvailable()) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const { loginId, password } = await request.json()

    if (!loginId || !password) {
      return NextResponse.json(
        { error: 'Login ID and password are required' },
        { status: 400 }
      )
    }

    // Check if the admin exists in the admin table
    const { data: admin, error } = await supabase!
      .from('admins')
      .select('id, login_id, password_hash, is_active')
      .eq('login_id', loginId)
      .single()

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    if (!admin.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 401 }
      )
    }

    // For basic implementation, we'll do a simple password check
    // In production, you should use proper password hashing (bcrypt, etc.)
    // For now, we'll assume the password is stored as plain text (NOT recommended for production)
    
    // TODO: Replace this with proper password verification
    if (admin.password_hash !== password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Return success with admin ID
    return NextResponse.json({
      success: true,
      adminId: admin.id,
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Admin authentication error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
