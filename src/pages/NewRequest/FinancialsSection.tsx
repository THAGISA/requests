import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, TrendingUp, Plus, Trash2 } from 'lucide-react'
import { useCurrencies } from '@/hooks/useCurrencies'
import { LineItem } from './useNewRequestForm'

interface FinancialsSectionProps {
  formData: any
  updateFormData: (field: string, value: any) => void
  updateLineItem: (id: string, year: string, value: number) => void
  calculateGrandTotal: () => number
  errors: any
}

export function FinancialsSection({ 
  formData, 
  updateFormData, 
  updateLineItem, 
  calculateGrandTotal,
  errors 
}: FinancialsSectionProps) {
  const { currencies, loading: currenciesLoading } = useCurrencies()
  const years = ['2026', '2027', '2028', '2029', '2030']

  const grandTotal = calculateGrandTotal()

  return (
    <div className="space-y-8">
      {/* Basic Financial Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="amount">Total CAPEX Amount *</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => updateFormData('amount', parseFloat(e.target.value))}
              placeholder="0.00"
              className="pl-10"
            />
          </div>
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>

        <div>
          <Label htmlFor="currency">Currency *</Label>
          {currenciesLoading ? (
            <div className="flex items-center gap-2 mt-1 p-2 border rounded-md bg-gray-50">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-500">Loading currencies...</span>
            </div>
          ) : (
            <Select
              value={formData.currency}
              onValueChange={(value) => updateFormData('currency', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.id} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{currency.code}</span>
                      <span className="text-gray-500">-</span>
                      <span>{currency.name}</span>
                      <span className="text-gray-400">({currency.symbol})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="budgetType">Budget Type *</Label>
        <Select
          value={formData.budgetType}
          onValueChange={(value) => updateFormData('budgetType', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select budget type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CAPEX">CAPEX (Capital Expenditure)</SelectItem>
            <SelectItem value="OPEX">OPEX (Operational Expenditure)</SelectItem>
          </SelectContent>
        </Select>
        {errors.budgetType && <p className="text-red-500 text-sm mt-1">{errors.budgetType}</p>}
      </div>

      {/* 5-Year Line Items Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">5-Year Breakdown by Line Item</h3>
          <p className="text-sm text-gray-500">Enter projected costs for each year</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-700">Line Item</th>
                {years.map(year => (
                  <th key={year} className="text-right p-3 font-medium text-gray-700 min-w-[100px]">
                    {year}
                  </th>
                ))}
                <th className="text-right p-3 font-medium text-gray-700 bg-blue-50">Total</th>
              </tr>
            </thead>
            <tbody>
              {formData.lineItems.map((item: any) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{item.name}</td>
                  {years.map(year => (
                    <td key={`${item.id}-${year}`} className="p-3">
                      <Input
                        type="number"
                        value={item[`year_${year}`]}
                        onChange={(e) => updateLineItem(item.id, `year_${year}`, parseFloat(e.target.value) || 0)}
                        className="text-right w-[100px]"
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="p-3 text-right font-semibold bg-blue-50">
                    ${item.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={6} className="p-3 text-right font-semibold">
                  Subtotal
                </td>
                <td className="p-3 text-right font-bold text-blue-600">
                  ${formData.lineItems.reduce((sum: number, item: any) => sum + item.total, 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Quotation Value */}
      <div>
        <Label htmlFor="quotationValue">Quotation Value (Additional)</Label>
        <div className="relative mt-1">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="quotationValue"
            type="number"
            value={formData.quotationValue}
            onChange={(e) => updateFormData('quotationValue', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="pl-10"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Add any vendor quotation amount not in the table above</p>
      </div>

      {/* Grand Total */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold text-blue-900">Grand Total</p>
            <p className="text-xs text-blue-700">Line items + quotation value</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">
              ${grandTotal.toLocaleString()}
            </p>
            <p className="text-xs text-blue-500">{formData.currency}</p>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="requiredByDate">Required By Date</Label>
        <Input
          id="requiredByDate"
          type="date"
          value={formData.requiredByDate}
          onChange={(e) => updateFormData('requiredByDate', e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">When is this CAPEX needed?</p>
      </div>

      {formData.amount > 50000 && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Additional Approval Required</p>
              <p className="text-xs text-yellow-700 mt-1">
                This request exceeds $50,000 and will require additional approval levels.
                {formData.amount > 200000 && ' Amounts over $200,000 require Chief Officer approval.'}
                {formData.amount > 500000 && ' Amounts over $500,000 require CFO approval.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Add missing import
import { Loader2 } from 'lucide-react'
