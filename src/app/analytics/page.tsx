'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, FileText, Clock, CheckCircle, AlertTriangle, BarChart3, Calendar, Filter, ChevronDown } from 'lucide-react'
import { Ticket, TicketAnalytics, Assignee } from '@/types'
import { ticketService } from '@/lib/ticketService'
import { cn } from '@/lib/utils'
import AdminProtected from '@/components/AdminProtected'
import { useAdmin } from '@/contexts/AdminContext'

export default function AnalyticsPanel() {
  const { clearAdmin } = useAdmin()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [loading, setLoading] = useState(true)
  const [panelFilter, setPanelFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [isClient, setIsClient] = useState(false)
  const [showDateDropdown, setShowDateDropdown] = useState(false)

  // Initialize client-side state to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

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

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading analytics data...')
        
        // Check if Supabase is available first
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          throw new Error('Supabase environment variables not configured')
        }
        
        const [ticketsData, assigneesData] = await Promise.all([
          ticketService.getAllTickets(),
          ticketService.getAllAssignees()
        ])
        console.log('Analytics data loaded successfully:', { tickets: ticketsData.length, assignees: assigneesData.length })
        setTickets(ticketsData)
        setAssignees(assigneesData)
      } catch (error) {
        console.error('Failed to load analytics data:', error)
        // Set empty data to prevent infinite loading
        setTickets([])
        setAssignees([])
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Calculate analytics data
  const calculateAnalytics = (): TicketAnalytics => {
    const filteredTickets = tickets.filter(ticket => {
      if (panelFilter !== 'all' && ticket.panel !== panelFilter) return false
      if (assigneeFilter && ticket.assigned_to_id !== assigneeFilter) return false
      
      // Filter by date range if dates are selected
      let matchesDateRange = true
      if (dateRange.startDate && dateRange.endDate) {
        const ticketDate = new Date(ticket.created_time)
        const startDate = new Date(dateRange.startDate)
        const endDate = new Date(dateRange.endDate)
        endDate.setHours(23, 59, 59, 999) // Include the entire end date
        matchesDateRange = ticketDate >= startDate && ticketDate <= endDate
      }

      return matchesDateRange
    })

    const byPanel = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.panel] = (acc[ticket.panel] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byIssueType = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.issue_type_l1] = (acc[ticket.issue_type_l1] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byDesignation = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.designation] = (acc[ticket.designation] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byDisposition = filteredTickets.reduce((acc, ticket) => {
      if (ticket.disposition) {
        acc[ticket.disposition] = (acc[ticket.disposition] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const byIssueTypeL2 = filteredTickets.reduce((acc, ticket) => {
      if (ticket.issue_type_l2) {
        acc[ticket.issue_type_l2] = (acc[ticket.issue_type_l2] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const byAssignee = filteredTickets.reduce((acc, ticket) => {
      if (ticket.assigned_to_id) {
        const assignee = assignees.find(a => a.id === ticket.assigned_to_id)
        const assigneeName = assignee ? `${assignee.name} - ${assignee.department}` : 'Unknown Assignee'
        acc[assigneeName] = (acc[assigneeName] || 0) + 1
      } else {
        acc['Unassigned'] = (acc['Unassigned'] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return {
      total: filteredTickets.length,
      open: filteredTickets.filter(t => t.status === 'Open').length,
      ongoing: filteredTickets.filter(t => t.status === 'Ongoing').length,
      closed: filteredTickets.filter(t => t.status === 'Closed').length,
      resolved: filteredTickets.filter(t => t.disposition === 'Resolved').length,
      highPriority: filteredTickets.filter(t => t.priority === 'High').length,
      mediumPriority: filteredTickets.filter(t => t.priority === 'Medium').length,
      lowPriority: filteredTickets.filter(t => t.priority === 'Low').length,
      byPanel,
      byIssueType,
      byDisposition,
      byIssueTypeL2,
      byDesignation,
      byAssignee
    }
  }

  const analytics = calculateAnalytics()

  // Calculate trends (simple comparison with previous period)
  const calculateTrend = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current > 0 }
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(change), isPositive: change >= 0 }
  }

  // Mock previous period data for trends
  const previousPeriodData = {
    total: Math.floor(analytics.total * 0.9),
    closed: Math.floor(analytics.closed * 0.85),
    ongoing: Math.floor(analytics.ongoing * 1.1),
    highPriority: Math.floor(analytics.highPriority * 0.95)
  }

  const trends = {
    total: calculateTrend(analytics.total, previousPeriodData.total),
    closed: calculateTrend(analytics.closed, previousPeriodData.closed),
    ongoing: calculateTrend(analytics.ongoing, previousPeriodData.ongoing),
    highPriority: calculateTrend(analytics.highPriority, previousPeriodData.highPriority)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Performance metrics and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Logout Button */}
            <button
              onClick={() => {
                clearAdmin()
                window.location.href = '/'
              }}
              className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
            >
              Logout
            </button>
            
            <button 
              onClick={() => window.location.href = '/admin'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Admin Panel
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Panel:</span>
              <select
                value={panelFilter}
                onChange={(e) => setPanelFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="all" className="text-gray-500">All Panels</option>
                <option value="Goal App">Goal App</option>
                <option value="Dealer Panel">Dealer Panel</option>
                <option value="CC Panel">CC Panel</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Assignee:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 min-w-[200px]"
              >
                <option value="" className="text-gray-500">All Assignees</option>
                {assignees.map(assignee => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name} - {assignee.department}
                  </option>
                ))}
              </select>
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
                <div className="date-dropdown absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]">
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
          </div>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.total}</p>
                <div className="flex items-center mt-2">
                  {trends.total.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={cn(
                    "text-sm",
                    trends.total.isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {trends.total.value.toFixed(1)}% from last period
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Closed</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.closed}</p>
                <div className="flex items-center mt-2">
                  {trends.closed.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={cn(
                    "text-sm",
                    trends.closed.isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {trends.closed.value.toFixed(1)}% from last period
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ongoing</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.ongoing}</p>
                <div className="flex items-center mt-2">
                  {trends.ongoing.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={cn(
                    "text-sm",
                    trends.ongoing.isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {trends.ongoing.value.toFixed(1)}% from last period
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.highPriority}</p>
                <div className="flex items-center mt-2">
                  {trends.highPriority.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={cn(
                    "text-sm",
                    trends.highPriority.isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {trends.highPriority.value.toFixed(1)}% from last period
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Distribution Charts */}
        {/* Row 1: Status Distribution | Disposition Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Status Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries({
                'Open': analytics.open,
                'Ongoing': analytics.ongoing,
                'Closed': analytics.closed
              }).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={cn(
                          "h-2 rounded-full",
                          {
                            "bg-blue-700": status === 'Open',
                            "bg-orange-600": status === 'Ongoing',
                            "bg-gray-600": status === 'Closed'
                          }
                        )}
                        style={{ width: `${analytics.total > 0 ? (count / analytics.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disposition Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Disposition Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.byDisposition).length > 0 ? (
                Object.entries(analytics.byDisposition)
                  .sort(([,a], [,b]) => b - a) // Sort by count descending
                  .map(([disposition, count]) => (
                    <div key={disposition} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{disposition}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${analytics.total > 0 ? (count / analytics.total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center text-gray-500 py-4">No disposition data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Panel Distribution | Priority Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Panel Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Panel Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.byPanel).map(([panel, count]) => (
                <div key={panel} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{panel}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${analytics.total > 0 ? (count / analytics.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-orange-600" />
              Priority Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries({
                'High': analytics.highPriority,
                'Medium': analytics.mediumPriority,
                'Low': analytics.lowPriority
              }).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{priority}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={cn(
                          "h-2 rounded-full",
                          {
                            "bg-red-500": priority === 'High',
                            "bg-yellow-500": priority === 'Medium',
                            "bg-green-500": priority === 'Low'
                          }
                        )}
                        style={{ width: `${analytics.total > 0 ? (count / analytics.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Issue Type L1 Distribution | Issue Type L2 Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Issue Type L1 Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
              Issue Type L1 Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.byIssueType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{type}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${analytics.total > 0 ? (count / analytics.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Issue Type L2 Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
              Issue Type L2 Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.byIssueTypeL2).length > 0 ? (
                Object.entries(analytics.byIssueTypeL2)
                  .sort(([,a], [,b]) => b - a) // Sort by count descending
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{ width: `${analytics.total > 0 ? (count / analytics.total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center text-gray-500 py-4">No Issue Type L2 data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Row 4: Assignee Distribution */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Assignee Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Assignee Distribution
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Assignee
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Open
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Ongoing
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Closed
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Resolved
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      High
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Med
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Low
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analytics.byAssignee).length > 0 ? (
                    Object.entries(analytics.byAssignee)
                      .sort(([,a], [,b]) => b - a) // Sort by total count descending
                      .map(([assignee, totalCount]) => {
                        // Get detailed stats for this assignee
                        const assigneeTickets = tickets.filter(ticket => {
                          if (assignee === 'Unassigned') {
                            return !ticket.assigned_to_id
                          }
                          const assigneeObj = assignees.find(a => a.id === ticket.assigned_to_id)
                          const assigneeName = assigneeObj ? `${assigneeObj.name} - ${assigneeObj.department}` : 'Unknown Assignee'
                          return assigneeName === assignee
                        }).filter(ticket => {
                          // Apply same filters as main analytics
                          if (panelFilter !== 'all' && ticket.panel !== panelFilter) return false
                          if (assigneeFilter && ticket.assigned_to_id !== assigneeFilter) return false
                          
                          // Filter by date range if dates are selected
                          let matchesDateRange = true
                          if (dateRange.startDate && dateRange.endDate) {
                            const ticketDate = new Date(ticket.created_time)
                            const startDate = new Date(dateRange.startDate)
                            const endDate = new Date(dateRange.endDate)
                            endDate.setHours(23, 59, 59, 999)
                            matchesDateRange = ticketDate >= startDate && ticketDate <= endDate
                          }
                          return matchesDateRange
                        })
                        
                        const openCount = assigneeTickets.filter(t => t.status === 'Open').length
                        const ongoingCount = assigneeTickets.filter(t => t.status === 'Ongoing').length
                        const closedCount = assigneeTickets.filter(t => t.status === 'Closed').length
                        const resolvedCount = assigneeTickets.filter(t => t.disposition === 'Resolved').length
                        const highPriorityCount = assigneeTickets.filter(t => t.priority === 'High').length
                        const mediumPriorityCount = assigneeTickets.filter(t => t.priority === 'Medium').length
                        const lowPriorityCount = assigneeTickets.filter(t => t.priority === 'Low').length
                        
                        return (
                          <tr key={assignee} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="text-sm font-medium text-gray-900 truncate" title={assignee}>
                                {assignee}
                              </div>
                            </td>
                            
                            {/* Open */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-700 h-1.5 rounded-full"
                                    style={{ width: `${totalCount > 0 ? (openCount / totalCount) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-700 w-6 text-right">{openCount}</span>
                              </div>
                            </td>
                            
                            {/* Ongoing */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-orange-600 h-1.5 rounded-full"
                                    style={{ width: `${totalCount > 0 ? (ongoingCount / totalCount) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-700 w-6 text-right">{ongoingCount}</span>
                              </div>
                            </td>
                            
                            {/* Closed */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-gray-600 h-1.5 rounded-full"
                                    style={{ width: `${totalCount > 0 ? (closedCount / totalCount) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-700 w-6 text-right">{closedCount}</span>
                              </div>
                            </td>
                            
                            {/* Resolved */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-green-600 h-1.5 rounded-full"
                                    style={{ width: `${totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-700 w-6 text-right">{resolvedCount}</span>
                              </div>
                            </td>
                            
                            {/* High Priority */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-red-500 h-1.5 rounded-full"
                                    style={{ width: `${totalCount > 0 ? (highPriorityCount / totalCount) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-700 w-6 text-right">{highPriorityCount}</span>
                              </div>
                            </td>
                            
                            {/* Medium Priority */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-yellow-500 h-1.5 rounded-full"
                                    style={{ width: `${totalCount > 0 ? (mediumPriorityCount / totalCount) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-700 w-6 text-right">{mediumPriorityCount}</span>
                              </div>
                            </td>
                            
                            {/* Low Priority */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-green-500 h-1.5 rounded-full"
                                    style={{ width: `${totalCount > 0 ? (lowPriorityCount / totalCount) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-700 w-6 text-right">{lowPriorityCount}</span>
                              </div>
                            </td>
                            
                            {/* Total */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className={cn(
                                      "h-1.5 rounded-full",
                                      assignee === 'Unassigned' ? "bg-gray-500" : "bg-purple-500"
                                    )}
                                    style={{ width: `${analytics.total > 0 ? (totalCount / analytics.total) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-gray-900 w-6 text-right">{totalCount}</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center text-gray-500 py-4">
                        No assignee data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {analytics.total > 0 ? ((analytics.closed / analytics.total) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-sm text-gray-600">Closed Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {analytics.total > 0 ? ((analytics.resolved / analytics.total) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-sm text-gray-600">Resolved Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {analytics.total > 0 ? ((analytics.ongoing / analytics.total) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-sm text-gray-600">Active Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-2">
                {analytics.total > 0 ? ((analytics.highPriority / analytics.total) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-sm text-gray-600">High Priority Rate</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AdminProtected>
  )
}
