'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Phone, FileText, Calendar, Clock, User, AlertCircle, CheckCircle, MessageSquare, Image, Video, Download, Eye, File, Plus } from 'lucide-react'
import { Ticket, S3Attachment } from '@/types'
import { ticketService } from '@/lib/ticketService'
import { cn } from '@/lib/utils'

export default function StatusPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'phone' | 'ticket_id'>('phone')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format date for resolution estimate
  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-800'
      case 'Ongoing':
        return 'bg-orange-100 text-orange-800'
      case 'Closed':
        return 'bg-gray-100 text-gray-800'
      case 'Resolved':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-purple-100 text-purple-800'
    }
  }

  // Get disposition color
  const getDispositionColor = (disposition: string) => {
    switch (disposition) {
      case 'New':
        return 'bg-blue-100 text-blue-800'
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'Resolved':
        return 'bg-green-100 text-green-800'
      case 'Dropped':
        return 'bg-red-100 text-red-800'
      case 'Parked':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Handle search type change
  const handleSearchTypeChange = (type: 'phone' | 'ticket_id') => {
    setSearchType(type)
    setSearchQuery('')
    setTickets([])
    setSearched(false)
    setError('')
  }

  // Fetch download URLs for attachments
  const fetchDownloadUrls = async (tickets: Ticket[]): Promise<Ticket[]> => {
    try {
      const updatedTickets = await Promise.all(
        tickets.map(async (ticket) => {
          if (ticket.attachments && ticket.attachments.length > 0) {
            try {
              const response = await fetch('/api/get-download-urls', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ attachments: ticket.attachments }),
              })

              if (response.ok) {
                const result = await response.json()
                if (result.success && result.data) {
                  return {
                    ...ticket,
                    attachments: result.data
                  }
                }
              }
            } catch (error) {
              console.error('Failed to fetch download URLs for ticket:', ticket.ticket_id, error)
            }
          }
          return ticket
        })
      )
      return updatedTickets
    } catch (error) {
      console.error('Error fetching download URLs:', error)
      return tickets
    }
  }

  // Handle search by phone or ticket ID
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setError(`Please enter a ${searchType === 'phone' ? 'phone number' : 'ticket ID'}`)
      return
    }

    setLoading(true)
    setError('')
    setSearched(true)

    try {
      let userTickets: Ticket[] = []
      
      if (searchType === 'phone') {
        userTickets = await ticketService.getTicketsByPhone(searchQuery.trim())
      } else {
        const ticket = await ticketService.getTicketByTicketId(searchQuery.trim())
        userTickets = ticket ? [ticket] : []
      }
      
      // Fetch download URLs for attachments
      const ticketsWithUrls = await fetchDownloadUrls(userTickets)
      setTickets(ticketsWithUrls)
    } catch (err) {
      setError('Failed to fetch tickets. Please try again.')
      console.error('Error fetching tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get file icon based on file type
  const getFileIcon = (attachment: S3Attachment) => {
    if (attachment.type?.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-600" />
    } else if (attachment.type?.startsWith('video/')) {
      return <Video className="w-5 h-5 text-purple-600" />
    } else if (attachment.type?.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-600" />
    } else if (attachment.type?.includes('word') || attachment.type?.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-600" />
    } else if (attachment.type?.includes('excel') || attachment.type?.includes('spreadsheet')) {
      return <FileText className="w-5 h-5 text-green-600" />
    } else {
      return <File className="w-5 h-5 text-gray-600" />
    }
  }

  // Get file type color
  const getFileTypeColor = (attachment: S3Attachment) => {
    if (attachment.type?.startsWith('image/')) {
      return 'bg-blue-50 border-blue-200 text-blue-700'
    } else if (attachment.type?.startsWith('video/')) {
      return 'bg-purple-50 border-purple-200 text-purple-700'
    } else if (attachment.type?.includes('pdf')) {
      return 'bg-red-50 border-red-200 text-red-700'
    } else if (attachment.type?.includes('word') || attachment.type?.includes('document')) {
      return 'bg-blue-50 border-blue-200 text-blue-700'
    } else if (attachment.type?.includes('excel') || attachment.type?.includes('spreadsheet')) {
      return 'bg-green-50 border-green-200 text-green-700'
    } else {
      return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  // Handle file download/view
  const handleFileAction = async (attachment: S3Attachment, action: 'view' | 'download') => {
    try {
      let url: string
      
      // Determine the best URL to use - prioritize viewUrl for viewing, downloadUrl for downloading
      if (action === 'view' && attachment.viewUrl) {
        url = attachment.viewUrl
      } else if (action === 'download' && attachment.downloadUrl) {
        url = attachment.downloadUrl
      } else if (attachment.s3Url) {
        url = attachment.s3Url
      } else {
        console.error('No valid URL found for attachment:', attachment)
        alert('Unable to access this file. Please try again later.')
        return
      }

      console.log('File action:', { action, url, attachment, s3Key: attachment.s3Key })

      if (action === 'view' && (attachment.type?.startsWith('image/') || attachment.type?.startsWith('video/'))) {
        // Open media files in new tab for viewing
        const newWindow = window.open(url, '_blank')
        if (!newWindow) {
          // Fallback if popup is blocked
          window.location.href = url
        }
      } else {
        // Download files - try to trigger download
        try {
          const link = document.createElement('a')
          link.href = url
          link.download = attachment.originalName
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          
          // Add to DOM temporarily to trigger download
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } catch (downloadError) {
          console.error('Download failed, trying direct navigation:', downloadError)
          // Fallback to direct navigation
          window.open(url, '_blank')
        }
      }
    } catch (error) {
      console.error('Error handling file action:', error)
      alert('Unable to open this file. Please try again later.')
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Navigation Bar */}
        <div className="bg-white rounded-t-2xl shadow-sm border-b px-6 py-4 mb-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Support App</h2>
            <Link
              href="/"
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Ticket</span>
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white px-6 py-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Check Ticket Status</h1>
          <p className="text-lg text-gray-600">Enter your phone number to view all your tickets</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-b-2xl shadow-xl p-6 md:p-8 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search By
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSearchTypeChange('phone')}
                  className={cn(
                    "flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border transition-colors",
                    searchType === 'phone'
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Phone Number</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchTypeChange('ticket_id')}
                  className={cn(
                    "flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border transition-colors",
                    searchType === 'ticket_id'
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Ticket ID</span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-2">
                {searchType === 'phone' ? 'Phone Number' : 'Ticket ID'}
              </label>
              <div className="relative">
                {searchType === 'phone' ? (
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                ) : (
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                )}
                <input
                  type={searchType === 'phone' ? 'tel' : 'text'}
                  id="searchQuery"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchType === 'phone' ? 'Enter your phone number' : 'Enter ticket ID (e.g., A-250124-001)'}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Search Tickets
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Results */}
        {searched && (
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Tickets Found</h3>
                <p className="text-gray-600">
                  {searchType === 'phone' 
                    ? 'No tickets found for this phone number.' 
                    : 'No ticket found with this ticket ID.'}
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {searchType === 'phone' ? `Your Tickets (${tickets.length})` : 'Ticket Details'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {searchType === 'phone' ? 'Latest tickets appear first' : 'Single ticket view'}
                  </p>
                </div>

                {tickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
                    {/* Ticket Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">{ticket.ticket_id}</h3>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Created: {formatDate(ticket.created_time)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className={cn(
                          "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                          getStatusColor(ticket.status)
                        )}>
                          {ticket.status}
                        </span>
                        {ticket.disposition && (
                          <span className={cn(
                            "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                            getDispositionColor(ticket.disposition)
                          )}>
                            {ticket.disposition}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{ticket.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{ticket.phone}</span>
                      </div>
                    </div>

                    {/* Issue Details */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Issue Type:</span>
                        <span className="text-sm text-gray-900 ml-2">{ticket.issue_type_l2 || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Description:</span>
                        <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{ticket.description}</p>
                      </div>
                    </div>

                    {/* Attachments */}
                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 mb-3 block">
                          Attachments ({ticket.attachments.length})
                        </span>
                        <div className="space-y-2">
                          {ticket.attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                  getFileTypeColor(attachment)
                                )}
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  {getFileIcon(attachment)}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {attachment.originalName}
                                    </p>
                                    <p className="text-xs opacity-75">
                                      {formatFileSize(attachment.size)}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-1 ml-2">
                                  {(attachment.type?.startsWith('image/') || attachment.type?.startsWith('video/')) && (
                                    <button
                                      onClick={() => handleFileAction(attachment, 'view')}
                                      className="p-1.5 rounded-md hover:bg-white/50 transition-colors"
                                      title="View file"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleFileAction(attachment, 'download')}
                                    className="p-1.5 rounded-md hover:bg-white/50 transition-colors"
                                    title="Download file"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* External Remarks */}
                    {ticket.ext_remarks && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div>
                            <span className="text-sm font-medium text-blue-900">Response from Support:</span>
                            <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">{ticket.ext_remarks}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resolution Details */}
                    <div className="space-y-2 pt-2 border-t border-gray-200">
                      {ticket.resolved_time && (
                        <div className="flex items-center space-x-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">Resolved on:</span>
                          <span className="text-gray-900 font-medium">{formatDate(ticket.resolved_time)}</span>
                        </div>
                      )}
                      
                      {ticket.resolution_estimate && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="text-gray-700">Estimated resolution:</span>
                          <span className="text-gray-900 font-medium">{formatDateOnly(ticket.resolution_estimate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
