import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2, CheckCircle2, XCircle, Clock, Eye,
  Building2, DollarSign, Calendar, User, 
  TrendingUp, Send, Search, RefreshCw,
  ThumbsUp, ThumbsDown, FileText, RotateCcw
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion'

interface ApprovalRequest {
  id: string
  request_id: string
  approver_email: string
  action: string | null
  comments: string | null
  created_at: string
  funding_request?: {
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
    department?: { name: string }
  }
}

export default function Approvals() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { formatCurrency, formatUSD } = useCurrencyConversion()
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'return'>('approve')

  useEffect(() => {
    fetchApprovals()
  }, [user])

  const fetchApprovals = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Get all pending approval actions for this user
      const { data: actions, error: actionsError } = await supabase
        .from('approval_actions')
        .select('*')
        .eq('approver_email', user.email)
        .is('action', null)
        .order('created_at', { ascending: true })
      
      if (actionsError) {
        console.error('Error fetching approvals:', actionsError)
        toast.error('Failed to load approvals')
        setApprovals([])
        setLoading(false)
        return
      }
      
      if (!actions || actions.length === 0) {
        setApprovals([])
        setLoading(false)
        return
      }
      
      // Get the associated funding requests
      const requestIds = actions.map(a => a.request_id)
      const { data: requests, error: requestsError } = await supabase
        .from('funding_requests')
        .select(`
          id,
          request_number,
          title,
          description,
          amount,
          amount_usd,
          currency,
          budget_type,
          business_unit,
          status,
          requester_email,
          created_at,
          department:departments(name)
        `)
        .in('id', requestIds)
      
      if (requestsError) {
        console.error('Error fetching requests:', requestsError)
        toast.error('Failed to load request details')
        setApprovals([])
        setLoading(false)
        return
      }
      
      // Combine the data
      const combined = actions.map(action => ({
        ...action,
        funding_request: requests?.find(req => req.id === action.request_id)
      })).filter(item => item.funding_request)
      
      setApprovals(combined)
    } catch (error) {
      console.error('Error in fetchApprovals:', error)
      toast.error('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (approval: ApprovalRequest) => {
    setSelectedApproval(approval)
    setActionType('approve')
    setApprovalComment('')
    setShowCommentDialog(true)
  }

  const handleReject = (approval: ApprovalRequest) => {
    setSelectedApproval(approval)
    setActionType('reject')
    setApprovalComment('')
    setShowCommentDialog(true)
  }

  const handleReturn = (approval: ApprovalRequest) => {
    setSelectedApproval(approval)
    setActionType('return')
    setApprovalComment('')
    setShowCommentDialog(true)
  }

  const submitApproval = async () => {
    if (!selectedApproval) return
    
    setProcessingId(selectedApproval.id)
    try {
      let newAction = ''
      let newStatus = ''
      
      switch (actionType) {
        case 'approve':
          newAction = 'approved'
          newStatus = 'Approved'
          break
        case 'reject':
          newAction = 'rejected'
          newStatus = 'Rejected'
          break
        case 'return':
          newAction = 'returned'
          newStatus = 'Returned'
          break
      }
      
      // Update the approval action
      const { error: updateError } = await supabase
        .from('approval_actions')
        .update({ 
          action: newAction,
          comments: approvalComment || null
        })
        .eq('id', selectedApproval.id)
      
      if (updateError) throw updateError
      
      // Update the request status
      await supabase
        .from('funding_requests')
        .update({ 
          status: newStatus,
          ...(approvalComment && { approval_comments: approvalComment })
        })
        .eq('id', selectedApproval.request_id)
      
      const actionMessages = {
        approve: 'approved',
        reject: 'rejected',
        return: 'returned for revision'
      }
      
      toast.success(`CAPEX request ${actionMessages[actionType]} successfully`)
      setShowCommentDialog(false)
      await fetchApprovals()
    } catch (error) {
      console.error('Error processing approval:', error)
      toast.error('Failed to process approval')
    } finally {
      setProcessingId(null)
      setSelectedApproval(null)
    }
  }

  const getTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  const getActionButtonColor = (type: string) => {
    switch (type) {
      case 'approve': return 'bg-green-600 hover:bg-green-700'
      case 'reject': return 'bg-red-600 hover:bg-red-700'
      case 'return': return 'bg-orange-600 hover:bg-orange-700'
      default: return ''
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'approve': return <ThumbsUp className="w-4 h-4 mr-2" />
      case 'reject': return <ThumbsDown className="w-4 h-4 mr-2" />
      case 'return': return <RotateCcw className="w-4 h-4 mr-2" />
      default: return null
    }
  }

  const filteredApprovals = approvals.filter(approval => {
    const req = approval.funding_request
    if (!req) return false
    const matchesSearch = searchTerm === '' || 
      req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester_email?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading approvals...</p>
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
            Approvals Inbox
          </h1>
          <p className="text-gray-500 mt-1">Review, approve, or return CAPEX requests pending your decision</p>
        </div>
        <Button onClick={fetchApprovals} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Pending Approvals</p>
                <p className="text-3xl font-bold mt-2">{approvals.length}</p>
              </div>
              <Clock className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Value (USD)</p>
                <p className="text-3xl font-bold mt-2">
                  {formatUSD(approvals.reduce((sum, a) => sum + (a.funding_request?.amount_usd || 0), 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Departments</p>
                <p className="text-3xl font-bold mt-2">
                  {new Set(approvals.map(a => a.funding_request?.department?.name)).size}
                </p>
              </div>
              <Building2 className="w-8 h-8 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search by title, request number, or requester..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Approvals List */}
      {filteredApprovals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No pending approvals</h3>
                <p className="text-gray-500 mt-1">
                  {searchTerm ? 'No matching approvals found' : 'All caught up! No CAPEX requests waiting for your review.'}
                </p>
              </div>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredApprovals.map((approval) => {
            const req = approval.funding_request
            if (!req) return null
            
            return (
              <Card key={approval.id} className="hover:shadow-lg transition-all border-l-4 border-l-yellow-400">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    {/* Request Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="font-mono text-sm text-gray-500">
                          {req.request_number}
                        </span>
                        <Badge className="bg-yellow-100 text-yellow-700 border-0">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Your Approval
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {req.budget_type}
                        </Badge>
                      </div>

                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {req.title}
                      </h3>

                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {req.description || 'No description provided'}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <span>Requester: <span className="font-medium">{req.requester_email}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-4 h-4" />
                          <span>Department: <span className="font-medium">{req.department?.name || 'Unassigned'}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <TrendingUp className="w-4 h-4" />
                          <span>Business Unit: <span className="font-medium">{req.business_unit}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Submitted: <span className="font-medium">{getTimeAgo(req.created_at)}</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Amount and Actions */}
                    <div className="text-right min-w-[200px]">
                      <div className="mb-4">
                        <p className="text-sm text-gray-500">Request Amount</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(req.amount, req.currency)}
                        </p>
                        {req.currency !== 'USD' && req.amount_usd && (
                          <p className="text-xs text-gray-500">
                            ≈ {formatUSD(req.amount_usd)}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">{req.currency}</p>
                      </div>
                      
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button
                          onClick={() => handleApprove(approval)}
                          disabled={processingId === approval.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === approval.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <ThumbsUp className="w-4 h-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        
                        <Button
                          onClick={() => handleReturn(approval)}
                          disabled={processingId === approval.id}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {processingId === approval.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <RotateCcw className="w-4 h-4 mr-2" />
                          )}
                          Return
                        </Button>
                        
                        <Button
                          onClick={() => handleReject(approval)}
                          disabled={processingId === approval.id}
                          variant="destructive"
                        >
                          {processingId === approval.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <ThumbsDown className="w-4 h-4 mr-2" />
                          )}
                          Reject
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/request/${req.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Comment Dialog */}
      {showCommentDialog && selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {actionType === 'approve' && 'Approve CAPEX Request'}
                {actionType === 'reject' && 'Reject CAPEX Request'}
                {actionType === 'return' && 'Return CAPEX Request for Revision'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">{selectedApproval.funding_request?.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Request #{selectedApproval.funding_request?.request_number}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {actionType === 'return' ? 'Reason for Return (required)' : 'Comments (optional)'}
                </label>
                <Textarea
                  placeholder={
                    actionType === 'return' 
                      ? 'Please provide details on what needs to be revised (e.g., additional quotes, more details, etc.)...'
                      : 'Add any comments or feedback...'
                  }
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowCommentDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitApproval}
                  className={getActionButtonColor(actionType)}
                  disabled={actionType === 'return' && !approvalComment.trim()}
                >
                  {getActionIcon(actionType)}
                  {actionType === 'approve' && 'Confirm Approval'}
                  {actionType === 'reject' && 'Confirm Rejection'}
                  {actionType === 'return' && 'Confirm Return'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
