import type { Metadata } from 'next'
import './globals.css'
import { AdminProvider } from '@/contexts/AdminContext'

export const metadata: Metadata = {
  title: 'Ticketing System',
  description: 'A comprehensive ticketing system for issue management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AdminProvider>
          <div className="min-h-screen bg-gray-50">
            {/* Main Content */}
            <main>
              {children}
            </main>
          </div>
        </AdminProvider>
      </body>
    </html>
  )
}
