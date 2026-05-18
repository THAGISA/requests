import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, Clock, XCircle, RotateCcw, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface ApprovalAction {
  id: string
  approver_email: string
  action: string
  comments: string
  created_at: string
}

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
  current_approver: string
  required_by_date: string
  vendor: string
  cost_centre: string
  gl_code: string
  submitted_at: string
  created_at: string
  requester_email: string
  department?: { name: string }
  legal_entity?: { name: string; code: string }
}

const formatName = (email: string) => {
  if (!email) return 'Unknown'
  const local = email.split('@')[0]
  return local
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const APPROVAL_LEVEL_LABELS: Record<number, string> = {
  1: 'Line Manager',
  2: 'Finance Manager',
  3: 'CFO',
  4: 'CEO',
}

export default function ViewRequest() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [request, setRequest] = useState<FundingRequest | null>(null)
  const [approvals, setApprovals] = useState<ApprovalAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchAll()
    }
  }, [id])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [{ data: reqData, error: reqError }, { data: appData, error: appError }] = await Promise.all([
        supabase
          .from('funding_requests')
          .select(`*, department:departments(name), legal_entity:legal_entities(name, code)`)
          .eq('id', id)
          .single(),
        supabase
          .from('approval_actions')
          .select('*')
          .eq('request_id', id)
          .order('created_at', { ascending: true })
      ])

      if (reqError) {
        console.error('Error fetching request:', reqError)
        toast.error('Failed to load request')
        return
      }

      setRequest(reqData)
      setApprovals(appData || [])
    } catch (err) {
      console.error('Error:', err)
      toast.error('Failed to load request')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'returned':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200"><RotateCcw className="w-3 h-3 mr-1" />Returned</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status || 'Draft'}</Badge>
    }
  }

  // Find where the request currently sits
  const currentlyPendingApproval = approvals.find(a => a.action === 'pending')
  const allActioned = approvals.length > 0 && approvals.every(a => a.action !== 'pending')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Request not found</h2>
        <p className="text-gray-500 mt-2">The request you're looking for doesn't exist or you don't have access.</p>
        <Button className="mt-4" onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Request #{request.request_number} • Submitted on {format(new Date(request.submitted_at || request.created_at), 'PPP')}
          </p>
        </div>
        {getStatusBadge(request.status)}
      </div>

      {/* Currently Sitting At Banner */}
      {request.status === 'Pending' && (
        <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
          currentlyPendingApproval ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <Clock className={`w-5 h-5 flex-shrink-0 ${currentlyPendingApproval ? 'text-yellow-600' : 'text-blue-600'}`} />
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Currently awaiting approval from:{' '}
              <span className="text-yellow-700">
                {currentlyPendingApproval
                  ? formatName(currentlyPendingApproval.approver_email)
                  : request.current_approver
                  ? formatName(request.current_approver)
                  : 'Line Manager'}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentlyPendingApproval
                ? `Sent to ${currentlyPendingApproval.approver_email} on ${format(new Date(currentlyPendingApproval.created_at), 'PPP')}`
                : 'Waiting for the next approver to take action'}
            </p>
          </div>
        </div>
      )}

      {request.status === 'Approved' && (
        <div className="rounded-lg border bg-green-50 border-green-200 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-green-800">This request has been fully approved.</p>
        </div>
      )}

      {request.status === 'Rejected' && (
        <div className="rounded-lg border bg-red-50 border-red-200 px-4 py-3 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-800">This request has been rejected.</p>
        </div>
      )}

      {request.status === 'Returned' && (
        <div className="rounded-lg border bg-orange-50 border-orange-200 px-4 py-3 flex items-center gap-3">
          <RotateCcw className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-orange-800">This request was returned for corrections.</p>
        </div>
      )}

      {/* Request Details */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Title</p>
              <p className="font-medium mt-0.5">{request.title}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Amount</p>
              <p className="font-medium mt-0.5">{request.currency} {request.amount?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Department</p>
              <p className="font-medium mt-0.5">{request.department?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Classification</p>
              <p className="font-medium mt-0.5">{request.budget_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Business Unit</p>
              <p className="font-medium mt-0.5">{request.business_unit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Legal Entity</p>
              <p className="font-medium mt-0.5">{request.legal_entity?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Vendor</p>
              <p className="font-medium mt-0.5">{request.vendor || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Cost Centre</p>
              <p className="font-medium mt-0.5">{request.cost_centre || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">GL Code</p>
              <p className="font-medium mt-0.5">{request.gl_code || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Required By</p>
              <p className="font-medium mt-0.5">
                {request.required_by_date ? format(new Date(request.required_by_date), 'PPP') : 'Not set'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Business Justification</p>
            <p className="mt-1 text-gray-700">{request.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Approval Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical line connecting steps */}
            <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-6">

              {/* Step 0: Requester */}
              <div className="flex items-start gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center z-10 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">1. Requester</p>
                    <Badge className="bg-green-100 text-green-700 text-xs">Submitted</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {request.requester_email ? formatName(request.requester_email) : 'You'} — {request.requester_email}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(request.submitted_at || request.created_at), 'PPP p')}
                  </p>
                </div>
              </div>

              {/* Approval steps from DB */}
              {approvals.length === 0 ? (
                // No approvals yet — show generic pending step
                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center z-10 flex-shrink-0 animate-pulse">
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">2. Line Manager</p>
                      <Badge className="bg-yellow-100 text-yellow-700 text-xs">⏳ Awaiting</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {request.current_approver
                        ? `${formatName(request.current_approver)} — ${request.current_approver}`
                        : 'Pending assignment'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">No action taken yet</p>
                  </div>
                </div>
              ) : (
                approvals.map((approval, idx) => {
                  const isPending = approval.action === 'pending'
                  const isApproved = approval.action === 'approved'
                  const isRejected = approval.action === 'rejected'
                  const isReturned = approval.action === 'returned'

                  const stepColor = isApproved
                    ? 'bg-green-100 border-green-400'
                    : isRejected
                    ? 'bg-red-100 border-red-400'
                    : isReturned
                    ? 'bg-orange-100 border-orange-400'
                    : 'bg-yellow-100 border-yellow-400'

                  const icon = isApproved
                    ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                    : isRejected
                    ? <XCircle className="w-4 h-4 text-red-600" />
                    : isReturned
                    ? <RotateCcw className="w-4 h-4 text-orange-600" />
                    : <Clock className={`w-4 h-4 text-yellow-600 ${isPending ? 'animate-pulse' : ''}`} />

                  const actionBadge = isApproved
                    ? <Badge className="bg-green-100 text-green-700 text-xs">✓ Approved</Badge>
                    : isRejected
                    ? <Badge className="bg-red-100 text-red-700 text-xs">✗ Rejected</Badge>
                    : isReturned
                    ? <Badge className="bg-orange-100 text-orange-700 text-xs">↩ Returned</Badge>
                    : <Badge className="bg-yellow-100 text-yellow-700 text-xs">⏳ Awaiting action</Badge>

                  return (
                    <div key={approval.id} className="flex items-start gap-4 relative">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 flex-shrink-0 ${stepColor}`}>
                        {icon}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">
                            {idx + 2}. {APPROVAL_LEVEL_LABELS[idx + 1] || 'Approver'}
                          </p>
                          {actionBadge}
                          {isPending && (
                            <span className="text-xs text-yellow-600 font-medium">← Currently here</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {formatName(approval.approver_email)} — {approval.approver_email}
                        </p>
                        {!isPending && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {format(new Date(approval.created_at), 'PPP p')}
                          </p>
                        )}
                        {isPending && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Assigned {format(new Date(approval.created_at), 'PPP')} — no action yet
                          </p>
                        )}
                        {approval.comments && (
                          <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg border text-sm text-gray-700">
                            <span className="text-xs text-gray-400 block mb-0.5">Comment</span>
                            {approval.comments}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Final approved state */}
              {request.status === 'Approved' && allActioned && (
                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center z-10 flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-700">Fully Approved</p>
                    <p className="text-sm text-gray-500">All approvals complete</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={() => navigate('/')}>Back to Dashboard</Button>
        <Button variant="outline" onClick={fetchAll}>
          <RotateCcw className="w-4 h-4 mr-2" /> Refresh Status
        </Button>
      </div>

    </div>
  )
}
