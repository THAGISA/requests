import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { DoaRule, BusinessUnit, LegalEntity } from './useNewRequestData'

export interface CapexLineItem {
  name: string
  years: { [key: string]: number }
}

export interface FormData {
  title: string
  department_id: string
  business_unit: string
  legal_entity_id: string
  currency: string
  amount: number
  cost_centre: string
  gl_code: string
  vendor: string
  budget_type: string
  required_by_date: Date
  description: string
  segment: string
  project_number: string
}

export interface ApprovalStep {
  step: number
  role: string
  approver_email: string | null
  required: boolean
  doa_level: number
}

// ── DoA level parsing ─────────────────────────────────────────────
// Matches: "Level 1 - Manager Approval", "Level 2 - Department Head Approval" etc.
export const parseDoALevel = (approvalLevel: string): number => {
  const match = approvalLevel.match(/Level (\d+)/)
  return match ? parseInt(match[1]) : 1
}

// ── Department head/chief mapping ─────────────────────────────────
// These should ideally come from your `departments` table.
// Kept here as a fallback map matching your admin panel config.
export const DEPT_APPROVERS: Record<string, { head: string; chief: string }> = {
  'Data Science':      { head: 'head.ds@seacom.com',            chief: 'chief.ds@seacom.com' },
  'Engineering':       { head: 'head.engineering@seacom.com',   chief: 'chief.engineering@seacom.com' },
  'Finance':           { head: 'head.finance@seacom.com',       chief: 'chief.finance@seacom.com' },
  'Operations':        { head: 'head.operations@seacom.com',    chief: 'chief.operations@seacom.com' },
  'Sales':             { head: 'head.sales@seacom.com',         chief: 'chief.sales@seacom.com' },
  'Marketing':         { head: 'head.marketing@seacom.com',     chief: 'chief.marketing@seacom.com' },
  'Human Resources':   { head: 'head.hr@seacom.com',            chief: 'chief.hr@seacom.com' },
  'Legal':             { head: 'head.legal@seacom.com',         chief: 'chief.legal@seacom.com' },
  'Procurement':       { head: 'head.procurement@seacom.com',   chief: 'chief.procurement@seacom.com' },
  'DevOps':            { head: 'watson.kamanga@seacom.com',     chief: 'tiaan.taljaard@seacom.com' },
}

const DEFAULT_CAPEX_LINES: CapexLineItem[] = [
  { name: 'Materials',          years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Labour',             years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Import Duties',      years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Accommodation',      years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Engineering',        years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Risk Allowance',     years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Planning',           years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Project Management', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  { name: 'Support',            years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
]

const STEPS = ['Request Details', 'Financials', 'Attachments', 'Approval Chain', 'Review & Submit']

interface UseNewRequestFormProps {
  doaRules: DoaRule[]
  businessUnits: BusinessUnit[]
  legalEntities: LegalEntity[]
  departments: { id: string; name: string }[]
  filterEntitiesByBU: (buCode: string) => void
  userId: string | undefined
  userEmail: string | undefined
}

export function useNewRequestForm({
  doaRules,
  businessUnits,
  legalEntities,
  departments,
  filterEntitiesByBU,
  userId,
  userEmail,
}: UseNewRequestFormProps) {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [capexLineItems, setCapexLineItems] = useState<CapexLineItem[]>(DEFAULT_CAPEX_LINES)
  const [quotationValue, setQuotationValue] = useState(0)
  const [approvalComments, setApprovalComments] = useState('')
  const [generatingProjectNumber, setGeneratingProjectNumber] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    title: '',
    department_id: '',
    business_unit: '',
    legal_entity_id: '',
    currency: 'USD',
    amount: 0,
    cost_centre: '',
    gl_code: '',
    vendor: '',
    budget_type: 'CAPEX',
    required_by_date: new Date(),
    description: '',
    segment: '',
    project_number: '',
  })

  // Sync filtered legal entities when BU changes
  useEffect(() => {
    if (formData.business_unit) {
      filterEntitiesByBU(formData.business_unit)
      setFormData(prev => ({ ...prev, legal_entity_id: '', project_number: '' }))
    }
  }, [formData.business_unit])

  // Sync segment name when BU changes
  useEffect(() => {
    if (formData.business_unit && businessUnits.length > 0) {
      const selectedBU = businessUnits.find(bu => bu.code === formData.business_unit)
      if (selectedBU) setFormData(prev => ({ ...prev, segment: selectedBU.name }))
    }
  }, [formData.business_unit, businessUnits])

  // Auto-generate project number when BU + legal entity are both selected
  useEffect(() => {
    const generateProjectNumber = async () => {
      if (!formData.business_unit || !formData.legal_entity_id || legalEntities.length === 0) return

      setGeneratingProjectNumber(true)
      try {
        const selectedEntity = legalEntities.find(e => e.id === formData.legal_entity_id)
        if (!selectedEntity) return

        const year = new Date().getFullYear()
        const prefix = `${formData.business_unit}-${selectedEntity.code}-${year}-`

        const { data: lastRequest } = await supabase
          .from('funding_requests')
          .select('project_number')
          .ilike('project_number', `${prefix}%`)
          .order('created_at', { ascending: false })
          .limit(1)

        let sequence = 1
        if (lastRequest && lastRequest.length > 0 && lastRequest[0].project_number) {
          const parts = lastRequest[0].project_number.split('-')
          const lastSeq = parseInt(parts[parts.length - 1])
          if (!isNaN(lastSeq)) sequence = lastSeq + 1
        }

        const projectNumber = `${prefix}${String(sequence).padStart(3, '0')}`
        setFormData(prev => ({ ...prev, project_number: projectNumber }))
      } catch (err) {
        console.error('Error generating project number:', err)
      } finally {
        setGeneratingProjectNumber(false)
      }
    }

    generateProjectNumber()
  }, [formData.business_unit, formData.legal_entity_id, legalEntities])

  // ── Calculations ──────────────────────────────────────────────
  const calcLineItemTotal = (item: CapexLineItem) =>
    Object.values(item.years).reduce((sum, v) => sum + v, 0)

  const calcGrandTotal = () =>
    capexLineItems.reduce((sum, item) => sum + calcLineItemTotal(item), 0) + quotationValue

  // ── DoA resolution ────────────────────────────────────────────
  // Finds the matching DoA rule and returns its approval_level string
  const calcDoARule = (): DoaRule | null => {
    const amount = Number(formData.amount)
    return doaRules.find(
      r =>
        amount >= Number(r.min_amount) &&
        amount <= Number(r.max_amount) &&
        r.currency === formData.currency
    ) || null
  }

  const calcDoALevel = (): string => {
    const rule = calcDoARule()
    return rule?.approval_level || 'Level 1 - Manager Approval'
  }

  // ── Approval chain builder ────────────────────────────────────
  // Builds the chain strictly from the DoA level number.
  // Level 1 → Line Manager only
  // Level 2 → + Department Head
  // Level 3 → + Chief / Executive
  // Level 4 → + Finance Review + CFO / CEO
  const buildApprovalChain = (): ApprovalStep[] => {
    const doaLevel = parseDoALevel(calcDoALevel())

    // Resolve department name for approver lookup
    const dept = departments.find(d => d.id === formData.department_id)
    const deptName = dept?.name || ''
    const approvers = DEPT_APPROVERS[deptName] || null

    return [
      {
        step: 1,
        role: 'Line Manager',
        approver_email: userEmail || null,   // requester's manager — resolved at runtime
        required: true,
        doa_level: 1,
      },
      {
        step: 2,
        role: 'Department Head',
        approver_email: approvers?.head || null,
        required: doaLevel >= 2,
        doa_level: 2,
      },
      {
        step: 3,
        role: 'Chief / Executive',
        approver_email: approvers?.chief || null,
        required: doaLevel >= 3,
        doa_level: 3,
      },
      {
        step: 4,
        role: 'Finance Review',
        approver_email: 'head.finance@seacom.com',
        required: doaLevel >= 4,
        doa_level: 4,
      },
      {
        step: 5,
        role: 'CFO / CEO',
        approver_email: 'chief.finance@seacom.com',
        required: doaLevel >= 4,
        doa_level: 4,
      },
    ]
  }

  // ── Line item editing ─────────────────────────────────────────
  const handleLineItemChange = (itemIndex: number, year: string, value: number) => {
    const updated = [...capexLineItems]
    updated[itemIndex].years[year] = value
    setCapexLineItems(updated)
  }

  // ── File handling ─────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)])
      toast.success(`${e.target.files.length} file(s) added`)
    }
  }

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index))

  // ── Step navigation ───────────────────────────────────────────
  const nextStep = () => {
    if (currentStep === 0) {
      if (!formData.title)           { setError('Title is required'); return }
      if (formData.amount <= 0)      { setError('Amount is required'); return }
      if (!formData.department_id)   { setError('Department is required'); return }
      if (!formData.business_unit)   { setError('Business unit is required'); return }
      if (!formData.legal_entity_id) { setError('Legal entity is required'); return }
    }
    setError(null)
    if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1)
  }

  const prevStep = () => {
    setError(null)
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!userId) {
      setError('Please sign in')
      toast.error('Please sign in to submit a request')
      return
    }

    setSubmitting(true)
    try {
      const year = new Date().getFullYear()
      const { count } = await supabase
        .from('funding_requests')
        .select('*', { count: 'exact', head: true })

      const requestNumber = `FR-${year}-${String((count || 0) + 1).padStart(3, '0')}`
      const doaLevel = calcDoALevel()
      const chain = buildApprovalChain()
      const firstApprover = chain.find(s => s.required)

      const { error: insertError } = await supabase.from('funding_requests').insert({
        request_number: requestNumber,
        requester_email: userEmail,
        title: formData.title,
        description: formData.description,
        department_id: formData.department_id || null,
        business_unit: formData.business_unit,
        legal_entity_id: formData.legal_entity_id || null,
        currency: formData.currency,
        amount: formData.amount,
        budget_type: formData.budget_type,
        status: 'Pending',
        doa_level: doaLevel,
        current_approver: firstApprover?.approver_email || firstApprover?.role || 'Line Manager',
        approval_chain: chain,                  // store full chain as JSON
        segment: formData.segment,
        project_number: formData.project_number,
        approval_comments: approvalComments,
        created_at: new Date().toISOString(),
      })

      if (insertError) throw insertError

      toast.success(`Request ${requestNumber} submitted successfully!`)
      setTimeout(() => navigate('/my-requests'), 2000)
    } catch (err: unknown) {
      const e = err as Error
      console.error('Submit error:', e)
      setError(e.message)
      toast.error('Submission failed: ' + e.message)
    } finally {
      setSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  return {
    // State
    currentStep,
    submitting,
    showConfirmDialog,
    setShowConfirmDialog,
    error,
    files,
    capexLineItems,
    quotationValue,
    setQuotationValue,
    approvalComments,
    setApprovalComments,
    formData,
    setFormData,
    generatingProjectNumber,
    // Computed
    steps: STEPS,
    grandTotal: calcGrandTotal(),
    doaLevel: calcDoALevel(),
    approvalChain: buildApprovalChain(),
    // Handlers
    nextStep,
    prevStep,
    handleSubmit,
    handleFileUpload,
    removeFile,
    handleLineItemChange,
    calcLineItemTotal,
  }
}
