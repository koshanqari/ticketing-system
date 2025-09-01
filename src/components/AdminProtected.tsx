'use client'

import { useState, useEffect } from 'react'
import { isAdminProtectionEnabled } from '@/config/admin'
import AdminLogin from './AdminLogin'

interface AdminProtectedProps {
  children: React.ReactNode
}

export default function AdminProtected({ children }: AdminProtectedProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if admin protection is enabled
    if (!isAdminProtectionEnabled()) {
      // No protection needed, show content immediately
      setIsAuthenticated(true)
      setIsLoading(false)
      return
    }

    // Check if user is already authenticated (from localStorage)
    const adminId = localStorage.getItem('adminId')
    if (adminId) {
      setIsAuthenticated(true)
      setShowLogin(false)
    } else {
      setShowLogin(true)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (adminId: string) => {
    // Store admin ID in localStorage for session persistence
    localStorage.setItem('adminId', adminId)
    setIsAuthenticated(true)
    setShowLogin(false)
  }



  const handleCancel = () => {
    // Redirect to home page if login is cancelled
    window.location.href = '/'
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If admin protection is disabled, show content immediately
  if (!isAdminProtectionEnabled()) {
    return <>{children}</>
  }

  // If not authenticated, show login
  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLogin={handleLogin}
        onCancel={handleCancel}
        isOpen={showLogin}
      />
    )
  }

  // If authenticated, show protected content
  return (
    <div>
      {children}
    </div>
  )
}
