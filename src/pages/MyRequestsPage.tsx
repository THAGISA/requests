import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Loader2, FileText, Search, Filter, Calendar, 
  DollarSign, Clock, CheckCircle2, XCircle, 
  Eye, Trash2, Edit, Download, TrendingUp,
  AlertCircle, Building2, User, Send
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface FundingRequest {
  id: string
  request_number: string
  title: string
  description: string
  amount: number
  currency: string
  budget_type: string
  business_unit: string
  status: string
  requester_email: string
  created_at: string
  department?: { name: string }
}

export default function MyRequests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<FundingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchMyRequests()
  }, [user])

  const fetchMyRequests = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    console.log("🔍 Fetching CAPEX requests for:", user.email)

    try {
      const { data, error } = await supabase
        .from('funding_requests')
        .select(`
          id, 
          request_number, 
          title, 
          description,
          amount, 
          currency, 
          budget_type,
          business_unit,
          status, 
          requester_email, 
          created_at,
          department:departments(name)
        `)
        .eq('requester_email', user.email)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching requests:', error)
        toast.error('Failed to load your CAPEX requests')
      } else {
        console.log('✅ Loaded:', data?.length || 0, 'CAPEX requests')
        setRequests(data || [])
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      toast.error('An error occurred while loading your requests')
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Approved':
        return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Approved' }
      case 'Pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Pending Review' }
      case 'Rejected':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' }
      case 'Returned':
        return { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Returned' }
      default:
        return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Draft' }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const filteredRequests = requests.filter(req => {
    const matchesSearch = searchTerm === '' || 
      req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.request_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'pending' && req.status === 'Pending') ||
      (activeTab === 'approved' && req.status === 'Approved')
    
    return matchesSearch && matchesStatus && matchesTab
  })

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'Pending').length,
    approved: requests.filter(r => r.status === 'Approved').length,
    rejected: requests.filter(r => r.status === 'Rejected').length,
    totalValue: requests.reduce((sum, r) => sum + (r.amount || 0), 0),
    pendingValue: requests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + (r.amount || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your CAPEX requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            My CAPEX Requests
          </h1>
          <p className="text-gray-500 mt-1">Track and manage all your capital expenditure requests</p>
        </div>
        <Button onClick={() => navigate('/new-request')} className="bg-blue-600 hover:bg-blue-700 shadow-lg">
          <FileText className="w-4 h-4 mr-2" />
          New CAPEX Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Requests</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Pending Review</p>
                <p className="text-3xl font-bold mt-2">{stats.pending}</p>
                <p className="text-xs opacity-75 mt-1">{formatCurrency(stats.pendingValue)}</p>
              </div>
              <Clock className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Approved</p>
                <p className="text-3xl font-bold mt-2">{stats.approved}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Value</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(stats.totalValue)}</p>
              </div>
              <DollarSign className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by title or request number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="px-4 py-2 border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Returned">Returned</option>
            </select>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">No CAPEX requests found</h3>
                    <p className="text-gray-500 mt-1">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Try adjusting your search or filters'
                        : 'Submit your first CAPEX request to get started'}
                    </p>
                  </div>
                  <Button onClick={() => navigate('/new-request')} variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Create CAPEX Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((req) => {
                const StatusIcon = getStatusConfig(req.status).icon
                return (
                  <Card 
                    key={req.id} 
                    className="hover:shadow-lg transition-all cursor-pointer border-l-4"
                    style={{ borderLeftColor: getStatusConfig(req.status).color.replace('text-', 'border-') }}
                    onClick={() => navigate(`/request/${req.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className="font-mono text-sm text-gray-500">
                              {req.request_number}
                            </span>
                            <Badge className={`${getStatusConfig(req.status).bg} ${getStatusConfig(req.status).color} border-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {getStatusConfig(req.status).label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {req.budget_type}
                            </Badge>
                          </div>

                          {/* Title */}
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {req.title}
                          </h3>

                          {/* Description */}
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {req.description || 'No description provided'}
                          </p>

                          {/* Meta Info */}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              <span>{req.department?.name || 'Unassigned'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              <span>{req.business_unit}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Submitted {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{req.requester_email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(req.amount)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{req.currency}</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/request/${req.id}`)
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Call to Action for first-time users */}
      {stats.total === 0 && !loading && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardContent className="p-8 text-center">
            <Send className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to submit your first CAPEX request?</h3>
            <p className="text-gray-600 mb-4">Move beyond spreadsheets and track your requests in real-time</p>
            <Button onClick={() => navigate('/new-request')} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" />
              Start Your First CAPEX Request
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
