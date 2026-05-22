import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Loader2, ArrowLeft, Calendar, User, Building2, 
  DollarSign, FileText, Clock, CheckCircle2, XCircle,
  TrendingUp, AlertCircle, RotateCcw
} from 'lucide-react'
import { format } from 'date-fns'
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion'
import { toast } from 'sonner'

interface FundingRequest {
  id: string
  request_number: string
  title: string
  description: string
  amount: number
  amount_usd: number
  currency: string
  budget_type: string
  business_unit: string
  status: string
  requester_email: string
  created_at: string
  department_id: string
  legal_entity_id: string
  project_number?: string
  doa_level?: string
  approval_comments?: string
  department?: { name: string }
  legal_entity?: { name: string; code: string }
}

interface ApprovalAction {
  id: string
  approver_email: string
  action: string
  comments: string
  created_at: string
}

export default function ViewRequest() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const { formatCurrency, formatUSD, convertToUSD } = useCurrencyConversion()
  const [request, setRequest] = useState<FundingRequest | null>(null)
  const [approvalHistory, setApprovalHistory] = useState<ApprovalAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchRequest()
    }
  }, [id])

  const fetchRequest = async () => {
    if (!id) return
    
    setLoading(true)
    try {
      const { data: requestData, error: requestError } = await supabase
        .from('funding_requests')
        .select(`
          *,
          department:departments(name),
          legal_entity:legal_entities(name, code)
        `)
        .eq('id', id)
        .single()

      if (requestError) throw requestError
      setRequest(requestData)

      const { data: historyData, error: historyError } = await supabase
        .from('approval_actions')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: true })

      if (!historyError && historyData) {
        setApprovalHistory(historyData)
      }

    } catch (error) {
      console.error('Error fetching request:', error)
      toast.error('Failed to load request details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Approved':
        return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' }
      case 'Pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending Review' }
      case 'Rejected':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' }
      case 'Returned':
        return { icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Returned for Revision' }
      default:
        return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Draft' }
    }
  }

  const getStepIcon = (action: string | null) => {
    if (action === 'approved') return <CheckCircle2 className="w-5 h-5 text-green-600" />
    if (action === 'rejected') return <XCircle className="w-5 h-5 text-red-600" />
    if (action === 'returned') return <RotateCcw className="w-5 h-5 text-orange-600" />
    return <Clock className="w-5 h-5 text-yellow-600" />
  }

  const getStepStatus = (action: string | null) => {
    if (action === 'approved') return 'Approved'
    if (action === 'rejected') return 'Rejected'
    if (action === 'returned') return 'Returned'
    return 'Pending'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Request not found</p>
        <Button onClick={() => navigate('/my-requests')} className="mt-4">
          Back to My Requests
        </Button>
      </div>
    )
  }

  const statusConfig = getStatusConfig(request.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
              <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-gray-500">Request #{request.request_number}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{request.description || 'No description provided'}</p>
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(request.amount, request.currency)}
                  </p>
                  {request.currency !== 'USD' && request.amount_usd && (
                    <p className="text-sm text-gray-500">
                      ≈ {formatUSD(request.amount_usd)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">{request.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Budget Type</p>
                  <Badge variant="outline">{request.budget_type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Business Unit</p>
                  <p>{request.business_unit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p>{request.department?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Legal Entity</p>
                  <p>{request.legal_entity?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Project Number</p>
                  <p className="font-mono text-sm">{request.project_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p>{format(new Date(request.created_at), 'MMMM dd, yyyy')}</p>
                </div>
                {request.doa_level && (
                  <div>
                    <p className="text-sm text-gray-500">DoA Level</p>
                    <p>{request.doa_level}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Approval Workflow */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvalHistory.map((step, index) => (
                  <div key={step.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {getStepIcon(step.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{step.approver_email}</p>
                          <p className="text-sm text-gray-500">Step {index + 1}</p>
                        </div>
                        <Badge variant="outline">{getStepStatus(step.action)}</Badge>
                      </div>
                      {step.comments && (
                        <p className="text-sm text-gray-600 mt-2">Comment: {step.comments}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(step.created_at), 'MMMM dd, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
                {approvalHistory.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No approval actions yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => navigate('/my-requests')}>
                <FileText className="w-4 h-4 mr-2" />
                View All My Requests
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Request Number</p>
                <p className="font-mono text-sm">{request.request_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">DOA Level</p>
                <p className="text-sm">{request.doa_level || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm">{format(new Date(request.created_at), 'MMMM dd, yyyy')}</p>
              </div>
              {request.requester_email && (
                <div>
                  <p className="text-xs text-gray-500">Requester</p>
                  <p className="text-sm">{request.requester_email}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
