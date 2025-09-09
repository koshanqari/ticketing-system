'use client'

import { useState, useEffect } from 'react'
import { Search, BarChart3, CheckCircle, Clock, FileText, Save, X, ChevronDown, Calendar, Image, Video } from 'lucide-react'
import { Ticket, Assignee, DropdownOption, IssueTypeL1, Status, S3Attachment } from '@/types'
import { ticketService } from '@/lib/ticketService'
import { dropdownService } from '@/lib/dropdownService'
import { dispositionWhatsappService } from '@/lib/dispositionWhatsappService'
import { cn } from '@/lib/utils'
import AdminProtected from '@/components/AdminProtected'
import SubmissionForm from '@/components/SubmissionForm'
import { useAdmin } from '@/contexts/AdminContext'


export default function AdminPanel() {
  const { admin } = useAdmin()
  
  // Status color mapping function
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-700'
      case 'Ongoing':
        return 'bg-orange-600'
      case 'Closed':
        return 'bg-gray-600'
      // Legacy status colors
      case 'Progress':
        return 'bg-blue-600'
      case 'Resolved':
        return 'bg-green-600'
      case 'Parked':
        return 'bg-yellow-600'
      case 'Dropped':
        return 'bg-red-600'
      default:
        return 'bg-purple-600' // Fallback color
    }
  }

  // Column width configuration - easily adjustable here
  // To change column widths, simply modify the values below
  // All content will automatically wrap to next line if it exceeds the column width
  const columnWidths = {
    status: '100px',        // Status + Disposition badges
    priority: '100px',       // Priority badge only
    ticketId: '130px',      // Ticket ID format (A-ddmmyy-num)
    issueType: '130px',     // Issue Type L1 + L2
    time: '130px',          // Created + Resolved time
    userDetails: '200px',   // Name + Phone + Designation + Email
    panel: '120px',         // Panel name
    description: '200px',   // Description (75 chars + "...")
    remarks: '200px',       // Remarks (75 chars + "...")
    attachment: '130px',    // File icons + count
    assignedTo: '150px'     // Assignee name + department
  }

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [dropdownOptions, setDropdownOptions] = useState<Record<string, DropdownOption[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalSuccess, setModalSuccess] = useState(false)
  const [attachmentsWithUrls, setAttachmentsWithUrls] = useState<S3Attachment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    panel: '',
    designation: '',
    issue_type_l1: '',
    issue_type_l2: '',
    disposition: '',
    assigned_to: admin?.assigneeId || ''
  })
  
  // Sorting state
  const [sortBy, setSortBy] = useState('created_time')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [isClient, setIsClient] = useState(false)
  
  // Date dropdown state
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  // Admin info state
  const [adminLoginId, setAdminLoginId] = useState<string>('')
  const [isLoadingAdminInfo, setIsLoadingAdminInfo] = useState(false)
  
  // Self-raise modal state
  const [showSelfRaiseModal, setShowSelfRaiseModal] = useState(false)
  
  // Initialize client-side state to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Update filters when admin context changes (auto-select admin's assignee)
  useEffect(() => {
    if (admin?.assigneeId) {
      setFilters(prev => ({
        ...prev,
        assigned_to: admin.assigneeId || ''
      }))
    }
  }, [admin?.assigneeId])

  // Helper functions for date calculations (only run on client)
  const getToday = () => isClient ? new Date().toISOString().split('T')[0] : ''
  const getYesterday = () => isClient ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] : ''
  const getLast7Days = () => isClient ? new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : ''
  const getLast30Days = () => isClient ? new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : ''
  const getLastYear = () => isClient ? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : ''
  
  // Helper function for date formatting (only run on client)
  const formatDate = (dateString: string) => {
    if (!isClient || !dateString) return dateString
    return new Date(dateString).toLocaleDateString()
  }
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showDateDropdown && !target.closest('.date-dropdown')) {
        setShowDateDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDateDropdown])

  // Load admin info on component mount
  useEffect(() => {
    const adminId = localStorage.getItem('adminId')
    
    if (adminId) {
      setIsLoadingAdminInfo(true)
      
      // Fetch admin details to get the actual login_id
      const fetchAdminDetails = async () => {
        try {
          const response = await fetch('/api/admin/details', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ adminId }),
          })
          
          if (response.ok) {
            const data = await response.json()
            setAdminLoginId(data.loginId)
          } else {
            console.error('Failed to fetch admin details:', response.status)
            // Fallback to showing the UUID
            setAdminLoginId(adminId)
          }
        } catch (error) {
          console.error('Error fetching admin details:', error)
          // Fallback to showing the UUID
          setAdminLoginId(adminId)
        } finally {
          setIsLoadingAdminInfo(false)
        }
      }
      
      fetchAdminDetails()
    } else {
      setIsLoadingAdminInfo(false)
    }
  }, [])

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading admin panel data...')
        
        // Check if Supabase is available first
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          throw new Error('Supabase environment variables not configured')
        }
        
        const [ticketsData, dropdownData, assigneesData] = await Promise.all([
          ticketService.getAllTickets(),
          dropdownService.getAllDropdownOptions(),
          ticketService.getAllAssignees()
        ])
        
        console.log('Data loaded successfully:', { 
          tickets: ticketsData.length, 
          dropdowns: Object.keys(dropdownData).length,
          assignees: assigneesData.length 
        })
        
        setTickets(ticketsData)
        setDropdownOptions(dropdownData)
        setAssignees(assigneesData)
      } catch (error) {
        console.error('Failed to load admin panel data:', error)
        // Set empty data to prevent infinite loading
        setTickets([])
        setDropdownOptions({})
        setAssignees([])
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Filter tickets based on search, filters, and date range
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.email && ticket.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ticket.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.panel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.issue_type_l1 && ticket.issue_type_l1.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ticket.issue_type_l2 && ticket.issue_type_l2.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilters = 
      (!filters.status || ticket.status === filters.status) &&
      (!filters.priority || ticket.priority === filters.priority) &&
      (!filters.panel || ticket.panel === filters.panel) &&
      (!filters.designation || ticket.designation === filters.designation) &&
      (!filters.issue_type_l1 || ticket.issue_type_l1 === filters.issue_type_l1) &&
      (!filters.issue_type_l2 || ticket.issue_type_l2 === filters.issue_type_l2) &&
      (!filters.disposition || ticket.disposition === filters.disposition) &&
      (!filters.assigned_to || ticket.assigned_to_id === filters.assigned_to)
    
    // Filter by date range if dates are selected
    let matchesDateRange = true
    if (dateRange.startDate && dateRange.endDate) {
      const ticketDate = new Date(ticket.created_time)
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      endDate.setHours(23, 59, 59, 999) // Include the entire end date
      matchesDateRange = ticketDate >= startDate && ticketDate <= endDate
    }

    return matchesSearch && matchesFilters && matchesDateRange
  })

  // Sort the filtered tickets
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let aValue: number | string
    let bValue: number | string
    
    switch (sortBy) {
      case 'created_time':
        aValue = new Date(a.created_time).getTime()
        bValue = new Date(b.created_time).getTime()
        break
      case 'resolved_time':
        aValue = a.resolved_time ? new Date(a.resolved_time).getTime() : 0
        bValue = b.resolved_time ? new Date(b.resolved_time).getTime() : 0
        break
      case 'ticket_id':
        aValue = a.ticket_id
        bValue = b.ticket_id
        break
      default:
        aValue = new Date(a.created_time).getTime()
        bValue = new Date(b.created_time).getTime()
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Pagination logic
  const totalTickets = sortedTickets.length
  const totalPages = Math.ceil(totalTickets / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTickets = sortedTickets.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filters, dateRange, itemsPerPage])

  // Calculate analytics based on assignee filter and date range (not other filters)
  const analyticsTickets = tickets.filter(ticket => {
    // Filter by assignee
    const matchesAssignee = !filters.assigned_to || ticket.assigned_to_id === filters.assigned_to
    
    // Filter by date range if dates are selected
    let matchesDateRange = true
    if (dateRange.startDate && dateRange.endDate) {
      const ticketDate = new Date(ticket.created_time)
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      endDate.setHours(23, 59, 59, 999) // Include the entire end date
      matchesDateRange = ticketDate >= startDate && ticketDate <= endDate
    }
    
    return matchesAssignee && matchesDateRange
  })
  
  const analytics = {
    total: analyticsTickets.length,
    ongoing: analyticsTickets.filter(t => t.status === 'Ongoing').length,
    resolved: analyticsTickets.filter(t => t.disposition === 'Resolved').length,
    closed: analyticsTickets.filter(t => t.status === 'Closed').length,
    highPriority: analyticsTickets.filter(t => t.priority === 'High').length,
    mediumPriority: analyticsTickets.filter(t => t.priority === 'Medium').length,
    lowPriority: analyticsTickets.filter(t => t.priority === 'Low').length
  }

  // Handle ticket updates
  const handleTicketUpdate = async (ticketId: string, updates: Partial<Ticket>) => {
    setModalLoading(true)
    try {
      // Store the original ticket data for WhatsApp
      const originalTicket = tickets.find(t => t.id === ticketId)
      
      if (updates.disposition) {
        await ticketService.updateTicketDisposition(ticketId, updates.disposition)
        
        // Send WhatsApp notification if disposition triggers it
        if (originalTicket && ['New', 'In Progress', 'No Response 1', 'Resolved', 'No Response 2'].includes(updates.disposition)) {
          try {
            await dispositionWhatsappService.sendDispositionNotification(
              updates.disposition,
              originalTicket.name,
              originalTicket.phone,
              originalTicket.ticket_id
            )
            console.log(`WhatsApp notification sent for disposition: ${updates.disposition}`)
          } catch (whatsappError) {
            console.error('Failed to send WhatsApp notification:', whatsappError)
            // Don't fail the entire update if WhatsApp fails
          }
        }
      }
      if (updates.priority !== undefined) {
        await ticketService.updateTicketPriority(ticketId, updates.priority)
      }
      if (updates.assigned_to_id) {
        await ticketService.assignTicket(ticketId, updates.assigned_to_id)
      }

      if (updates.issue_type_l2 !== undefined) {
        await ticketService.updateTicketIssueTypeL2(ticketId, updates.issue_type_l2 || '')
      }
      if (updates.panel) {
        await ticketService.updateTicketPanel(ticketId, updates.panel)
      }

      if (updates.remarks) {
        await ticketService.updateTicketRemarks(ticketId, updates.remarks)
      }

      // Refresh tickets
      const updatedTickets = await ticketService.getAllTickets()
      setTickets(updatedTickets)
      
      // Show success message
      setModalSuccess(true)
      setModalLoading(false) // Reset loading state
      setTimeout(() => {
        setModalSuccess(false)
        // Don't auto-close modal - let user close it manually
      }, 1500)
    } catch (error) {
      console.error('Failed to update ticket:', error)
      setModalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <AdminProtected>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isLoadingAdminInfo ? (
                <span className="flex items-center">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                  Loading...
                </span>
              ) : adminLoginId ? (
                `Welcome, ${adminLoginId}`
              ) : (
                'Welcome, Admin'
              )}
            </h1>


            <p className="text-gray-600">Ticket in, solution out.</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Logout Button */}
            <button
              onClick={() => {
                localStorage.removeItem('adminId')
                window.location.reload()
              }}
              className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
            >
              Logout
            </button>
            
            {/* Assignees Dropdown */}
            <div className="relative">
              <select
                value={filters.assigned_to}
                onChange={(e) => setFilters(prev => ({ ...prev, assigned_to: e.target.value }))}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 min-w-[200px]"
              >
                <option value="" className="text-gray-500">All Assignees</option>
                {assignees.map(assignee => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name} - {assignee.department}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            
            {/* Date Range Selector */}
            <div className="relative">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 transition-colors"
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  {dateRange.startDate && dateRange.endDate 
                    ? `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`
                    : 'All Time'
                  }
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {/* Date Dropdown */}
              {showDateDropdown && (
                <div className="date-dropdown absolute top-full right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]">
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
                    <div className="space-y-2 mb-4">
                      <button
                        onClick={() => {
                          setDateRange({ startDate: '', endDate: '' })
                          setShowDateDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        All Time
                      </button>
                      <button
                        onClick={() => {
                          const today = getToday()
                          setDateRange({ startDate: today, endDate: today })
                          setShowDateDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => {
                          const yesterday = getYesterday()
                          setDateRange({ startDate: yesterday, endDate: yesterday })
                          setShowDateDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Yesterday
                      </button>
                      <button
                        onClick={() => {
                          const today = getToday()
                          const last7Days = getLast7Days()
                          setDateRange({ startDate: last7Days, endDate: today })
                          setShowDateDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Last 7 Days
                      </button>
                      <button
                        onClick={() => {
                          const today = getToday()
                          const last30Days = getLast30Days()
                          setDateRange({ startDate: last30Days, endDate: today })
                          setShowDateDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Last 30 Days
                      </button>
                      <button
                        onClick={() => {
                          const today = getToday()
                          const lastYear = getLastYear()
                          setDateRange({ startDate: lastYear, endDate: today })
                          setShowDateDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Last Year
                      </button>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Custom Range</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">From</label>
                          <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">To</label>
                          <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => setShowDateDropdown(false)}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Self-Raise Ticket Button */}
            <button
              onClick={() => {
                // Open self-raise modal or navigate to self-raise form
                setShowSelfRaiseModal(true)
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Self-Raise Ticket
            </button>
            
            {/* Analytics Button */}
            <a 
              href="/analytics"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </a>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Analytics Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Ticket Overview</h2>
          
          {/* All Cards in One Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* 1. Open Tickets */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
              <div className="flex items-center justify-between h-full">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-700">Open</p>
                  <p className="text-4xl font-bold text-blue-900">{analyticsTickets.filter(t => t.status === 'Open').length}</p>
                </div>
              </div>
            </div>

            {/* 2. Ongoing Priority Breakdown */}
            <div className="lg:col-span-1.5 bg-white rounded-2xl shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Ongoing</h3>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{analytics.ongoing}</p>
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <div className="flex-1 bg-red-50 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs font-medium text-red-700">High</span>
                  </div>
                  <span className="text-2xl font-bold text-red-900">
                    {analyticsTickets.filter(t => t.status === 'Ongoing' && t.priority === 'High').length}
                  </span>
                </div>
                
                <div className="flex-1 bg-orange-50 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-medium text-orange-700">Medium</span>
                  </div>
                  <span className="text-2xl font-bold text-orange-900">
                    {analyticsTickets.filter(t => t.status === 'Ongoing' && t.priority === 'Medium').length}
                  </span>
                </div>
                
                <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-700">Low</span>
                  </div>
                  <span className="text-2xl font-bold text-green-900">
                    {analyticsTickets.filter(t => t.status === 'Ongoing' && t.priority === 'Low').length}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Resolved Tickets */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
              <div className="flex items-center justify-between h-full">
                <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-700">Resolved</p>
                  <p className="text-4xl font-bold text-green-900">{analytics.resolved}</p>
                </div>
              </div>
            </div>

            {/* 4. Closed Tickets */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
              <div className="flex items-center justify-between h-full">
                <div className="w-16 h-16 bg-gray-500 rounded-2xl flex items-center justify-center">
                  <X className="w-8 h-8 text-white" />
                </div>
                  <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">Closed</p>
                  <p className="text-4xl font-bold text-gray-900">{analytics.closed}</p>
                  </div>
                </div>
              </div>
              
            {/* 5. Total Tickets */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
              <div className="flex items-center justify-between h-full">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-700">Total</p>
                  <p className="text-4xl font-bold text-blue-900">{analytics.total}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={20} className="text-gray-900">20</option>
                  <option value={50} className="text-gray-900">50</option>
                  <option value={100} className="text-gray-900">100</option>
                </select>
                <span className="text-sm text-gray-900 font-medium">per page</span>
              </div>
              <span className="text-sm text-gray-900 font-medium">
                Showing {startIndex + 1}-{Math.min(endIndex, totalTickets)} of {totalTickets} tickets
            </span>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 text-gray-900"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="" className="text-gray-500">All Status</option>
                {dropdownOptions.status?.map(option => (
                  <option key={option.id} value={option.value}>{option.value}</option>
                ))}
              </select>

              <select
                value={filters.disposition}
                onChange={(e) => setFilters(prev => ({ ...prev, disposition: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="" className="text-gray-500">All Dispositions</option>
                {dropdownOptions.status?.map(statusOption => {
                  const statusDispositions = dropdownOptions.disposition?.filter(disp => disp.parent_id === statusOption.id) || []
                  return (
                    <optgroup key={statusOption.id} label={`--- ${statusOption.value} ---`}>
                      {statusDispositions.map(disposition => {
                        const hasWhatsApp = ['New', 'In Progress', 'No Response 1', 'Resolved', 'No Response 2'].includes(disposition.value)
                        return (
                          <option key={disposition.id} value={disposition.value}>
                            {disposition.value} {hasWhatsApp && '🟢'}
                          </option>
                        )
                      })}
                    </optgroup>
                  )
                })}
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="" className="text-gray-500">All Priority</option>
                {dropdownOptions.priority?.map(option => (
                  <option key={option.id} value={option.value}>{option.value}</option>
                ))}
              </select>

              <select
                value={filters.panel}
                onChange={(e) => setFilters(prev => ({ ...prev, panel: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="" className="text-gray-500">All Panels</option>
                {dropdownOptions.panel?.map(option => (
                  <option key={option.id} value={option.value}>{option.value}</option>
                ))}
              </select>

              <select
                value={filters.designation}
                onChange={(e) => setFilters(prev => ({ ...prev, designation: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="" className="text-gray-500">All Designations</option>
                {dropdownOptions.designation?.map(option => (
                  <option key={option.id} value={option.value}>{option.value}</option>
                ))}
              </select>

              <select
                value={filters.issue_type_l1}
                onChange={(e) => setFilters(prev => ({ ...prev, issue_type_l1: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="" className="text-gray-500">All Issue Types</option>
                {dropdownOptions.issue_type_l1?.map(option => (
                  <option key={option.id} value={option.value}>{option.value}</option>
                ))}
              </select>

              <select
                value={filters.issue_type_l2}
                onChange={(e) => setFilters(prev => ({ ...prev, issue_type_l2: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="" className="text-gray-500">All Issue Types L2</option>
                {dropdownOptions.issue_type_l2?.map(option => (
                  <option key={option.id} value={option.value}>{option.value}</option>
                ))}
              </select>

            </div>
          </div>

          {/* Sorting Options */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setFilters({
                      status: '',
                      priority: '',
                      panel: '',
                      designation: '',
                      issue_type_l1: '',
                      issue_type_l2: '',
                      disposition: '',
                      assigned_to: ''
                    })
                    setSearchTerm('')
                    setDateRange({ startDate: '', endDate: '' })
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                >
                  Clear All Filters
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                >
                  <option value="created_time" className="text-gray-500">Created Time</option>
                  <option value="resolved_time" className="text-gray-500">Resolved Time</option>
                  <option value="ticket_id" className="text-gray-500">Ticket ID</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm flex items-center gap-2"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'} {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{tableLayout: 'fixed'}}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.status}}>
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.priority}}>
                    Priority
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.ticketId}}>
                    Ticket ID
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.issueType}}>
                    Issue Type
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.time}}>
                    Time
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.userDetails}}>
                    User Details
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.panel}}>
                    Panel
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.description}}>
                    Description
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.remarks}}>
                    Remarks
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.attachment}}>
                    Attachment
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.assignedTo}}>
                    Assigned To
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={async () => {
                      setSelectedTicket(ticket)
                      setShowModal(true)
                      setModalLoading(false) // Reset loading state
                      setModalSuccess(false) // Reset success state
                      
                      // Get presigned URLs for attachments if they exist
                      if (ticket.attachments && ticket.attachments.length > 0) {
                        try {
                          console.log('Getting presigned URLs for ticket attachments:', ticket.attachments);
                          
                          // Parse attachments if they are JSON strings
                          const parsedAttachments = ticket.attachments.map(att => {
                            if (typeof att === 'string') {
                              try {
                                return JSON.parse(att);
                              } catch (e) {
                                console.error('Failed to parse attachment:', e);
                                return att;
                              }
                            }
                            return att;
                          });
                          
                          const response = await fetch('/api/get-download-urls', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ attachments: parsedAttachments }),
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            console.log('Received presigned URLs:', data.data);
                            console.log('First attachment details:', data.data[0]);
                            setAttachmentsWithUrls(data.data);
                          } else {
                            const errorData = await response.json();
                            console.error('Failed to get download URLs:', errorData);
                            // Fallback to original attachments with s3Url as downloadUrl
                            setAttachmentsWithUrls(parsedAttachments.map(att => ({
                              ...att,
                              downloadUrl: att.s3Url || att
                            })));
                          }
                        } catch (error) {
                          console.error('Error getting download URLs:', error);
                          // Fallback to original attachments with s3Url as downloadUrl
                          const parsedAttachments = ticket.attachments.map(att => {
                            if (typeof att === 'string') {
                              try {
                                return JSON.parse(att);
                              } catch {
                                return att;
                              }
                            }
                            return att;
                          });
                          setAttachmentsWithUrls(parsedAttachments.map(att => ({
                            ...att,
                            downloadUrl: att.s3Url || att
                          })));
                        }
                      } else {
                        setAttachmentsWithUrls([]);
                      }
                    }}
                  >
                    <td className="px-6 py-4 text-center" style={{width: columnWidths.status}}>
                      <div className="space-y-1 flex flex-col items-center">
                        <span className={cn(
                          "inline-flex px-2 py-1 text-xs font-medium rounded-full text-white",
                          getStatusColor(ticket.status)
                        )}>
                          {ticket.status}
                        </span>
                        {ticket.disposition && (
                        <div>
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              {ticket.disposition}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center" style={{width: columnWidths.priority}}>
                      <div className="flex justify-center">
                        {ticket.priority ? (
                          <span className={cn(
                            "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                            {
                              "bg-red-100 text-red-800": ticket.priority === "High",
                              "bg-yellow-100 text-yellow-800": ticket.priority === "Medium",
                              "bg-green-100 text-green-800": ticket.priority === "Low"
                            }
                          )}>
                            {ticket.priority}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center" style={{width: columnWidths.ticketId}}>
                      <span className="text-sm font-medium text-gray-900 font-mono">
                        {ticket.ticket_id}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center" style={{width: columnWidths.issueType}}>
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-medium text-gray-900">{ticket.issue_type_l1}</div>
                        {ticket.issue_type_l2 && (
                          <div className="text-sm text-gray-500">{ticket.issue_type_l2}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center" style={{width: columnWidths.time}}>
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(ticket.created_time)}
                        </div>
                        {ticket.resolved_time && (
                          <div className="text-sm text-gray-500">
                            Resolved: {formatDate(ticket.resolved_time)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center" style={{width: columnWidths.userDetails}}>
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-medium text-gray-900">{ticket.name}</div>
                        <div className="text-sm text-gray-500">{ticket.phone}</div>
                        <div className="text-sm text-gray-500">{ticket.designation}</div>
                        {ticket.email && (
                          <div className="text-sm text-gray-500">{ticket.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900" style={{width: columnWidths.panel}}>
                      {ticket.panel}
                    </td>
                    <td className="px-6 py-4 text-center" style={{width: columnWidths.description}}>
                      <div className="text-sm text-gray-900">
                        {ticket.description.length > 75 
                          ? `${ticket.description.substring(0, 75)}...` 
                          : ticket.description
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center" style={{width: columnWidths.remarks}}>
                      <div className="text-sm text-gray-900">
                        {ticket.remarks && ticket.remarks.length > 75 
                          ? `${ticket.remarks.substring(0, 75)}...` 
                          : ticket.remarks || 'No remarks'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center" style={{width: columnWidths.attachment}}>
                      {ticket.attachments && ticket.attachments.length > 0 ? (
                        <div className="flex justify-center space-x-1">
                          {ticket.attachments.slice(0, 2).map((attachment, index) => (
                            <div key={index} className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <FileText className="w-4 h-4 text-gray-600" />
                            </div>
                          ))}
                          {ticket.attachments.length > 2 && (
                            <span className="text-xs text-gray-500">+{ticket.attachments.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No files</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center" style={{width: columnWidths.assignedTo}}>
                      {ticket.assigned_to_id ? (
                        <div className="flex flex-col items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {assignees.find(a => a.id === ticket.assigned_to_id)?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {assignees.find(a => a.id === ticket.assigned_to_id)?.department || ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>
        )}

        {totalTickets === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No tickets found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Enhanced Ticket Modal */}
      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-6 rounded-t-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-8 flex-1">
                  {/* Ticket Info */}
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedTicket.ticket_id}
                    </h2>
                      <div className="flex items-center space-x-4 mt-1">
                    <p className="text-sm text-gray-500">
                          Created: {formatDate(selectedTicket.created_time)}
                        </p>
                        {selectedTicket.resolved_time && (
                          <p className="text-sm text-gray-500">
                            Resolved: {formatDate(selectedTicket.resolved_time)}
                          </p>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Status:</span>
                          <span className={cn(
                            "inline-flex px-2 py-1 text-xs font-medium rounded-full text-white",
                            getStatusColor(selectedTicket.status)
                          )}>
                            {selectedTicket.status}
                          </span>
                  </div>
                </div>
                    </div>
                  </div>
                  
                  {/* User Details - Non-editable */}
                  <div className="border-l border-gray-200 pl-8">
                    <div className="grid grid-cols-2 gap-y-3">
                      <div>
                        <p className="text-sm text-gray-900 font-medium">{selectedTicket.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 font-medium">{selectedTicket.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 font-medium">{selectedTicket.designation}</p>
                      </div>
                      <div>
                        {selectedTicket.email && (
                          <p className="text-sm text-gray-900 font-medium">{selectedTicket.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  {/* Success Message */}
                  {modalSuccess && (
                    <div className="flex items-center px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-green-800 font-medium text-sm">Saved</span>
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    onClick={() => handleTicketUpdate(selectedTicket.id, {
                      disposition: selectedTicket.disposition,
                      priority: selectedTicket.priority,
                      assigned_to_id: selectedTicket.assigned_to_id,
                      issue_type_l2: selectedTicket.issue_type_l2,
                      panel: selectedTicket.panel,
                      remarks: selectedTicket.remarks
                    })}
                    disabled={modalLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {modalLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </button>

                  {/* Close Button */}
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedTicket(null)
                    setModalLoading(false)
                    setModalSuccess(false)
                  }}
                    className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
                >
                    <X className="w-5 h-5" />
                </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Section 1: Ticket Disposition & Assignment */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Ticket Disposition & Assignment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Disposition</label>
                    <select
                      value={selectedTicket.disposition || ''}
                      onChange={async (e) => {
                        const dispositionValue = e.target.value
                        
                        // Automatically set status based on disposition selection
                        if (dispositionValue) {
                          try {
                            const parentStatus = await dropdownService.getParentStatusForDisposition(dispositionValue)
                            // Update both disposition and status in a single state update
                            setSelectedTicket(prev => prev ? { 
                              ...prev, 
                              disposition: dispositionValue,
                              status: (parentStatus as Status) || prev.status
                            } : null)
                          } catch (error) {
                            console.error('Failed to get parent status:', error)
                            // If error, just update disposition
                            setSelectedTicket(prev => prev ? { ...prev, disposition: dispositionValue } : null)
                          }
                        } else {
                          // If no disposition selected, just update disposition
                          setSelectedTicket(prev => prev ? { ...prev, disposition: dispositionValue } : null)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="" className="text-gray-500">Select Disposition</option>
                      {dropdownOptions.status?.map(statusOption => {
                        const statusDispositions = dropdownOptions.disposition?.filter(disp => disp.parent_id === statusOption.id) || []
                        return (
                          <optgroup key={statusOption.id} label={`--- ${statusOption.value} ---`}>
                            {statusDispositions.map(disposition => {
                              const hasWhatsApp = ['New', 'In Progress', 'No Response 1', 'Resolved', 'No Response 2'].includes(disposition.value)
                              return (
                                <option key={disposition.id} value={disposition.value}>
                                  {disposition.value} {hasWhatsApp && '🟢'}
                                </option>
                              )
                            })}
                          </optgroup>
                        )
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={selectedTicket.priority || ''}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, priority: e.target.value as Ticket['priority'] } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="" className="text-gray-500">Select Priority</option>
                      {dropdownOptions.priority?.map(option => (
                        <option key={option.id} value={option.value}>{option.value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                    <select
                      value={selectedTicket.assigned_to_id || ''}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, assigned_to_id: e.target.value || undefined } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="" className="text-gray-500">Unassigned</option>
                      {assignees.map(assignee => (
                        <option key={assignee.id} value={assignee.id}>
                          {assignee.name} - {assignee.department}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Issue Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Issue Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type L1</label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
                      {selectedTicket.issue_type_l1 || 'Auto-selected based on L2'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically determined by Issue Type L2 selection
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type L2</label>
                    <select
                      value={selectedTicket.issue_type_l2 || ''}
                      onChange={async (e) => {
                        const l2Value = e.target.value
                        
                        // Automatically set L1 based on L2 selection
                        if (l2Value) {
                          try {
                            const parentL1 = await dropdownService.getParentL1ForL2(l2Value)
                            // Update both L2 and L1 in a single state update
                            setSelectedTicket(prev => prev ? { 
                              ...prev, 
                              issue_type_l2: l2Value,
                              issue_type_l1: (parentL1 as IssueTypeL1) || prev.issue_type_l1
                            } : null)
                          } catch (error) {
                            console.error('Failed to get parent L1:', error)
                            // If error, just update L2
                            setSelectedTicket(prev => prev ? { ...prev, issue_type_l2: l2Value } : null)
                          }
                        } else {
                          // If no L2 selected, just update L2
                          setSelectedTicket(prev => prev ? { ...prev, issue_type_l2: l2Value } : null)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="" className="text-gray-500">Select Issue Type L2</option>
                      {dropdownOptions.issue_type_l2?.map(option => (
                        <option key={option.id} value={option.value}>{option.value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Panel</label>
                    <select
                      value={selectedTicket.panel}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, panel: e.target.value as Ticket['panel'] } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      {dropdownOptions.panel?.map(option => (
                        <option key={option.id} value={option.value}>{option.value}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 min-h-[80px] whitespace-pre-wrap">
                      {selectedTicket.description || 'No description provided'}
                  </div>
                </div>
              </div>
                  </div>

              

              {/* Section 3: Attachments */}
              {attachmentsWithUrls && attachmentsWithUrls.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                    Attachments ({attachmentsWithUrls.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {attachmentsWithUrls.map((attachment, index) => {
                      console.log(`Attachment ${index}:`, {
                        type: attachment.type,
                        isImage: attachment.type?.startsWith('image/'),
                        isVideo: attachment.type?.startsWith('video/'),
                        hasViewUrl: !!attachment.viewUrl,
                        hasDownloadUrl: !!attachment.downloadUrl,
                        originalName: attachment.originalName
                      });
                      return (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center mb-2">
                           {typeof attachment === 'object' && attachment.type?.startsWith('image/') ? (
                             <div className="w-full h-full flex items-center justify-center">
                               <Image className="w-8 h-8 text-blue-500 mx-auto" />
                             </div>
                           ) : typeof attachment === 'object' && attachment.type?.startsWith('video/') ? (
                             <div className="w-full h-full flex items-center justify-center">
                               <Video className="w-8 h-8 text-purple-500 mx-auto" />
                             </div>
                           ) : (
                             <div className="w-full h-full flex items-center justify-center">
                               <FileText className="w-8 h-8 text-gray-400 mx-auto" />
                             </div>
                           )}
                         </div>
                         <p className="text-xs text-gray-600 text-center truncate font-medium">
                           {typeof attachment === 'string' ? `File ${index + 1}` : attachment.originalName}
                         </p>
                         {typeof attachment === 'object' && (
                           <p className="text-xs text-gray-500 text-center mt-1">
                             {(attachment.size / 1024).toFixed(1)} KB
                           </p>
                         )}
                         <div className="flex gap-1 mt-2">
                           <button
                             onClick={(e) => {
                               e.preventDefault();
                               // For videos and images, use viewUrl to open in browser
                               // For other files, use downloadUrl to download
                               let url;
                               if (typeof attachment === 'object' && (attachment.type?.startsWith('video/') || attachment.type?.startsWith('image/'))) {
                                 url = attachment.viewUrl || attachment.downloadUrl || attachment.s3Url;
                                 console.log('Opening media file in new tab:', {
                                   type: attachment.type,
                                   viewUrl: attachment.viewUrl,
                                   downloadUrl: attachment.downloadUrl,
                                   s3Url: attachment.s3Url,
                                   selectedUrl: url
                                 });
                               } else {
                                 url = attachment.downloadUrl || attachment.s3Url;
                                 console.log('Downloading file:', url);
                               }
                               window.open(url, '_blank');
                             }}
                             className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded flex-1 transition-colors"
                           >
                             {typeof attachment === 'object' && (attachment.type?.startsWith('video/') || attachment.type?.startsWith('image/')) ? '👁️ View' : '⬇️ Download'}
                           </button>
                           {typeof attachment === 'object' && (attachment.type?.startsWith('video/') || attachment.type?.startsWith('image/')) && (
                             <a
                               href={attachment.downloadUrl || attachment.s3Url}
                               download={attachment.originalName}
                               className="text-xs text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded flex-1 text-center transition-colors"
                             >
                               ⬇️ Download
                             </a>
                           )}
                      </div>
                       </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 4: Admin Notes */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  Admin Notes & Remarks
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Internal Remarks</label>
                  <textarea
                    value={selectedTicket.remarks || ''}
                    onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, remarks: e.target.value } : null)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Add internal notes, comments, or resolution steps..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These remarks are internal and not visible to the ticket submitter.
                  </p>
                </div>
              </div>




            </div>
          </div>
        </div>
      )}

      {/* Self-Raise Ticket Modal */}
      {showSelfRaiseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Self-Raise Ticket</h2>
                <button
                  onClick={() => setShowSelfRaiseModal(false)}
                  className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <SubmissionForm 
                isSelfRaise={true}
                assignees={assignees}
                selectedAssigneeId={filters.assigned_to}
                onClose={() => {
                  setShowSelfRaiseModal(false)
                  // Refresh tickets after closing modal
                  const refreshTickets = async () => {
                    try {
                      const updatedTickets = await ticketService.getAllTickets()
                      setTickets(updatedTickets)
                    } catch (error) {
                      console.error('Failed to refresh tickets:', error)
                    }
                  }
                  refreshTickets()
                }}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminProtected>
  )
}
