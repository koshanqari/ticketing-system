'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, FileText, Clock, CheckCircle, AlertTriangle, BarChart3, Calendar, Filter } from 'lucide-react'
import { Ticket, TicketAnalytics } from '@/types'
import { ticketService } from '@/lib/ticketService'
import { cn } from '@/lib/utils'
import AdminProtected from '@/components/AdminProtected'

export default function AnalyticsPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('7d')
  const [panelFilter, setPanelFilter] = useState('all')

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading analytics data...')
        
        // Check if Supabase is available first
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          throw new Error('Supabase environment variables not configured')
        }
        
        const ticketsData = await ticketService.getAllTickets()
        console.log('Analytics data loaded successfully:', { tickets: ticketsData.length })
        setTickets(ticketsData)
      } catch (error) {
        console.error('Failed to load analytics data:', error)
        // Set empty data to prevent infinite loading
        setTickets([])
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
      
      const ticketDate = new Date(ticket.created_time)
      const now = new Date()
      const daysDiff = (now.getTime() - ticketDate.getTime()) / (1000 * 3600 * 24)
      
      switch (timeFilter) {
        case '7d': return daysDiff <= 7
        case '30d': return daysDiff <= 30
        case '90d': return daysDiff <= 90
        default: return true
      }
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

    return {
      total: filteredTickets.length,
      open: filteredTickets.filter(t => t.status === 'Open').length,
      ongoing: filteredTickets.filter(t => t.status === 'Ongoing').length,
      resolved: filteredTickets.filter(t => t.disposition === 'Resolved').length,
      closed: filteredTickets.filter(t => t.status === 'Closed').length,
      highPriority: filteredTickets.filter(t => t.priority === 'High').length,
      mediumPriority: filteredTickets.filter(t => t.priority === 'Medium').length,
      lowPriority: filteredTickets.filter(t => t.priority === 'Low').length,
      byPanel,
      byIssueType,
      byDesignation,
      byAssignee: {} // Will be populated when assignee data is available
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
    resolved: Math.floor(analytics.resolved * 0.85),
    ongoing: Math.floor(analytics.ongoing * 1.1),
    highPriority: Math.floor(analytics.highPriority * 0.95)
  }

  const trends = {
    total: calculateTrend(analytics.total, previousPeriodData.total),
    resolved: calculateTrend(analytics.resolved, previousPeriodData.resolved),
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
                localStorage.removeItem('adminId')
                window.location.reload()
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
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Time Period:</span>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

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
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.resolved}</p>
                <div className="flex items-center mt-2">
                  {trends.resolved.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={cn(
                    "text-sm",
                    trends.resolved.isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {trends.resolved.value.toFixed(1)}% from last period
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
                'Resolved': analytics.resolved,
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
                            "bg-blue-500": status === 'Open',
                            "bg-orange-500": status === 'Ongoing',
                            "bg-green-500": status === 'Resolved',
                            "bg-gray-500": status === 'Closed'
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

          {/* Priority Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
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

        {/* Panel and Issue Type Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Panel Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Panel Distribution</h3>
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

          {/* Issue Type Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Issue Type Distribution</h3>
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
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {analytics.total > 0 ? ((analytics.resolved / analytics.total) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-sm text-gray-600">Resolution Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
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
