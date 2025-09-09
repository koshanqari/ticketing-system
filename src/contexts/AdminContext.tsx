'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Assignee {
  id: string
  name: string
  department: string
  is_active: boolean
}

interface Admin {
  id: string
  loginId: string
  assigneeId: string | null
  assignee: Assignee | null
}

interface AdminContextType {
  admin: Admin | null
  setAdmin: (admin: Admin | null) => void
  clearAdmin: () => void
  isLoggedIn: boolean
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdminState] = useState<Admin | null>(null)

  // Load admin from localStorage on mount
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin')
    if (storedAdmin) {
      try {
        setAdminState(JSON.parse(storedAdmin))
      } catch (error) {
        console.error('Error parsing stored admin data:', error)
        localStorage.removeItem('admin')
      }
    }
  }, [])

  const setAdmin = (adminData: Admin | null) => {
    setAdminState(adminData)
    if (adminData) {
      localStorage.setItem('admin', JSON.stringify(adminData))
    } else {
      localStorage.removeItem('admin')
    }
  }

  const clearAdmin = () => {
    setAdminState(null)
    localStorage.removeItem('admin')
  }

  const isLoggedIn = admin !== null

  return (
    <AdminContext.Provider value={{ admin, setAdmin, clearAdmin, isLoggedIn }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
