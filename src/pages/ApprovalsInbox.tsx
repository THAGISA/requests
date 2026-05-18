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
  MessageSquare, Loader2, User, RefreshCw
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
  requester_email?: string
}

const formatName = (email: string) => {
  if (!email) return 'Unknown'
  return email.split('@')[0].split('.').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
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
    if (user) fetchApprovals()
  }, [user])

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      // Fetch approval_actions joined with funding_requests in one query
      const { data, error } = await supabase
        .from('approval_actions')
        .select(`
          *,
          funding_request:funding_requests(
            id, request_number, title, description,
            amount, currency, budget_type, business_unit,
            status, requester_email
          )
        `)
        .eq('approver_email', user?.email)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!data || data.length === 0) {
        setApprovals([])
        return
      }

      // Deduplicate: keep only the latest action per request_id
      const seen = new Map<string, any>()
      for (const row of data) {
        if (!seen.has(row.request_id)) {
          seen.set(row.request_id, row)
        }
      }

      const combined: ApprovalRequest[] = Array.from(seen.values())
        .filter(row => row.funding_request)
        .map(row => ({
          id: row.id,
          request_id: row.request_id,
          approver_email: row.approver_email,
          action: row.action,
          comments: row.comments,
          created_at: row.created_at,
          request_number: row.funding_request.request_number,
          title: row.funding_request.title,
          description: row.funding_request.description,
          amount: row.funding_request.amount,
          currency: row.funding_request.currency,
          budget_type: row.funding_request.budget_type,
          business_unit: row.funding_request.business_unit,
          status: row.funding_request.status,
          requester_email: row.funding_request.requester_email,
        }))

      console.log('Approvals loaded:', combined.length)
      setApprovals(combined)
    } catch (err) {
      console.error('Error fetching approvals:', err)
      toast.error('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  const getDaysPending = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 3600 * 24))
    return days
  }

  const getPriorityColor = (days: number) => {
    if (days > 7) return 'text-red-600 bg-red-50 border-red-200'
    if (days > 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const handleDecision = async () => {
    if (!selectedRequest) return
    setSubmitting(true)
    try {
      const { error: updateError } = await supabase
        .from('approval_actions')
        .update({ action: decisionAction, comments: decisionComments })
        .eq('id', selectedRequest.id)

      if (updateError) throw updateError

      const newStatus =
        decisionAction === 'approved' ? 'Approved' :
        decisionAction === 'rejected' ? 'Rejected' : 'Returned'

      const { error: reqError } = await supabase
        .from('funding_requests')
        .update({ status: newStatus })
        .eq('id', selectedRequest.request_id)

      if (reqError) throw reqError

      toast.success(`Request ${newStatus.toLowerCase()} successfully`)
      setShowDecisionDialog(false)
      setDecisionComments('')
      setSelectedRequest(null)
      fetchApprovals()
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
    const isApproved = approval.action === 'approved'
    const isRejected = approval.action === 'rejected'
    const isReturned = approval.action === 'returned'

    const accentColor = isPending ? 'bg-yellow-500' : isApproved ? 'bg-green-500' : isRejected ? 'bg-red-500' : 'bg-orange-500'

    return (
      <Card className="hover:shadow-md transition-shadow overflow-hidden">
        <div className={`h-1 w-full ${accentColor}`} />
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{approval.request_number}</span>
              <Badge className={
                isPending ? 'bg-yellow-100 text-yellow-700' :
                isApproved ? 'bg-green-100 text-green-700' :
                isRejected ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
              }>
                {isPending ? '⏳ Pending' : isApproved ? '✓ Approved' : isRejected ? '✗ Rejected' : '↩ Returned'}
              </Badge>
              {isPending && daysPending > 0 && (
                <Badge variant="outline" className={getPriorityColor(daysPending)}>
                  <Clock className="w-3 h-3 mr-1" />
                  {daysPending} day{daysPending !== 1 ? 's' : ''} waiting
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{approval.business_unit}</span>
              <span className="flex items-center gap-1 font-medium text-gray-700">
                <DollarSign className="w-3 h-3" />{approval.currency} {approval.amount?.toLocaleString()}
              </span>
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 text-base mb-1">{approval.title}</h3>
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{approval.description}</p>

          <div className="flex flex-wrap gap-4 text-sm mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Requested by</p>
                <p className="font-medium">
                  {approval.requester_email ? formatName(approval.requester_email) : approval.approver_email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">{isPending ? 'Assigned' : 'Actioned'}</p>
                <p className="font-medium">{format(new Date(approval.created_at), 'PPP')}</p>
              </div>
            </div>
          </div>

          {isPending && (
            <div className="flex gap-2 pt-2 border-t">
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
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-500 font-medium">Decision Comments</p>
              </div>
              <p className="text-sm text-gray-700">{approval.comments}</p>
            </div>
          )}
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approvals Inbox</h1>
          <p className="text-gray-500 mt-1">Review and act on pending approval requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchApprovals}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingApprovals.length > 0 && (
              <Badge className="ml-2 bg-yellow-500 text-white text-xs">{pendingApprovals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actioned">
            Actioned
            {actionedApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-2">{actionedApprovals.length}</Badge>
            )}
          </TabsTrigger>
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
                  <h3 className="text-lg font-semibold mb-2">No actioned approvals yet</h3>
                  <p className="text-gray-500">Approvals you action will appear here.</p>
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
              {decisionAction === 'approved' ? '✓ Approve Request' :
               decisionAction === 'rejected' ? '✗ Reject Request' : '↩ Return for Correction'}
            </DialogTitle>
            <DialogDescription>{selectedRequest?.title} — {selectedRequest?.request_number}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg border text-sm">
              <p className="text-gray-500 mb-1">Request Summary</p>
              <p className="font-semibold">{selectedRequest?.currency} {selectedRequest?.amount?.toLocaleString()}</p>
              <p className="text-gray-500">{selectedRequest?.budget_type} · {selectedRequest?.business_unit}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Comments {decisionAction !== 'approved' && <span className="text-red-500">*</span>}
              </label>
              <Textarea
                rows={3}
                placeholder={
                  decisionAction === 'approved' ? 'Add any approval notes (optional)...' :
                  decisionAction === 'rejected' ? 'Please provide reason for rejection...' :
                  'Please provide feedback for correction...'
                }
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
              className={
                decisionAction === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                decisionAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                'bg-orange-600 hover:bg-orange-700'
              }
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm {decisionAction === 'approved' ? 'Approval' : decisionAction === 'rejected' ? 'Rejection' : 'Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
