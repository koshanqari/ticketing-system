import type { Metadata } from 'next'
import './globals.css'

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
        <div className="min-h-screen bg-gray-50">
          {/* Main Content */}
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
