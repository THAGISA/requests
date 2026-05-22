import { useState } from 'react'

export interface LineItem {
  id: string
  name: string
  year_2026: number
  year_2027: number
  year_2028: number
  year_2029: number
  year_2030: number
  total: number
}

export interface FormData {
  title: string
  description: string
  amount: number
  currency: string
  budgetType: string
  businessUnit: string
  departmentId: string
  legalEntityId: string
  segment: string
  projectNumber: string
  lineManagerEmail: string
  requiredByDate: string
  quotationValue: number
  lineItems: LineItem[]
  attachments: File[]
  approvalChain: any[]
}

export interface FormErrors {
  title?: string
  description?: string
  amount?: string
  budgetType?: string
  businessUnit?: string
  departmentId?: string
  quotationValue?: string
}

const defaultLineItems: LineItem[] = [
  { id: 'materials', name: 'Materials', year_2026: 0, year_2027: 0, year_2028: 0, year_2029: 0, year_2030: 0, total: 0 },
  { id: 'labour', name: 'Labour', year_2026: 0, year_2027: 0, year_2028: 0, year_2029: 0, year_2030: 0, total: 0 },
  { id: 'import_duties', name: 'Import Duties', year_2026: 0, year_2027: 0, year_2028: 0, year_2029: 0, year_2030: 0, total: 0 },
  { id: 'accommodation', name: 'Accommodation', year_2026: 0, year_2027: 0, year_2028: 0, year_2029: 0, year_2030: 0, total: 0 },
  { id: 'engineering', name: 'Engineering', year_2026: 0, year_2027: 0, year_2028: 0, year_2029: 0, year_2030: 0, total: 0 },
  { id: 'risk_allowance', name: 'Risk Allowance', year_2026: 0, year_2027: 0, year_2028: 0, year_2029: 0, year_2030: 0, total: 0 },
  { id: 'planning', name: 'Planning', year_2026: 0, year_2027: 0, year_2028: 0, year_2029: 0, year_2030: 0, total: 0 },
  { id: 'project_management', name: 'Project Management', year_2026: 0, year_2027: 0, year_2028: 0, year_2029: 0, year_2030: 0, total: 0 },
  { id: 'support', name: 'Support', year_2026: 0, year_2027: 0, year_2028: 0, year_2029: 0, year_2030: 0, total: 0 }
]

export function useNewRequestForm() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    amount: 0,
    currency: 'USD',
    budgetType: 'CAPEX',
    businessUnit: '',
    departmentId: '',
    legalEntityId: '',
    segment: '',
    projectNumber: '',
    lineManagerEmail: '',
    requiredByDate: '',
    quotationValue: 0,
    lineItems: [...defaultLineItems],
    attachments: [],
    approvalChain: []
  })

  const [errors, setErrors] = useState<FormErrors>({})

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const updateLineItem = (id: string, year: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, [year]: value }
          updated.total = (updated.year_2026 + updated.year_2027 + updated.year_2028 + updated.year_2029 + updated.year_2030)
          return updated
        }
        return item
      })
    }))
  }

  const calculateGrandTotal = () => {
    const lineItemsTotal = formData.lineItems.reduce((sum, item) => sum + item.total, 0)
    return lineItemsTotal + (formData.quotationValue || 0)
  }

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {}
    
    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = 'Title is required'
      if (!formData.description.trim()) newErrors.description = 'Description is required'
      if (!formData.businessUnit) newErrors.businessUnit = 'Business unit is required'
      if (!formData.departmentId) newErrors.departmentId = 'Department is required'
    }
    
    if (step === 2) {
      if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount is required'
      if (!formData.budgetType) newErrors.budgetType = 'Budget type is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  return {
    formData,
    updateFormData,
    updateLineItem,
    calculateGrandTotal,
    errors,
    validateStep
  }
}
