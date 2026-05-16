import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, AlertCircle, Loader2, Upload, FileText, X, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Toaster, toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const steps = ['Request Details', 'Financials', 'Attachments', 'Approval Chain', 'Review & Submit']

interface CapexLineItem {
  name: string
  years: { [key: string]: number }
}

export default function NewRequest() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [legalEntities, setLegalEntities] = useState<any[]>([])
  const [filteredLegalEntities, setFilteredLegalEntities] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [businessUnits, setBusinessUnits] = useState<any[]>([])
  const [doaRules, setDoaRules] = useState<any[]>([])
  const [files, setFiles] = useState<File[]>([])
  
  // CAPEX Financials
  const [capexLineItems, setCapexLineItems] = useState<CapexLineItem[]>([
    { name: 'Materials', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
    { name: 'Labour', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
    { name: 'Import Duties', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
    { name: 'Accommodation', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
    { name: 'Engineering', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
    { name: 'Risk Allowance', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
    { name: 'Planning', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
    { name: 'Project Management', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
    { name: 'Support', years: { '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0 } },
  ])
  const [quotationValue, setQuotationValue] = useState(0)
  const [approvalComments, setApprovalComments] = useState('')
  
  const [formData, setFormData] = useState({
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
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [deptRes, buRes, legalRes, doaRes] = await Promise.all([
          supabase.from('departments').select('*'),
          supabase.from('business_units').select('*'),
          supabase.from('legal_entities').select('*').order('name'),
          supabase.from('doa_rules').select('*').order('min_amount')
        ])
        
        if (deptRes.data) setDepartments(deptRes.data)
        if (buRes.data) {
          setBusinessUnits(buRes.data)
          setFormData(prev => ({ ...prev, business_unit: buRes.data[0]?.code || '', segment: buRes.data[0]?.name || '' }))
        }
        if (legalRes.data) setLegalEntities(legalRes.data)
        if (doaRes.data) setDoaRules(doaRes.data)
      } catch (err) {
        console.error('Error fetching data:', err)
        toast.error('Failed to load form data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (formData.business_unit && legalEntities.length > 0) {
      const filtered = legalEntities.filter(e => e.business_unit === formData.business_unit)
      setFilteredLegalEntities(filtered)
      setFormData(prev => ({ ...prev, legal_entity_id: '' }))
    }
  }, [formData.business_unit, legalEntities])

  useEffect(() => {
    if (formData.business_unit) {
      const selectedBU = businessUnits.find(bu => bu.code === formData.business_unit)
      if (selectedBU) {
        setFormData(prev => ({ ...prev, segment: selectedBU.name }))
      }
    }
  }, [formData.business_unit, businessUnits])

  const calculateLineItemTotal = (item: CapexLineItem) => {
    return Object.values(item.years).reduce((sum, val) => sum + val, 0)
  }

  const calculateGrandTotal = () => {
    const lineItemsTotal = capexLineItems.reduce((sum, item) => sum + calculateLineItemTotal(item), 0)
    return lineItemsTotal + quotationValue
  }

  const handleLineItemChange = (itemIndex: number, year: string, value: number) => {
    const newItems = [...capexLineItems]
    newItems[itemIndex].years[year] = value
    setCapexLineItems(newItems)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)])
      toast.success(`${e.target.files.length} file(s) added`)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const calculateDoALevel = () => {
    const amount = Number(formData.amount)
    const rule = doaRules.find(r =>
      amount >= Number(r.min_amount) && amount <= Number(r.max_amount) && r.currency === formData.currency
    )
    return rule?.approval_level || 'Manager Approval'
  }

  const handleSubmit = async () => {
    if (!user) {
      setError('Please sign in')
      toast.error('Please sign in to submit a request')
      return
    }
    
    setSubmitting(true)
    try {
      const year = new Date().getFullYear()
      const { count } = await supabase.from('funding_requests').select('*', { count: 'exact', head: true })
      const requestNumber = `FR-${year}-${String((count || 0) + 1).padStart(3, '0')}`
      const doaLevel = calculateDoALevel()
      
      const insertData = {
        request_number: requestNumber,
        requester_email: user.email,
        title: formData.title,
        description: formData.description,
        department_id: formData.department_id || null,
        business_unit: formData.business_unit,
        legal_entity_id: formData.legal_entity_id || null,
        currency: formData.currency,
        amount: formData.amount,
        budget_type: formData.budget_type,
        status: 'Pending',
        current_approver: doaLevel,
        segment: formData.segment,
        created_at: new Date().toISOString()
      }
      
      const { error: insertError } = await supabase
        .from('funding_requests')
        .insert(insertData)
      
      if (insertError) throw insertError
      
      toast.success(`Request ${requestNumber} submitted successfully!`)
      setTimeout(() => navigate('/my-requests'), 2000)
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message)
      toast.error('Submission failed: ' + err.message)
    } finally {
      setSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  const nextStep = () => {
    if (currentStep === 0) {
      if (!formData.title) { setError('Title required'); return }
      if (formData.amount <= 0) { setError('Amount required'); return }
      if (!formData.department_id) { setError('Department required'); return }
      if (!formData.business_unit) { setError('Business unit required'); return }
      if (!formData.legal_entity_id) { setError('Legal entity required'); return }
    }
    setError(null)
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    setError(null)
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const doaLevel = calculateDoALevel()
  const selectedBU = businessUnits.find(bu => bu.code === formData.business_unit)
  const grandTotal = calculateGrandTotal()
  const approvalChain = [
    { step: 1, name: 'Line Manager', required: true },
    { step: 2, name: 'Department Head', required: doaLevel.includes('Department Head') },
    { step: 3, name: 'Chief / Executive', required: doaLevel.includes('Chief') },
    { step: 4, name: 'Finance Review', required: doaLevel.includes('Finance') },
    { step: 5, name: 'CFO / CEO', required: doaLevel.includes('CFO') },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Toaster position="top-right" />
      
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Funding Request</h1>
        <p className="text-gray-500 mt-1">SEACOM Capital & Operating Expenditure Approval Portal</p>
      </div>

      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              index <= currentStep ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            )}>
              {index + 1}
            </div>
            <span className={cn("ml-2 text-sm hidden sm:inline", index <= currentStep ? "text-gray-900 font-medium" : "text-gray-400")}>
              {step}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Request Details */}
      {currentStep === 0 && (
        <Card>
          <CardHeader><CardTitle>Request Details</CardTitle><CardDescription>Fill in basic information</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Request Title *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g., Fibre Backbone Upgrade - KZN" />
              </div>
              
              <div>
                <Label>Department *</Label>
                <Select value={formData.department_id} onValueChange={(v) => setFormData({...formData, department_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Business Unit *</Label>
                <RadioGroup value={formData.business_unit} onValueChange={(v) => setFormData({...formData, business_unit: v})} className="flex gap-4">
                  {businessUnits.map(bu => (
                    <div key={bu.code} className="flex items-center space-x-2">
                      <RadioGroupItem value={bu.code} id={bu.code} />
                      <Label htmlFor={bu.code}>{bu.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              <div>
                <Label>Legal Entity *</Label>
                <Select value={formData.legal_entity_id} onValueChange={(v) => setFormData({...formData, legal_entity_id: v})} disabled={!formData.business_unit}>
                  <SelectTrigger><SelectValue placeholder="Select business unit first" /></SelectTrigger>
                  <SelectContent>
                    {filteredLegalEntities.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem><SelectItem value="ZAR">ZAR</SelectItem><SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Amount ({formData.currency}) *</Label>
                <Input type="number" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} />
              </div>
              
              <div><Label>Cost Centre</Label><Input value={formData.cost_centre} onChange={(e) => setFormData({...formData, cost_centre: e.target.value})} placeholder="CC-ENG-001" /></div>
              <div><Label>GL Code</Label><Input value={formData.gl_code} onChange={(e) => setFormData({...formData, gl_code: e.target.value})} placeholder="GL-4200" /></div>
              <div><Label>Vendor</Label><Input value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} placeholder="e.g., Huawei" /></div>
              
              <div>
                <Label>Classification</Label>
                <RadioGroup value={formData.budget_type} onValueChange={(v) => setFormData({...formData, budget_type: v})} className="flex gap-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="CAPEX" id="capex" /><Label htmlFor="capex">CAPEX</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="OPEX" id="opex" /><Label htmlFor="opex">OPEX</Label></div>
                </RadioGroup>
              </div>
              
              <div>
                <Label>Required By Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full"><CalendarIcon className="mr-2" />{format(formData.required_by_date, "PPP")}</Button>
                  </PopoverTrigger>
                  <PopoverContent><Calendar mode="single" selected={formData.required_by_date} onSelect={(date) => date && setFormData({...formData, required_by_date: date})} /></PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>Segment</Label>
                <Input value={formData.segment} disabled className="bg-gray-100" />
              </div>
            </div>
            
            <div><Label>Description *</Label><Textarea rows={4} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
            
            <div className="bg-blue-50 p-3 rounded"><p className="text-sm text-blue-800">DOA Level: <strong>{doaLevel}</strong></p></div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Financials */}
      {currentStep === 1 && (
        <Card>
          <CardHeader><CardTitle>CAPEX Expenditure Table (USD)</CardTitle><CardDescription>5-year breakdown</CardDescription></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-gray-50"><tr><th className="p-2 text-left">Line Item</th><th className="p-2 text-right">2026</th><th className="p-2 text-right">2027</th><th className="p-2 text-right">2028</th><th className="p-2 text-right">2029</th><th className="p-2 text-right">2030</th><th className="p-2 text-right">Total</th></tr></thead>
                <tbody>{capexLineItems.map((item, idx) => (<tr key={idx} className="border-t"><td className="p-2 font-medium">{item.name}</td>{['2026','2027','2028','2029','2030'].map(year => (<td key={year} className="p-2"><Input type="number" value={item.years[year]} onChange={(e) => handleLineItemChange(idx, year, parseFloat(e.target.value) || 0)} className="w-24 text-right" /></td>))}<td className="p-2 text-right font-medium">${calculateLineItemTotal(item).toLocaleString()}</td></tr>))}</tbody>
                <tfoot className="bg-gray-50 font-bold"><tr><td className="p-2">Total</td>{['2026','2027','2028','2029','2030'].map(year => (<td key={year} className="p-2 text-right">${capexLineItems.reduce((s, i) => s + i.years[year], 0).toLocaleString()}</td>))}<td className="p-2 text-right">${grandTotal.toLocaleString()}</td></tr></tfoot>
               </table>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4"><div><Label>Quotation Value</Label><Input type="number" value={quotationValue} onChange={(e) => setQuotationValue(parseFloat(e.target.value) || 0)} /></div><div className="bg-blue-50 p-3 rounded"><Label>Grand Total</Label><div className="text-2xl font-bold text-blue-600">${grandTotal.toLocaleString()}</div></div></div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Attachments */}
      {currentStep === 2 && (
        <Card>
          <CardHeader><CardTitle>Supporting Documents</CardTitle><CardDescription>Upload quotes, contracts, invoices</CardDescription></CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center"><Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" /><p className="mb-2">Drop files or click to upload</p><Input type="file" multiple className="hidden" id="file-upload" onChange={handleFileUpload} /><Button onClick={() => document.getElementById('file-upload')?.click()}>Select Files</Button></div>
            {files.length > 0 && (<div className="mt-4"><h4 className="font-semibold mb-2">Files ({files.length})</h4>{files.map((f, i) => (<div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded mb-1"><div className="flex items-center gap-2"><FileText className="w-4 h-4" /><span>{f.name}</span><span className="text-xs text-gray-500">{(f.size/1024).toFixed(0)} KB</span></div><Button variant="ghost" size="sm" onClick={() => removeFile(i)}><X className="w-4 h-4" /></Button></div>))}</div>)}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Approval Chain */}
      {currentStep === 3 && (
        <Card>
          <CardHeader><CardTitle>Approval Chain</CardTitle><CardDescription>Auto-configured based on DoA level</CardDescription></CardHeader>
          <CardContent>
            {approvalChain.map(step => (<div key={step.step} className="flex items-start gap-4 p-3 border rounded mb-3"><div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold">{step.step}</div><div className="flex-1"><h4 className="font-semibold">{step.name}</h4>{step.required ? <p className="text-sm text-green-600">✓ Required</p> : <p className="text-sm text-gray-500 italic">Not required at this level</p>}</div></div>))}
            <div className="mt-4"><Label>Comments for Approvers</Label><Textarea rows={3} value={approvalComments} onChange={(e) => setApprovalComments(e.target.value)} placeholder="Any notes for the approval authority..." /></div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review & Submit */}
      {currentStep === 4 && (
        <Card>
          <CardHeader><CardTitle>Review & Submit</CardTitle><CardDescription>Confirm all details</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
              <div><p className="text-sm text-gray-500">Title</p><p className="font-medium">{formData.title}</p><p className="text-sm text-gray-500 mt-2">Department</p><p className="font-medium">{departments.find(d => d.id === formData.department_id)?.name}</p><p className="text-sm text-gray-500 mt-2">Business Unit</p><p className="font-medium">{selectedBU?.name}</p></div>
              <div><p className="text-sm text-gray-500">Amount</p><p className="font-medium">{formData.currency} {formData.amount.toLocaleString()}</p><p className="text-sm text-gray-500 mt-2">DOA Level</p><p className="font-medium text-blue-600">{doaLevel}</p><p className="text-sm text-gray-500 mt-2">Required By</p><p className="font-medium">{format(formData.required_by_date, "PPP")}</p></div>
            </div>
            <div className="mt-4"><p className="text-sm text-gray-500">Description</p><p className="text-sm">{formData.description}</p></div>
            {files.length > 0 && (<div className="mt-4"><p className="text-sm text-gray-500">Attachments</p><p className="text-sm">{files.length} file(s) attached</p></div>)}
            <div className="mt-4 bg-blue-50 p-3 rounded"><p className="text-sm">Approval Chain: {approvalChain.filter(s => s.required).map(s => s.name).join(' → ')}</p></div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>Back</Button>
        <span className="text-sm text-gray-500 self-center">Step {currentStep + 1} of {steps.length}</span>
        {currentStep === steps.length - 1 ? (
          <Button onClick={() => setShowConfirmDialog(true)} className="bg-blue-600 hover:bg-blue-700">Submit Request</Button>
        ) : (
          <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">Next</Button>
        )}
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent><DialogHeader><DialogTitle>Confirm Submission</DialogTitle><DialogDescription>Submit "{formData.title}" for {formData.currency} {formData.amount.toLocaleString()}? This will route to {approvalChain.filter(s => s.required).map(s => s.name).join(' → ')}.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Confirm & Submit'}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  )
}
