import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2, ArrowLeft, Send, FileText, Building2,
  DollarSign, CheckCircle2, TrendingUp,
  Paperclip, GitBranch, Eye, Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion'

// Line items component
const defaultLineItems = [
  { id: 'materials', name: 'Materials', years: { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 }, total: 0 },
  { id: 'labour', name: 'Labour', years: { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 }, total: 0 },
  { id: 'import_duties', name: 'Import Duties', years: { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 }, total: 0 },
  { id: 'accommodation', name: 'Accommodation', years: { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 }, total: 0 },
  { id: 'engineering', name: 'Engineering', years: { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 }, total: 0 },
  { id: 'risk_allowance', name: 'Risk Allowance', years: { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 }, total: 0 },
  { id: 'planning', name: 'Planning', years: { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 }, total: 0 },
  { id: 'project_management', name: 'Project Management', years: { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 }, total: 0 },
  { id: 'support', name: 'Support', years: { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 }, total: 0 }
]

export default function NewRequest() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getExchangeRate, formatUSD } = useCurrencyConversion()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null)
  const [businessUnit, setBusinessUnit] = useState('')
  const [legalEntityId, setLegalEntityId] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [amount, setAmount] = useState(0)
  const [budgetType, setBudgetType] = useState('CAPEX')
  const [requiredByDate, setRequiredByDate] = useState('')
  const [segment, setSegment] = useState('')
  const [projectNumber, setProjectNumber] = useState('')
  
  // Line items state
  const [lineItems, setLineItems] = useState(defaultLineItems)
  const [quotationValue, setQuotationValue] = useState(0)
  
  // Attachments state
  const [attachments, setAttachments] = useState<File[]>([])
  
  // Comments state
  const [approverComments, setApproverComments] = useState('')
  
  // Data from API
  const [departments, setDepartments] = useState<any[]>([])
  const [legalEntities, setLegalEntities] = useState<any[]>([])
  const [currencies, setCurrencies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, legalRes, currencyRes] = await Promise.all([
          supabase.from('departments').select('*').order('name'),
          supabase.from('legal_entities').select('*').order('name'),
          supabase.from('currencies').select('*').order('code')
        ])
        
        setDepartments(deptRes.data || [])
        setLegalEntities(legalRes.data || [])
        setCurrencies(currencyRes.data || [])
        
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load form data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Update selected department when departmentId changes
  useEffect(() => {
    const dept = departments.find(d => d.id === departmentId)
    setSelectedDepartment(dept)
  }, [departmentId, departments])

  // Generate project number
  const generateProjectNumber = () => {
    const bu = businessUnit || 'DS'
    const entity = legalEntities.find(e => e.id === legalEntityId)?.code || 'SEA'
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${bu}-${entity}_${year}-${random}`
  }

  // Update project number when dependencies change
  useEffect(() => {
    if (businessUnit && legalEntityId && !loading) {
      setProjectNumber(generateProjectNumber())
    }
  }, [businessUnit, legalEntityId, loading])

  // Calculate line items total
  const calculateLineItemsTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0)
  }

  // Calculate grand total
  const calculateGrandTotal = () => {
    return amount + calculateLineItemsTotal() + (quotationValue || 0)
  }

  // Update line item totals
  const updateLineItem = (id: string, year: string, value: number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedYears = { ...item.years, [year]: value }
        const total = Object.values(updatedYears).reduce((sum, val) => sum + val, 0)
        return { ...item, years: updatedYears, total }
      }
      return item
    }))
  }

  // Get DOA level based on the entered amount
  const getDoALevel = () => {
    const totalAmount = amount
    if (totalAmount <= 50000) return { level: 'Level 1 - Manager Approval', approvers: 1 }
    if (totalAmount <= 200000) return { level: 'Level 2 - Department Head Approval', approvers: 2 }
    if (totalAmount <= 500000) return { level: 'Level 3 - Chief Officer Approval', approvers: 3 }
    if (totalAmount <= 1000000) return { level: 'Level 4 - Board/CFO Approval', approvers: 4 }
    return { level: 'Level 5 - Executive Board Approval', approvers: 5 }
  }

  // Get approval chain based on amount and selected department
  const getApprovalChain = () => {
    const totalAmount = amount
    const chain = []
    const addedEmails = new Set()
    
    if (selectedDepartment?.head_email && !addedEmails.has(selectedDepartment.head_email)) {
      chain.push({ step: chain.length + 1, role: 'Department Head', required: true, email: selectedDepartment.head_email })
      addedEmails.add(selectedDepartment.head_email)
    }
    
    if (totalAmount > 50000 && selectedDepartment?.chief_email && !addedEmails.has(selectedDepartment.chief_email)) {
      chain.push({ step: chain.length + 1, role: 'Chief / Executive', required: true, email: selectedDepartment.chief_email })
      addedEmails.add(selectedDepartment.chief_email)
    }
    
    if (totalAmount > 200000 && !addedEmails.has('head.finance@seacom.com')) {
      chain.push({ step: chain.length + 1, role: 'Finance Review', required: true, email: 'head.finance@seacom.com' })
      addedEmails.add('head.finance@seacom.com')
    }
    
    if (totalAmount > 500000 && !addedEmails.has('cfo@seacom.com')) {
      chain.push({ step: chain.length + 1, role: 'CFO / CEO', required: true, email: 'cfo@seacom.com' })
      addedEmails.add('cfo@seacom.com')
    }
    
    if (totalAmount > 1000000 && !addedEmails.has('board@seacom.com')) {
      chain.push({ step: chain.length + 1, role: 'Board Approval', required: true, email: 'board@seacom.com' })
      addedEmails.add('board@seacom.com')
    }
    
    return chain
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!title.trim()) {
        toast.error('Please enter a request title')
        return
      }
      if (!departmentId) {
        toast.error('Please select a department')
        return
      }
      if (!businessUnit) {
        toast.error('Please select a business unit')
        return
      }
      if (!legalEntityId) {
        toast.error('Please select a legal entity')
        return
      }
      if (!amount || amount <= 0) {
        toast.error('Please enter a valid amount')
        return
      }
      if (!description.trim()) {
        toast.error('Please enter a description')
        return
      }
    }
    
    setCurrentStep(currentStep + 1)
    window.scrollTo(0, 0)
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
    window.scrollTo(0, 0)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const doaInfo = getDoALevel()
      const approvalChain = getApprovalChain()
      const finalProjectNumber = projectNumber || generateProjectNumber()
      const grandTotal = calculateGrandTotal()
      const exchangeRate = getExchangeRate(currency)
      const amountUSD = amount * exchangeRate
      const timestamp = new Date()
      const year = timestamp.getFullYear()
      const month = String(timestamp.getMonth() + 1).padStart(2, '0')
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const requestNumber = `CAPEX-${year}${month}-${random}`

      const { data: request, error: requestError } = await supabase
        .from('funding_requests')
        .insert({
          request_number: requestNumber,
          title,
          description,
          amount,
          amount_usd: amountUSD,
          currency,
          budget_type: budgetType,
          business_unit: businessUnit,
          department_id: departmentId || null,
          legal_entity_id: legalEntityId || null,
          requester_email: user?.email,
          status: 'Pending',
          segment: segment || null,
          project_number: finalProjectNumber,
          doa_level: doaInfo.level,
          approval_chain: approvalChain,
          current_approver: approvalChain[0]?.email || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (requestError) throw requestError

      if (approvalChain.length > 0) {
        const { data: existingActions } = await supabase
          .from('approval_actions')
          .select('approver_email')
          .eq('request_id', request.id)

        const existingEmails = new Set(existingActions?.map(a => a.approver_email) || [])
        
        const newApprovalActions = approvalChain
          .filter(approver => !existingEmails.has(approver.email))
          .map((approver) => ({
            request_id: request.id,
            approver_email: approver.email,
            action: null,
            comments: approverComments || null,
            created_at: new Date().toISOString()
          }))

        if (newApprovalActions.length > 0) {
          const { error: actionsError } = await supabase
            .from('approval_actions')
            .insert(newApprovalActions)

          if (actionsError) {
            console.error('approval_actions insert error:', actionsError)
            toast.warning(`Request created but some approval routing failed: ${actionsError.message}`)
          }
        }
      }

      toast.success(`Request ${requestNumber} submitted successfully!`)
      setShowConfirmDialog(false)
      setTimeout(() => navigate('/my-requests'), 1500)

    } catch (error: any) {
      console.error('Submit error:', error)
      toast.error(error.message || 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepProgress = () => {
    return ((currentStep - 1) / (5 - 1)) * 100
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const doaInfo = getDoALevel()
  const approvalChain = getApprovalChain()
  const lineItemsTotal = calculateLineItemsTotal()
  const grandTotal = calculateGrandTotal()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              New CAPEX Request
            </h1>
            <p className="text-gray-500 mt-1">SEACOM Capital & Operating Expenditure Approval Portal</p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between mb-4">
              {[1, 2, 3, 4, 5].map((step) => {
                const icons = [FileText, DollarSign, Paperclip, GitBranch, Eye]
                const Icon = icons[step - 1]
                const isActive = currentStep === step
                const isCompleted = currentStep > step
                
                return (
                  <div key={step} className="flex-1 text-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2
                      ${isActive ? 'bg-blue-600 text-white' : 
                        isCompleted ? 'bg-green-600 text-white' : 
                        'bg-gray-200 text-gray-500'}
                    `}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                      {step === 1 && 'Request Details'}
                      {step === 2 && 'Financials'}
                      {step === 3 && 'Attachments'}
                      {step === 4 && 'Approval Chain'}
                      {step === 5 && 'Review & Submit'}
                    </p>
                  </div>
                )
              })}
            </div>
            <Progress value={getStepProgress()} className="h-2" />
            <p className="text-center text-sm text-gray-500 mt-4">
              Step {currentStep} of 5
            </p>
          </CardContent>
        </Card>

        {/* Form Content */}
        <Card>
          <CardContent className="p-6">
            {/* Step 1: Request Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label>Request Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Lead to Cash"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Department *</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedDepartment && (
                      <p className="text-xs text-green-600 mt-1">
                        Department Head: {selectedDepartment.head_email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Business Unit *</Label>
                    <RadioGroup 
                      value={businessUnit} 
                      onValueChange={setBusinessUnit}
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="DI" id="di" />
                        <Label htmlFor="di" className="cursor-pointer">Digital Infrastructure</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="DS" id="ds" />
                        <Label htmlFor="ds" className="cursor-pointer">Digital Services</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div>
                  <Label>Legal Entity *</Label>
                  <Select value={legalEntityId} onValueChange={setLegalEntityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select legal entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {legalEntities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name} ({entity.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.id} value={c.code}>
                            {c.code} - {c.name} ({c.symbol}) - Rate: {c.rate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    {currency !== 'USD' && amount > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        ≈ {formatUSD(amount * getExchangeRate(currency))}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Classification</Label>
                    <RadioGroup 
                      value={budgetType} 
                      onValueChange={setBudgetType}
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CAPEX" id="capex" />
                        <Label htmlFor="capex" className="cursor-pointer">CAPEX</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="OPEX" id="opex" />
                        <Label htmlFor="opex" className="cursor-pointer">OPEX</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label>Required By Date</Label>
                    <Input
                      type="date"
                      value={requiredByDate}
                      onChange={(e) => setRequiredByDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Segment</Label>
                  <Input
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Digital Services"
                  />
                </div>

                <div>
                  <Label>Project Number</Label>
                  <Input
                    value={projectNumber}
                    readOnly
                    className="bg-gray-50 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: BU-Entity_YYYY-XXX • Auto-generated from your selections
                  </p>
                </div>

                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the purpose and business justification..."
                    rows={4}
                  />
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">DoA Level: {doaInfo.level}</p>
                      <p className="text-xs text-blue-700 mt-1">
                        {doaInfo.approvers} approver(s) required based on requested amount
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Financials - Line Items Table */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h3 className="font-semibold text-gray-900">CAPEX Expenditure Table</h3>
                    <p className="text-sm text-gray-500">5-year breakdown by line item (2026, 2027, 2028, 2029, 2030)</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-medium text-gray-700">Line Item</th>
                          <th className="text-right p-3 font-medium text-gray-700">2026</th>
                          <th className="text-right p-3 font-medium text-gray-700">2027</th>
                          <th className="text-right p-3 font-medium text-gray-700">2028</th>
                          <th className="text-right p-3 font-medium text-gray-700">2029</th>
                          <th className="text-right p-3 font-medium text-gray-700">2030</th>
                          <th className="text-right p-3 font-medium text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item) => (
                          <tr key={item.id} className="border-t hover:bg-gray-50">
                            <td className="p-3 font-medium">{item.name}</td>
                            {[2026, 2027, 2028, 2029, 2030].map(year => (
                              <td key={`${item.id}-${year}`} className="p-3">
                                <Input
                                  type="number"
                                  value={item.years[year as keyof typeof item.years]}
                                  onChange={(e) => updateLineItem(item.id, year.toString(), parseFloat(e.target.value) || 0)}
                                  className="text-right w-[100px]"
                                  placeholder="0"
                                />
                              </td>
                            ))}
                            <td className="p-3 text-right font-semibold text-blue-600">
                              ${item.total.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t">
                        <tr>
                          <td colSpan={6} className="p-3 text-right font-semibold">Line Items Subtotal</td>
                          <td className="p-3 text-right font-bold text-blue-600">
                            ${lineItemsTotal.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div>
                  <Label>Quotation Value (additional)</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="number"
                      value={quotationValue}
                      onChange={(e) => setQuotationValue(parseFloat(e.target.value) || 0)}
                      className="pl-10"
                      placeholder="Add any vendor quotation amount not in the table above"
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Requested Amount</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${amount.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Line Items Total</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${lineItemsTotal.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Quotation Value</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${quotationValue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-blue-900">CAPEX Grand Total</p>
                          <p className="text-xs text-blue-700">Requested amount + line items + quotation</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            ${grandTotal.toLocaleString()}
                          </p>
                          <p className="text-xs text-blue-500">{currency}</p>
                          {currency !== 'USD' && (
                            <p className="text-xs text-green-600">
                              ≈ {formatUSD(grandTotal * getExchangeRate(currency))}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Attachments */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Drop files here or click to browse</p>
                  <p className="text-sm text-gray-400 mt-1">
                    PDF, DOCX, XLSX, PNG, JPG — max 25MB each
                  </p>
                  <Button variant="outline" className="mt-4">
                    Select Files
                  </Button>
                </div>

                {attachments.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No files attached yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Approval Chain */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900">DoA Level: {doaInfo.level}</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {approvalChain.length} approver(s) required — Routing based on requested amount
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Approval Chain</h3>
                  {approvalChain.map((approver) => (
                    <div key={approver.step} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{approver.step}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{approver.role}</p>
                        <p className="text-sm text-gray-500">{approver.email}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Required</Badge>
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Approval path</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      {approvalChain.map(a => a.role).join(' → ')}
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Comments for approvers</Label>
                  <Textarea
                    value={approverComments}
                    onChange={(e) => setApproverComments(e.target.value)}
                    placeholder="Any notes or context for the approval authority..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Review & Confirm</p>
                      <p className="text-xs text-green-700 mt-1">
                        Verify all details before submitting
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Title</p>
                    <p className="font-medium">{title || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Department</p>
                    <p>{departments.find(d => d.id === departmentId)?.name || 'Not selected'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Business Unit</p>
                    <p>{businessUnit}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Classification</p>
                    <Badge variant="outline">{budgetType}</Badge>
                  </div>
                  <div>
                    <p className="text-gray-500">Project Number</p>
                    <p className="font-mono text-sm">{projectNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Requested Amount</p>
                    <p className="font-semibold">${amount.toLocaleString()} {currency}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">CAPEX Grand Total</p>
                    <p className="font-bold text-green-600">
                      ${grandTotal.toLocaleString()}
                    </p>
                    {currency !== 'USD' && (
                      <p className="text-xs text-gray-500">
                        ≈ {formatUSD(grandTotal * getExchangeRate(currency))}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500">DoA Level</p>
                    <p>{doaInfo.level}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Required By</p>
                    <p>{requiredByDate || 'Not set'}</p>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    By submitting this request, you confirm that all information is accurate and complete.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-4 border-t">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
                Back
              </Button>
              
              {currentStep < 5 ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Button onClick={() => setShowConfirmDialog(true)} className="bg-green-600 hover:bg-green-700">
                  Submit Request
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Submit "{title}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Requested Amount:</span>
              <span className="font-semibold">${amount.toLocaleString()} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Grand Total:</span>
              <span className="font-semibold text-green-600">${grandTotal.toLocaleString()}</span>
            </div>
            {currency !== 'USD' && (
              <div className="flex justify-between">
                <span className="text-gray-600">USD Equivalent:</span>
                <span className="font-semibold text-blue-600">{formatUSD(grandTotal * getExchangeRate(currency))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Project:</span>
              <span className="font-mono text-sm">{projectNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">DoA:</span>
              <span>{doaInfo.level}</span>
            </div>
            <div className="pt-2">
              <p className="text-gray-600 text-sm">Approval path:</p>
              <p className="text-sm font-medium text-gray-900">
                {approvalChain.map(a => a.role).join(' → ')}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
