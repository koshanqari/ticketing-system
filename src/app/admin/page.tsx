'use client'

import { useState, useEffect } from 'react'
import { Search, BarChart3, CheckCircle, Clock, FileText, Save, X, ChevronDown, Calendar } from 'lucide-react'
import { Ticket, Assignee, DropdownOption } from '@/types'
import { ticketService } from '@/lib/ticketService'
import { dropdownService } from '@/lib/dropdownService'
import { cn } from '@/lib/utils'
import AdminProtected from '@/components/AdminProtected'


export default function AdminPanel() {
  // Column width configuration - easily adjustable here
  // To change column widths, simply modify the values below
  // All content will automatically wrap to next line if it exceeds the column width
  const columnWidths = {
    status: '120px',        // Status + Priority badges
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    panel: '',
    designation: '',
    issue_type_l1: '',
    issue_type_l2: '',
    assigned_to: ''
  })
  
  // Sorting state
  const [sortBy, setSortBy] = useState('created_time')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  
  // Date dropdown state
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  
  // Admin info state
  const [adminLoginId, setAdminLoginId] = useState<string>('')
  const [isLoadingAdminInfo, setIsLoadingAdminInfo] = useState(false)
  
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
      ticket.issue_type_l1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.issue_type_l2 && ticket.issue_type_l2.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilters = 
      (!filters.status || ticket.status === filters.status) &&
      (!filters.priority || ticket.priority === filters.priority) &&
      (!filters.panel || ticket.panel === filters.panel) &&
      (!filters.designation || ticket.designation === filters.designation) &&
      (!filters.issue_type_l1 || ticket.issue_type_l1 === filters.issue_type_l1) &&
      (!filters.issue_type_l2 || ticket.issue_type_l2 === filters.issue_type_l2) &&
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
    progress: analyticsTickets.filter(t => t.status === 'Progress').length,
    resolved: analyticsTickets.filter(t => t.status === 'Resolved').length,
    parked: analyticsTickets.filter(t => t.status === 'Parked').length,
    dropped: analyticsTickets.filter(t => t.status === 'Dropped').length,
    highPriority: analyticsTickets.filter(t => t.priority === 'High').length,
    mediumPriority: analyticsTickets.filter(t => t.priority === 'Medium').length,
    lowPriority: analyticsTickets.filter(t => t.priority === 'Low').length
  }

  // Handle ticket updates
  const handleTicketUpdate = async (ticketId: string, updates: Partial<Ticket>) => {
    setModalLoading(true)
    try {
      if (updates.status) {
        await ticketService.updateTicketStatus(ticketId, updates.status)
      }
      if (updates.priority) {
        await ticketService.updateTicketPriority(ticketId, updates.priority)
      }
      if (updates.assigned_to_id) {
        await ticketService.assignTicket(ticketId, updates.assigned_to_id)
      }
      if (updates.issue_type_l1) {
        await ticketService.updateTicketIssueTypeL1(ticketId, updates.issue_type_l1)
      }
      if (updates.issue_type_l2 !== undefined) {
        await ticketService.updateTicketIssueTypeL2(ticketId, updates.issue_type_l2 || '')
      }
      if (updates.description) {
        await ticketService.updateTicketDescription(ticketId, updates.description)
      }
      if (updates.panel) {
        await ticketService.updateTicketPanel(ticketId, updates.panel)
      }
      if (updates.name || updates.phone || updates.email !== undefined || updates.designation) {
        await ticketService.updateTicketUserDetails(ticketId, {
          name: updates.name || selectedTicket!.name,
          phone: updates.phone || selectedTicket!.phone,
          email: updates.email !== undefined ? updates.email : selectedTicket!.email,
          designation: updates.designation || selectedTicket!.designation
        })
      }
      if (updates.remarks) {
        await ticketService.updateTicketRemarks(ticketId, updates.remarks)
      }

      // Refresh tickets
      const updatedTickets = await ticketService.getAllTickets()
      setTickets(updatedTickets)
      
      // Show success message
      setModalSuccess(true)
      setTimeout(() => {
        setModalSuccess(false)
        setShowModal(false)
        setSelectedTicket(null)
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
                    ? `${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`
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
                          const today = new Date().toISOString().split('T')[0]
                          setDateRange({ startDate: today, endDate: today })
                          setShowDateDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => {
                          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                          setDateRange({ startDate: yesterday, endDate: yesterday })
                          setShowDateDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Yesterday
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0]
                          const last7Days = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                          setDateRange({ startDate: last7Days, endDate: today })
                          setShowDateDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Last 7 Days
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0]
                          const last30Days = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                          setDateRange({ startDate: last30Days, endDate: today })
                          setShowDateDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Last 30 Days
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0]
                          const lastYear = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
            {/* 1. Progress Priority Breakdown */}
            <div className="lg:col-span-1.5 bg-white rounded-2xl shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">In Progress</h3>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{analytics.progress}</p>
                  </div>
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-yellow-600" />
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
                    {analyticsTickets.filter(t => t.status === 'Progress' && t.priority === 'High').length}
                  </span>
                </div>
                
                <div className="flex-1 bg-orange-50 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-medium text-orange-700">Medium</span>
                  </div>
                  <span className="text-2xl font-bold text-orange-900">
                    {analyticsTickets.filter(t => t.status === 'Progress' && t.priority === 'Medium').length}
                  </span>
                </div>
                
                <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-700">Low</span>
                  </div>
                  <span className="text-2xl font-bold text-green-900">
                    {analyticsTickets.filter(t => t.status === 'Progress' && t.priority === 'Low').length}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Resolved Tickets */}
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

            {/* 3. Parked Priority Breakdown */}
            <div className="lg:col-span-1.5 bg-white rounded-2xl shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Parked</h3>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{analytics.parked}</p>
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
                    {analyticsTickets.filter(t => t.status === 'Parked' && t.priority === 'High').length}
                  </span>
                </div>
                
                <div className="flex-1 bg-orange-50 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-medium text-orange-700">Medium</span>
                  </div>
                  <span className="text-2xl font-bold text-orange-900">
                    {analyticsTickets.filter(t => t.status === 'Parked' && t.priority === 'Medium').length}
                  </span>
                </div>
                
                <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-700">Low</span>
                  </div>
                  <span className="text-2xl font-bold text-green-900">
                    {analyticsTickets.filter(t => t.status === 'Parked' && t.priority === 'Low').length}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Total Tickets */}
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

            {/* 5. Dropped Tickets */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4 border border-red-200">
              <div className="flex items-center justify-between h-full">
                <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center">
                  <X className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-700">Dropped</p>
                  <p className="text-4xl font-bold text-red-900">{analytics.dropped}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
            <span className="text-sm text-gray-600">
              Showing {sortedTickets.length} of {tickets.length} tickets
            </span>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.status}}>
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.ticketId}}>
                    Ticket ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.issueType}}>
                    Issue Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.time}}>
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.userDetails}}>
                    User Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.panel}}>
                    Panel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.description}}>
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.remarks}}>
                    Remarks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.attachment}}>
                    Attachment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: columnWidths.assignedTo}}>
                    Assigned To
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedTicket(ticket)
                      setShowModal(true)
                    }}
                  >
                    <td className="px-6 py-4" style={{width: columnWidths.status}}>
                      <div className="space-y-1">
                        <span className={cn(
                          "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                          {
                            "bg-blue-100 text-blue-800": ticket.status === "Progress",
                            "bg-green-100 text-green-800": ticket.status === "Resolved",
                            "bg-yellow-100 text-yellow-800": ticket.status === "Parked",
                            "bg-red-100 text-red-800": ticket.status === "Dropped"
                          }
                        )}>
                          {ticket.status}
                        </span>
                        <div>
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
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4" style={{width: columnWidths.ticketId}}>
                      <span className="text-sm font-medium text-gray-900 font-mono">
                        {ticket.ticket_id}
                      </span>
                    </td>
                    <td className="px-4 py-4" style={{width: columnWidths.issueType}}>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ticket.issue_type_l1}</div>
                        {ticket.issue_type_l2 && (
                          <div className="text-sm text-gray-500">{ticket.issue_type_l2}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4" style={{width: columnWidths.time}}>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(ticket.created_time).toLocaleDateString()}
                        </div>
                        {ticket.resolved_time && (
                          <div className="text-sm text-gray-500">
                            Resolved: {new Date(ticket.resolved_time).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{width: columnWidths.userDetails}}>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ticket.name}</div>
                        <div className="text-sm text-gray-500">{ticket.phone}</div>
                        <div className="text-sm text-gray-500">{ticket.designation}</div>
                        {ticket.email && (
                          <div className="text-sm text-gray-500">{ticket.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900" style={{width: columnWidths.panel}}>
                      {ticket.panel}
                    </td>
                    <td className="px-6 py-4" style={{width: columnWidths.description}}>
                      <div className="text-sm text-gray-900">
                        {ticket.description.length > 75 
                          ? `${ticket.description.substring(0, 75)}...` 
                          : ticket.description
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{width: columnWidths.remarks}}>
                      <div className="text-sm text-gray-900">
                        {ticket.remarks && ticket.remarks.length > 75 
                          ? `${ticket.remarks.substring(0, 75)}...` 
                          : ticket.remarks || 'No remarks'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{width: columnWidths.attachment}}>
                      {ticket.attachments && ticket.attachments.length > 0 ? (
                        <div className="flex space-x-1">
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
                    <td className="px-6 py-4" style={{width: columnWidths.assignedTo}}>
                      {ticket.assigned_to_id ? (
                        <div>
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

        {sortedTickets.length === 0 && (
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
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Ticket: {selectedTicket.ticket_id}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(selectedTicket.created_time).toLocaleString()}
                      {selectedTicket.resolved_time && ` • Resolved: ${new Date(selectedTicket.resolved_time).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedTicket(null)
                    setModalLoading(false)
                    setModalSuccess(false)
                  }}
                  className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Section 1: Ticket Status & Assignment */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Ticket Status & Assignment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, status: e.target.value as Ticket['status'] } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      {dropdownOptions.status?.map(option => (
                        <option key={option.id} value={option.value}>{option.value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, priority: e.target.value as Ticket['priority'] } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
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
                    <select
                      value={selectedTicket.issue_type_l1}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, issue_type_l1: e.target.value as Ticket['issue_type_l1'] } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      {dropdownOptions.issue_type_l1?.map(option => (
                        <option key={option.id} value={option.value}>{option.value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type L2</label>
                    <select
                      value={selectedTicket.issue_type_l2 || ''}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, issue_type_l2: e.target.value } : null)}
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
                    <textarea
                      value={selectedTicket.description}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, description: e.target.value } : null)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-none"
                      placeholder="Describe the issue in detail..."
                    />
                  </div>
                </div>
              </div>

                            {/* Section 3: User Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  User Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={selectedTicket.name}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="Enter user name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="text"
                      value={selectedTicket.phone}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="text"
                      value={selectedTicket.email || ''}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, email: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                    <select
                      value={selectedTicket.designation}
                      onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, designation: e.target.value as Ticket['designation'] } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      {dropdownOptions.designation?.map(option => (
                        <option key={option.id} value={option.value}>{option.value}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Attachments */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                    Attachments ({selectedTicket.attachments.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedTicket.attachments.map((attachment, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center mb-2">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-600 text-center truncate">
                          File {index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 5: Admin Notes */}
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

              {/* Success Message */}
              {modalSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">
                      Ticket updated successfully! Closing modal...
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedTicket(null)
                    setModalLoading(false)
                    setModalSuccess(false)
                  }}
                  disabled={modalLoading}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTicketUpdate(selectedTicket.id, {
                    status: selectedTicket.status,
                    priority: selectedTicket.priority,
                    assigned_to_id: selectedTicket.assigned_to_id,
                    issue_type_l1: selectedTicket.issue_type_l1,
                    issue_type_l2: selectedTicket.issue_type_l2,
                    description: selectedTicket.description,
                    panel: selectedTicket.panel,
                    name: selectedTicket.name,
                    phone: selectedTicket.phone,
                    email: selectedTicket.email,
                    designation: selectedTicket.designation,
                    remarks: selectedTicket.remarks
                  })}
                  disabled={modalLoading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminProtected>
  )
}
