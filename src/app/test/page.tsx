'use client'

import { useState } from 'react'
import { ticketService } from '@/lib/ticketService'
import { dropdownService } from '@/lib/dropdownService'

export default function TestPage() {
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testBasicFunctionality = () => {
    setTestResult('✅ Basic React functionality is working')
  }

  const testEnvironmentVariables = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      setTestResult('❌ Supabase environment variables not found')
      return
    }
    
    setTestResult('✅ Supabase environment variables found')
  }

  const testDatabaseConnection = async () => {
    setIsLoading(true)
    setTestResult('🔄 Testing database connection...')
    
    try {
      // Test if Supabase environment variables are available
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        setTestResult('❌ Supabase environment variables not found')
        return
      }
      
      // Test actual database connection
      const tickets = await ticketService.getAllTickets()
      setTestResult(`✅ Database connection successful! Found ${tickets.length} tickets`)
      
    } catch (error) {
      console.error('Database test error:', error)
      setTestResult(`❌ Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testDropdownService = async () => {
    setIsLoading(true)
    setTestResult('🔄 Testing dropdown service...')
    
    try {
      const dropdowns = await dropdownService.getAllDropdownOptions()
      const dropdownCount = Object.keys(dropdowns).length
      setTestResult(`✅ Dropdown service working! Found ${dropdownCount} dropdown types`)
      
    } catch (error) {
      console.error('Dropdown service test error:', error)
      setTestResult(`❌ Dropdown service failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testAllServices = async () => {
    setIsLoading(true)
    setTestResult('🔄 Testing all services...')
    
    try {
      // Test environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        setTestResult('❌ Supabase environment variables not found')
        return
      }
      
      // Test database connection
      const tickets = await ticketService.getAllTickets()
      
      // Test dropdown service
      const dropdowns = await dropdownService.getAllDropdownOptions()
      
      setTestResult(`✅ All services working! Database: ${tickets.length} tickets, Dropdowns: ${Object.keys(dropdowns).length} types`)
      
    } catch (error) {
      console.error('All services test error:', error)
      setTestResult(`❌ Service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">System Test Page</h1>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Tests</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={testBasicFunctionality}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Test Basic React
            </button>
            
            <button
              onClick={testEnvironmentVariables}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Test Environment
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Tests</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={testDatabaseConnection}
              disabled={isLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Test Database
            </button>
            
            <button
              onClick={testDropdownService}
              disabled={isLoading}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              Test Dropdowns
            </button>
            
            <button
              onClick={testAllServices}
              disabled={isLoading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 md:col-span-2"
            >
              Test All Services
            </button>
          </div>
          
          {testResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-gray-900">{testResult}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Environment Check</h2>
          
          <div className="space-y-2 text-sm">
            <p><strong>Node Environment:</strong> {process.env.NODE_ENV}</p>
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not Set'}</p>
            <p><strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set'}</p>
            <p><strong>CORS Proxy:</strong> {process.env.NEXT_PUBLIC_CORS_PROXY ? '✅ Set' : '❌ Not Set'}</p>
          </div>
          
          {process.env.NEXT_PUBLIC_SUPABASE_URL && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
