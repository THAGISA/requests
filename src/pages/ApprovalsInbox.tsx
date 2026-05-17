import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle2, XCircle, Clock, RotateCcw, 
  Building2, DollarSign, Calendar,
  MessageSquare, Loader2, User
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface ApprovalRequest {
  id: string
  request_id: string
  approver_email: string
  action: string
  comments: string
  created_at: string
  request_number: string
  title: string
  description: string
  amount: number
  currency: string
  budget_type: string
  business_unit: string
  status: string
}

export default function ApprovalsInbox() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
  const [showDecisionDialog, setShowDecisionDialog] = useState(false)
  const [decisionAction, setDecisionAction] = useState<'approved' | 'rejected' | 'returned'>('approved')
  const [decisionComments, setDecisionComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      fetchApprovals()
    }
  }, [user])

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      // Get all approval actions for the current user
      const { data: approvalsData, error: approvalsError } = await supabase
        .from('approval_actions')
        .select('*')
        .eq('approver_email', user?.email)
        .order('created_at', { ascending: false })
      
      if (approvalsError) throw approvalsError
      
      if (!approvalsData || approvalsData.length === 0) {
        setApprovals([])
        setLoading(false)
        return
      }
      
      // Get the associated funding requests
      const requestIds = approvalsData.map(a => a.request_id)
      const { data: requestsData, error: reqError } = await supabase
        .from('funding_requests')
        .select('id, request_number, title, description, amount, currency, budget_type, business_unit, status')
        .in('id', requestIds)
      
      if (reqError) throw reqError
      
      // Combine the data
      const combined = approvalsData.map(approval => {
        const request = requestsData?.find(r => r.id === approval.request_id)
        if (!request) return null
        
        return {
          ...approval,
          request_number: request.request_number,
          title: request.title,
          description: request.description,
          amount: request.amount,
          currency: request.currency,
          budget_type: request.budget_type,
          business_unit: request.business_unit,
          status: request.status,
        }
      }).filter(Boolean) as ApprovalRequest[]
      
      console.log('Combined approvals:', combined)
      setApprovals(combined)
    } catch (err) {
      console.error('Error fetching approvals:', err)
      toast.error('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  const getDaysPending = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24))
    return days
  }

  const getPriorityColor = (days: number) => {
    if (days > 7) return 'text-red-600 bg-red-50'
    if (days > 3) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const handleDecision = async () => {
    if (!selectedRequest) return
    
    setSubmitting(true)
    try {
      // Update the approval action
      const { error: updateError } = await supabase
        .from('approval_actions')
        .update({
          action: decisionAction,
          comments: decisionComments
        })
        .eq('id', selectedRequest.id)
      
      if (updateError) throw updateError
      
      // Update the funding request status
      let newStatus = selectedRequest.status
      if (decisionAction === 'approved') {
        newStatus = 'Approved'
      } else if (decisionAction === 'rejected') {
        newStatus = 'Rejected'
      } else if (decisionAction === 'returned') {
        newStatus = 'Returned'
      }
      
      await supabase
        .from('funding_requests')
        .update({ status: newStatus })
        .eq('id', selectedRequest.request_id)
      
      toast.success(`Request ${decisionAction === 'approved' ? 'approved' : decisionAction === 'rejected' ? 'rejected' : 'returned'} successfully`)
      fetchApprovals()
      setShowDecisionDialog(false)
      setDecisionComments('')
      setSelectedRequest(null)
    } catch (err) {
      console.error('Error submitting decision:', err)
      toast.error('Failed to submit decision')
    } finally {
      setSubmitting(false)
    }
  }

  const openDecisionDialog = (request: ApprovalRequest, action: 'approved' | 'rejected' | 'returned') => {
    setSelectedRequest(request)
    setDecisionAction(action)
    setShowDecisionDialog(true)
  }

  const pendingApprovals = approvals.filter(a => a.action === 'pending')
  const actionedApprovals = approvals.filter(a => a.action !== 'pending')

  const ApprovalCard = ({ approval }: { approval: ApprovalRequest }) => {
    const daysPending = getDaysPending(approval.created_at)
    const isPending = approval.action === 'pending'
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className={`w-1.5 rounded-full ${isPending ? 'bg-yellow-500' : 
              approval.action === 'approved' ? 'bg-green-500' : 
              approval.action === 'rejected' ? 'bg-red-500' : 'bg-orange-500'}`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-500">{approval.request_number}</span>
                  <Badge className={isPending ? 'bg-yellow-100 text-yellow-700' : 
                    approval.action === 'approved' ? 'bg-green-100 text-green-700' :
                    approval.action === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}>
                    {isPending ? 'Pending' : approval.action.toUpperCase()}
                  </Badge>
                  {isPending && daysPending > 0 && (
                    <Badge className={getPriorityColor(daysPending)}>
                      <Clock className="w-3 h-3 mr-1" /> {daysPending} day{daysPending !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Building2 className="w-3 h-3" />
                  <span>{approval.business_unit}</span>
                  <span className="text-gray-300">|</span>
                  <DollarSign className="w-3 h-3" />
                  <span>{approval.currency} {approval.amount?.toLocaleString()}</span>
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-1">{approval.title}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{approval.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Requester</p>
                    <p className="font-medium">{approval.approver_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Submitted</p>
                    <p className="font-medium">{format(new Date(approval.created_at), 'PPP')}</p>
                  </div>
                </div>
              </div>
              
              {isPending && (
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openDecisionDialog(approval, 'approved')}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => openDecisionDialog(approval, 'rejected')}>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openDecisionDialog(approval, 'returned')}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Return
                  </Button>
                </div>
              )}
              
              {!isPending && approval.comments && (
                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500">Decision Comments</p>
                  </div>
                  <p className="text-sm text-gray-700">{approval.comments}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Approvals Inbox</h1>
        <p className="text-gray-500 mt-1">Review and act on pending approval requests</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending <Badge variant="secondary" className="ml-2">{pendingApprovals.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="actioned">Already Actioned ({actionedApprovals.length})</TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {activeTab === 'pending' && (
            pendingApprovals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-gray-500">No pending approvals requiring your action.</p>
                </CardContent>
              </Card>
            ) : (
              pendingApprovals.map(approval => <ApprovalCard key={approval.id} approval={approval} />)
            )
          )}
          
          {activeTab === 'actioned' && (
            actionedApprovals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No actioned approvals</h3>
                  <p className="text-gray-500">You haven't acted on any approvals yet.</p>
                </CardContent>
              </Card>
            ) : (
              actionedApprovals.map(approval => <ApprovalCard key={approval.id} approval={approval} />)
            )
          )}
        </div>
      </Tabs>

      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionAction === 'approved' ? 'Approve Request' : 
               decisionAction === 'rejected' ? 'Reject Request' : 'Return for Correction'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Request Details</p>
              <p className="font-medium">Amount: {selectedRequest?.currency} {selectedRequest?.amount?.toLocaleString()}</p>
              <p className="text-sm">Request #: {selectedRequest?.request_number}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Comments (optional)</label>
              <Textarea 
                rows={3} 
                placeholder={decisionAction === 'approved' ? "Add any approval notes..." : 
                           decisionAction === 'rejected' ? "Please provide reason for rejection..." : 
                           "Please provide feedback for correction..."}
                value={decisionComments}
                onChange={(e) => setDecisionComments(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleDecision} 
              disabled={submitting}
              className={decisionAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : 
                        decisionAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 
                        'bg-orange-600 hover:bg-orange-700'}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm {decisionAction === 'approved' ? 'Approval' : decisionAction === 'rejected' ? 'Rejection' : 'Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
