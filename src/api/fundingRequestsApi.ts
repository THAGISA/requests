import { supabase } from '@/lib/supabase'

export interface FundingRequest {
  id: string
  request_number: string
  requester_email: string
  title: string
  description: string
  department_id: string
  business_unit: string
  legal_entity_id: string
  currency: string
  amount: number
  budget_type: 'CAPEX' | 'OPEX'
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Returned'
  current_approver: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  required_by_date: string
  cost_centre: string
  gl_code: string
  vendor: string
  capex_category?: string
  capex_type?: string
  capex_segment?: string
  cxo_function?: string
  project_number?: string
  submitted_at: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export const fundingRequestsApi = {
  // Get all requests for a user
  async getUserRequests(email: string) {
    const { data, error } = await supabase
      .from('funding_requests')
      .select(`
        *,
        department:departments(name),
        legal_entity:legal_entities(name, code)
      `)
      .eq('requester_email', email)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get a single request by ID
  async getRequestById(id: string) {
    const { data, error } = await supabase
      .from('funding_requests')
      .select(`
        *,
        department:departments(*),
        legal_entity:legal_entities(*),
        approval_actions(*),
        attachments(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create a new request
  async createRequest(request: Partial<FundingRequest>) {
    const { data, error } = await supabase
      .from('funding_requests')
      .insert(request)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update a request
  async updateRequest(id: string, updates: Partial<FundingRequest>) {
    const { data, error } = await supabase
      .from('funding_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete a request (Draft only)
  async deleteRequest(id: string) {
    const { error } = await supabase
      .from('funding_requests')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  // Get approval actions for a request
  async getApprovalActions(requestId: string) {
    const { data, error } = await supabase
      .from('approval_actions')
      .select('*')
      .eq('request_id', requestId)
      .order('step_order', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Submit an approval decision
  async submitApproval(approvalId: string, action: 'approved' | 'rejected' | 'returned', comments?: string) {
    const { data, error } = await supabase
      .from('approval_actions')
      .update({
        action,
        comments,
        created_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}
