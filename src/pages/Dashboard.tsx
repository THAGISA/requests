import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CheckCircle2, Clock, XCircle, FileText, 
  Plus, Search, RotateCcw, Building2, Loader2
} from 'lucide-react'
import { format } from 'date-fns'

interface FundingRequest {
  id: string
  request_number: string
  title: string
  description: string
  amount: number
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
  Pending: { label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  Returned: { label: 'Returned', color: 'text-orange-700', bg: 'bg-orange-100', icon: RotateCcw },
  Rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  Draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100', icon: FileText },
}

export default function Dashboard() {
  const { user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<FundingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBU, setFilterBU] = useState('all')
  const [filterClass, setFilterClass] = useState('all')

  // Debug logging
  useEffect(() => {
    console.log('Dashboard - userRole:', userRole, 'user:', user?.email, 'authLoading:', authLoading)
  }, [userRole, user, authLoading])

  // Wait for auth to load and role to be available before fetching data
  useEffect(() => {
    if (!authLoading && user && userRole) {
      console.log('Conditions met, fetching requests for role:', userRole)
      fetchRequests()
    } else if (!authLoading && !user) {
      console.log('No user, setting loading false')
      setLoading(false)
    }
  }, [user, userRole, authLoading])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      console.log('Fetching requests for role:', userRole)
      
      let query = supabase
        .from('funding_requests')
        .select(`
          *,
          department:departments(name),
          legal_entity:legal_entities(name, code)
        `)
        .order('created_at', { ascending: false })

      // Role-based filtering
      switch (userRole) {
        case 'submitter':
          console.log('Filtering for submitter:', user?.email)
          query = query.eq('requester_email', user?.email)
          break
          
        case 'approver':
          console.log('Filtering for approver:', user?.email)
          const { data: approvals } = await supabase
            .from('approval_actions')
            .select('request_id')
            .eq('approver_email', user?.email)
          
          const requestIds = approvals?.map(a => a.request_id) || []
          console.log('Found approval request IDs:', requestIds)
          
          if (requestIds.length === 0) {
            setRequests([])
            setLoading(false)
            return
          }
          
          query = query.in('id', requestIds)
          break
          
        case 'admin':
          console.log('Admin view - showing all requests')
          // Admins see everything
          break
          
        default:
          console.log('Defaulting to submitter filter')
          query = query.eq('requester_email', user?.email)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      console.log('Fetched requests:', data?.length)
      setRequests(data || [])
    } catch (err) {
      console.error('Error fetching requests:', err)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while auth is initializing or data is loading
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Please sign in to view the dashboard</p>
            <Button className="mt-4" onClick={() => navigate('/login')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate stats
  const stats = {
    total: requests.length,
    approved: requests.filter(r => r.status === 'Approved').length,
    inReview: requests.filter(r => r.status === 'Pending').length,
    returned: requests.filter(r => r.status === 'Returned').length,
    rejected: requests.filter(r => r.status === 'Rejected').length,
    totalUSD: requests.reduce((sum, r) => {
      const rates: Record<string, number> = {
        USD: 1, ZAR: 0.054, EUR: 1.08, GBP: 1.27,
        KES: 0.0077, MZN: 0.016, TZS: 0.00039, UGX: 0.00027
      }
      const rate = rates[r.currency] || 1
      return sum + (r.amount * rate)
    }, 0),
    capex: requests.filter(r => r.budget_type === 'CAPEX').reduce((sum, r) => sum + (r.amount || 0), 0),
    opex: requests.filter(r => r.budget_type === 'OPEX').reduce((sum, r) => sum + (r.amount || 0), 0),
  }

  // Filter requests
  const filtered = requests.filter(r => {
    if (search && !r.title?.toLowerCase().includes(search.toLowerCase()) && 
        !r.request_number?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterBU !== 'all' && r.business_unit !== filterBU) return false
    if (filterClass !== 'all' && r.budget_type !== filterClass) return false
    return true
  })

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.Pending
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />{config.label}
      </span>
    )
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { 
      USD: '$', EUR: '€', GBP: '£', ZAR: 'R', 
      KES: 'KSh', MZN: 'MT', TZS: 'TSh', UGX: 'USh' 
    }
    const symbol = symbols[currency] || '$'
    return `${symbol} ${amount.toLocaleString()}`
  }

  const getRoleMessage = () => {
    switch (userRole) {
      case 'submitter':
        return 'Showing your submitted requests'
      case 'approver':
        return 'Showing requests pending your approval'
      case 'admin':
        return 'Showing all requests (Admin View)'
      default:
        return 'Showing your requests'
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funding Portal</h1>
          <p className="text-sm text-gray-500 mt-0.5">{getRoleMessage()}</p>
        </div>
        <Button onClick={() => navigate('/new-request')} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">Total</p><p className="text-xl font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">Approved</p><p className="text-xl font-bold">{stats.approved}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">In Review</p><p className="text-xl font-bold">{stats.inReview}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">Returned</p><p className="text-xl font-bold">{stats.returned}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">Rejected</p><p className="text-xl font-bold">{stats.rejected}</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-3"><p className="text-xs opacity-90">Total (USD)</p><p className="text-xl font-bold">${(stats.totalUSD / 1000).toFixed(0)}k</p></CardContent>
        </Card>
      </div>

      {/* CAPEX/OPEX Summary */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>CAPEX: R {(stats.capex / 1000).toFixed(0)}k</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>OPEX: R {(stats.opex / 1000).toFixed(0)}k</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search title or ref..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
      </div>

      {/* Results Count */}
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
                  : 'No funding requests found.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((req) => (
            <Card key={req.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/request/${req.id}`)}>
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
                      <span>🏢 {req.vendor || 'N/A'}</span>
                      <span>📅 Due: {req.required_by_date ? format(new Date(req.required_by_date), 'yyyy-MM-dd') : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(req.amount, req.currency)}</p>
                    <p className="text-xs text-gray-400">{req.currency}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
