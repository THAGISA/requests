import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Clock, XCircle, FileText,
  Plus, Search, RotateCcw, Building2, Loader2,
  TrendingUp, DollarSign, PieChart, Calendar, Users, Target, Award, Zap, Activity, Eye,
  Globe, Filter
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion'

interface FundingRequest {
  id: string
  request_number: string
  title: string
  description: string
  amount: number
  amount_usd: number
  currency: string
  budget_type: 'CAPEX' | 'OPEX'
  business_unit: string
  status: string
  vendor: string
  required_by_date: string
  created_at: string
  department?: { name: string }
  legal_entity?: { name: string; code: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  Approved: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  Pending:  { label: 'Pending',  color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  Returned: { label: 'Returned', color: 'text-orange-700', bg: 'bg-orange-100', icon: RotateCcw },
  Rejected: { label: 'Rejected', color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
  Draft:    { label: 'Draft',    color: 'text-gray-700',   bg: 'bg-gray-100',   icon: FileText },
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function Dashboard() {
  const { user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { formatCurrency, formatUSD, convertToUSD } = useCurrencyConversion()
  const [requests, setRequests] = useState<FundingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBU, setFilterBU] = useState('all')
  const [filterClass, setFilterClass] = useState('all')
  const [filterEntity, setFilterEntity] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  
  // Available options for filters
  const [availableEntities, setAvailableEntities] = useState<string[]>([])
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([])

  const fetchIdRef = useRef(0)

  useEffect(() => {
    if (authLoading) return
    if (!user || !userRole) {
      setLoading(false)
      return
    }

    const currentFetchId = ++fetchIdRef.current

    const fetchRequests = async () => {
      try {
        let query = supabase
          .from('funding_requests')
          .select(`
            *,
            department:departments(name),
            legal_entity:legal_entities(name, code)
          `)
          .order('created_at', { ascending: false })

        if (userRole === 'submitter') {
          if (!user?.email) return
          query = query.eq('requester_email', user.email)
        } else if (userRole === 'approver') {
          if (!user?.email) return
          const { data: approvals } = await supabase
            .from('approval_actions')
            .select('request_id')
            .eq('approver_email', user.email)
          const requestIds = approvals?.map(a => a.request_id) ?? []
          if (currentFetchId !== fetchIdRef.current) return
          if (requestIds.length === 0) {
            setRequests([])
            return
          }
          query = query.in('id', requestIds)
        }

        const { data, error } = await query
        if (currentFetchId !== fetchIdRef.current) return
        if (error) throw error
        
        const requestsData = data ?? []
        setRequests(requestsData)
        
        // Extract unique entities and departments for filters
        const entities = new Set<string>()
        const departments = new Set<string>()
        
        requestsData.forEach(req => {
          if (req.legal_entity?.name) {
            entities.add(req.legal_entity.name)
          }
          if (req.department?.name) {
            departments.add(req.department.name)
          }
        })
        
        setAvailableEntities(Array.from(entities).sort())
        setAvailableDepartments(Array.from(departments).sort())
        
      } catch (err) {
        console.error('Error fetching requests:', err)
        toast.error('Failed to load requests')
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false)
        }
      }
    }

    setLoading(true)
    fetchRequests()
  }, [user, userRole, authLoading])

  // Calculate statistics
  const totalAmountUSD = requests.reduce((sum, r) => sum + (r.amount_usd || r.amount), 0)
  const approvedAmountUSD = requests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + (r.amount_usd || r.amount), 0)
  const pendingAmountUSD = requests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + (r.amount_usd || r.amount), 0)
  const approvalRate = requests.length > 0 ? (requests.filter(r => r.status === 'Approved').length / requests.length) * 100 : 0
  
  // Status distribution for pie chart
  const statusData = [
    { name: 'Approved', value: requests.filter(r => r.status === 'Approved').length, color: '#10B981' },
    { name: 'Pending', value: requests.filter(r => r.status === 'Pending').length, color: '#F59E0B' },
    { name: 'Rejected', value: requests.filter(r => r.status === 'Rejected').length, color: '#EF4444' },
    { name: 'Returned', value: requests.filter(r => r.status === 'Returned').length, color: '#F97316' },
  ]

  // Monthly trend data
  const monthlyTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const filteredRequests = applyFilters()
    return months.slice(0, 6).map(month => {
      const monthRequests = filteredRequests.filter(r => format(new Date(r.created_at), 'MMM') === month)
      return {
        month,
        amount: monthRequests.reduce((sum, r) => sum + (r.amount_usd || r.amount), 0),
        count: monthRequests.length
      }
    })
  }

  // Department data for bar chart
  const departmentData = () => {
    const deptMap = new Map()
    const filteredRequests = applyFilters()
    filteredRequests.forEach(req => {
      const deptName = req.department?.name || 'Unassigned'
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, { name: deptName, amount: 0, count: 0 })
      }
      const data = deptMap.get(deptName)
      data.amount += req.amount_usd || req.amount
      data.count++
    })
    return Array.from(deptMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5)
  }

  const applyFilters = () => {
    let filtered = [...requests]
    
    if (search) {
      filtered = filtered.filter(r => 
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.request_number?.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus)
    }
    if (filterBU !== 'all') {
      filtered = filtered.filter(r => r.business_unit === filterBU)
    }
    if (filterClass !== 'all') {
      filtered = filtered.filter(r => r.budget_type === filterClass)
    }
    if (filterEntity !== 'all') {
      filtered = filtered.filter(r => r.legal_entity?.name === filterEntity)
    }
    if (filterDepartment !== 'all') {
      filtered = filtered.filter(r => r.department?.name === filterDepartment)
    }
    
    return filtered
  }

  const filtered = applyFilters()

  const stats = [
    {
      id: 'total',
      title: 'Total Requests',
      value: filtered.length,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      trend: '+12%',
      period: 'vs last month'
    },
    {
      id: 'approved',
      title: 'Approved',
      value: filtered.filter(r => r.status === 'Approved').length,
      icon: CheckCircle2,
      color: 'from-green-500 to-green-600',
      trend: '+8%',
      period: 'vs last month'
    },
    {
      id: 'pending',
      title: 'Pending Review',
      value: filtered.filter(r => r.status === 'Pending').length,
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600',
      trend: '-3%',
      period: 'vs last month'
    },
    {
      id: 'amount',
      title: 'Total Value (USD)',
      value: formatUSD(filtered.reduce((sum, r) => sum + (r.amount_usd || r.amount), 0)),
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      trend: '+23%',
      period: 'vs last month'
    }
  ]

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />{config.label}
      </span>
    )
  }

  const getRoleMessage = () => {
    switch (userRole) {
      case 'submitter': return 'Showing your submitted requests'
      case 'approver':  return 'Showing requests pending your approval'
      case 'admin':     return 'Showing all requests (Admin View)'
      default:          return 'Showing your requests'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
          <p className="text-sm text-gray-400 mt-1">Fetching latest data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              CAPEX Request Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Welcome back, {user?.email?.split('@')[0]} • {getRoleMessage()}
            </p>
          </div>
          <Button onClick={() => navigate('/new-request')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200">
            <Plus className="w-4 h-4 mr-2" />
            New CAPEX Request
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.id}
                whileHover={{ scale: 0.98 }}
                onHoverStart={() => setHoveredCard(stat.id)}
                onHoverEnd={() => setHoveredCard(null)}
              >
                <Card className={`bg-gradient-to-br ${stat.color} text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden relative group`}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm opacity-90 mb-1">{stat.title}</p>
                        <p className="text-3xl font-bold">{stat.value}</p>
                        <div className="flex items-center mt-2">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          <span className="text-xs opacity-90">{stat.trend}</span>
                          <span className="text-xs opacity-75 ml-1">{stat.period}</span>
                        </div>
                      </div>
                      <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm">
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <motion.div 
                        className="h-full bg-white/40"
                        initial={{ width: 0 }}
                        animate={{ width: hoveredCard === stat.id ? '100%' : '0%' }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Monthly Funding Trend (USD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyTrend()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis tickFormatter={(value) => formatUSD(value)} stroke="#6B7280" />
                  <RechartsTooltip 
                    formatter={(value: number) => [formatUSD(value), 'Amount']}
                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.3} name="Total Amount" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Request Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={statusData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Department Spending Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Department Spending (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatUSD(value)} />
                <RechartsTooltip formatter={(value: number) => formatUSD(value)} />
                <Bar dataKey="amount" fill="#3B82F6">
                  {departmentData().map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-600">Approval Rate</span>
                <Target className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold mb-2">{approvalRate.toFixed(1)}%</div>
              <Progress value={approvalRate} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-600">Total CAPEX Value</span>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold mb-2">{formatUSD(totalAmountUSD)}</div>
              <div className="flex justify-between text-sm">
                <span>CAPEX: {formatUSD(requests.filter(r => r.budget_type === 'CAPEX').reduce((s, r) => s + (r.amount_usd || r.amount), 0))}</span>
                <span>OPEX: {formatUSD(requests.filter(r => r.budget_type === 'OPEX').reduce((s, r) => s + (r.amount_usd || r.amount), 0))}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-600">Active Requests</span>
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold mb-2">{requests.filter(r => r.status === 'Pending').length}</div>
              <p className="text-sm text-gray-500">Awaiting decision</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search title or ref..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterBU} onValueChange={setFilterBU}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All BUs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All BUs</SelectItem>
                <SelectItem value="DI">DI - Digital Infrastructure</SelectItem>
                <SelectItem value="DS">DS - Digital Services</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="CAPEX + OPEX" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">CAPEX + OPEX</SelectItem>
                <SelectItem value="CAPEX">CAPEX Only</SelectItem>
                <SelectItem value="OPEX">OPEX Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Entities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {availableEntities.map(entity => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {availableDepartments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-sm text-gray-500">{filtered.length} results</p>

        {/* Requests List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">
                  {userRole === 'approver'
                    ? 'No pending approvals. Check back later!'
                    : userRole === 'submitter'
                    ? 'No requests found. Create your first request!'
                    : 'No funding requests found matching your filters.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filtered.map(req => (
              <Card
                key={req.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/request/${req.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-gray-500">{req.request_number}</span>
                        {getStatusBadge(req.status)}
                        <Badge variant="outline" className="text-xs">{req.business_unit}</Badge>
                        <Badge variant="outline" className="text-xs">{req.budget_type}</Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{req.title}</h3>
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{req.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{req.legal_entity?.name}</span>
                        <span>📋 {req.department?.name || 'N/A'}</span>
                        <span>📅 Created: {format(new Date(req.created_at), 'yyyy-MM-dd')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(req.amount, req.currency)}
                      </p>
                      {req.currency !== 'USD' && req.amount_usd && (
                        <p className="text-xs text-gray-400">
                          ≈ {formatUSD(req.amount_usd)}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">{req.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
