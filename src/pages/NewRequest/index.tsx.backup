import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Loader2, AlertCircle, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Toaster } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

import { useNewRequestData } from './useNewRequestData'
import { useNewRequestForm } from './useNewRequestForm'
import { FinancialsSection } from './FinancialsSection'
import { AttachmentsSection } from './AttachmentsSection'
import { ApprovalChainSection } from './ApprovalChainSection'

export default function NewRequest() {
  const { user } = useAuth()

  // ── Data hook ──────────────────────────────────────────────────
  const {
    legalEntities,
    filteredLegalEntities,
    departments,
    businessUnits,
    doaRules,
    loading,
    filterEntitiesByBU,
  } = useNewRequestData()

  // ── Form hook ──────────────────────────────────────────────────
  const {
    currentStep, steps,
    submitting, showConfirmDialog, setShowConfirmDialog,
    error,
    files,
    capexLineItems, quotationValue, setQuotationValue,
    approvalComments, setApprovalComments,
    formData, setFormData,
    generatingProjectNumber,
    grandTotal, doaLevel, approvalChain,
    nextStep, prevStep, handleSubmit,
    handleFileUpload, removeFile,
    handleLineItemChange, calcLineItemTotal,
  } = useNewRequestForm({
    doaRules,
    businessUnits,
    legalEntities,
    departments,          // ← needed for dept head/chief lookup
    filterEntitiesByBU,
    userId: user?.id,
    userEmail: user?.email,
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  // ── Step renderer ──────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {

      // Step 0: Request Details
      case 0:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>Fill in the basic information for your funding request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="md:col-span-2">
                  <Label>Request Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Fibre Backbone Upgrade - KZN"
                  />
                </div>

                <div>
                  <Label>Department *</Label>
                  <Select value={formData.department_id} onValueChange={v => setFormData({ ...formData, department_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Business Unit *</Label>
                  <RadioGroup
                    value={formData.business_unit}
                    onValueChange={v => setFormData({ ...formData, business_unit: v })}
                    className="flex gap-4 mt-1"
                  >
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
                  <Select
                    value={formData.legal_entity_id}
                    onValueChange={v => setFormData({ ...formData, legal_entity_id: v })}
                    disabled={!formData.business_unit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.business_unit ? 'Select entity...' : 'Select business unit first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLegalEntities.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Currency</Label>
                  <Select value={formData.currency} onValueChange={v => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Amount ({formData.currency}) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.amount || ''}
                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label>Cost Centre</Label>
                  <Input value={formData.cost_centre} onChange={e => setFormData({ ...formData, cost_centre: e.target.value })} placeholder="CC-ENG-001" />
                </div>

                <div>
                  <Label>GL Code</Label>
                  <Input value={formData.gl_code} onChange={e => setFormData({ ...formData, gl_code: e.target.value })} placeholder="GL-4200" />
                </div>

                <div>
                  <Label>Vendor</Label>
                  <Input value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })} placeholder="e.g., Huawei Technologies" />
                </div>

                <div>
                  <Label>Classification</Label>
                  <RadioGroup
                    value={formData.budget_type}
                    onValueChange={v => setFormData({ ...formData, budget_type: v })}
                    className="flex gap-4 mt-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CAPEX" id="capex" /><Label htmlFor="capex">CAPEX</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="OPEX" id="opex" /><Label htmlFor="opex">OPEX</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label>Required By Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 w-4 h-4" />
                        {format(formData.required_by_date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={formData.required_by_date}
                        onSelect={date => date && setFormData({ ...formData, required_by_date: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Segment</Label>
                  <Input value={formData.segment} disabled className="bg-gray-100 text-gray-500" />
                </div>

                <div>
                  <Label>Project Number</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={formData.project_number}
                      disabled
                      className="bg-gray-100 font-mono text-gray-700"
                      placeholder="Auto-generated on entity selection"
                    />
                    {generatingProjectNumber && (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Format: {formData.business_unit || 'BU'}-{legalEntities.find(e => e.id === formData.legal_entity_id)?.code || 'ENTITY'}-{new Date().getFullYear()}-001
                  </p>
                </div>

              </div>

              <div>
                <Label>Description *</Label>
                <Textarea
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose and business justification..."
                />
              </div>

              {/* Live DoA preview — updates as amount changes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                <p className="text-sm text-blue-800">
                  DoA level: <strong>{doaLevel}</strong>
                </p>
                <p className="text-xs text-blue-600">
                  {approvalChain.filter(s => s.required).length} approver(s) required
                </p>
              </div>
            </CardContent>
          </Card>
        )

      // Step 1: Financials
      case 1:
        return (
          <FinancialsSection
            capexLineItems={capexLineItems}
            quotationValue={quotationValue}
            grandTotal={grandTotal}
            onLineItemChange={handleLineItemChange}
            onQuotationChange={setQuotationValue}
            calcLineItemTotal={calcLineItemTotal}
          />
        )

      // Step 2: Attachments
      case 2:
        return (
          <AttachmentsSection
            files={files}
            onFileUpload={handleFileUpload}
            onRemoveFile={removeFile}
          />
        )

      // Step 3: Approval Chain
      case 3:
        return (
          <ApprovalChainSection
            approvalChain={approvalChain}
            approvalComments={approvalComments}
            onCommentsChange={setApprovalComments}
            doaLevel={doaLevel}
          />
        )

      // Step 4: Review & Submit
      case 4:
        return (
          <ApprovalChainSection
            approvalChain={approvalChain}
            approvalComments={approvalComments}
            onCommentsChange={setApprovalComments}
            doaLevel={doaLevel}
            isReview
            formData={formData}
            departments={departments}
            files={files}
            grandTotal={grandTotal}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Funding Request</h1>
        <p className="text-gray-500 mt-1">SEACOM Capital & Operating Expenditure Approval Portal</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-1">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              index < currentStep     ? 'bg-blue-600 text-white'
              : index === currentStep ? 'bg-blue-600 text-white ring-4 ring-blue-100'
              : 'bg-gray-200 text-gray-500'
            )}>
              {index + 1}
            </div>
            <span className={cn(
              'text-sm hidden sm:inline mr-1',
              index <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-400'
            )}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <div className={cn('h-0.5 w-6 mx-1', index < currentStep ? 'bg-blue-600' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {renderStep()}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>Back</Button>
        <span className="text-sm text-gray-400">Step {currentStep + 1} of {steps.length}</span>
        {currentStep === steps.length - 1 ? (
          <Button onClick={() => setShowConfirmDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            Submit Request
          </Button>
        ) : (
          <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">Next</Button>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Submit <strong className="text-gray-900">"{formData.title}"</strong>?</p>
                <p>Amount: <strong>{formData.currency} {Number(formData.amount).toLocaleString()}</strong></p>
                <p>Project: <strong className="font-mono">{formData.project_number}</strong></p>
                <p>DoA: <strong>{doaLevel}</strong></p>
                <p>Approval path:<br />
                  <span className="text-blue-600">
                    {approvalChain.filter(s => s.required).map(s => s.role).join(' → ')}
                  </span>
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                : 'Confirm & Submit'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
